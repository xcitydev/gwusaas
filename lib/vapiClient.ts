/**
 * Vapi (api.vapi.ai) outbound calling helper.
 *
 * We hit the REST API directly instead of pulling in a server SDK so we
 * stay aligned with the rest of the route handlers (plain `fetch`).
 *
 * Required env:
 *   VAPI_API_KEY            — server-side key from the Vapi dashboard
 *   VAPI_PHONE_NUMBER_ID    — id of a phone number provisioned in Vapi
 *   VAPI_WEBHOOK_SECRET     — shared secret for verifying incoming events
 *
 * Optional:
 *   VAPI_BASE_URL           — defaults to https://api.vapi.ai
 *   VAPI_LLM_MODEL          — defaults to "gpt-4o-mini"
 *   VAPI_LLM_PROVIDER       — defaults to "openai"
 */

import type { CampaignLead } from "@/types/voiceCaller";

const DEFAULT_BASE_URL = "https://api.vapi.ai";

export type VapiCallType = "live" | "voicemail";

export type VapiAssistantOptions = {
  /** ElevenLabs voice_id from the user's clone. */
  voiceId: string;
  /** Full system prompt / script. */
  scriptText: string;
  /** Lead first name used for personalization in the opener. */
  leadFirstName: string;
  /** "live" = full conversation. "voicemail" = leave the script + hang up. */
  callType: VapiCallType;
};

export type VapiCallRequest = {
  lead: CampaignLead;
  assistant: VapiAssistantOptions;
  /** Echoed back on every webhook event so we can route to the right campaign. */
  metadata: {
    campaignId: string;
    clientId: string;
  };
};

export type VapiCallResponse = {
  id: string;
  status?: string;
  phoneCallProviderId?: string;
};

export type VapiConfig = {
  apiKey: string;
  phoneNumberId: string;
  baseUrl: string;
  llmModel: string;
  llmProvider: string;
};

export class VapiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VapiConfigError";
  }
}

export function loadVapiConfig(): VapiConfig {
  const apiKey = process.env.VAPI_API_KEY;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
  if (!apiKey) throw new VapiConfigError("VAPI_API_KEY is not configured");
  if (!phoneNumberId) {
    throw new VapiConfigError("VAPI_PHONE_NUMBER_ID is not configured");
  }
  return {
    apiKey,
    phoneNumberId,
    baseUrl: process.env.VAPI_BASE_URL || DEFAULT_BASE_URL,
    llmModel: process.env.VAPI_LLM_MODEL || "gpt-4o-mini",
    llmProvider: process.env.VAPI_LLM_PROVIDER || "openai",
  };
}

function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/**
 * Build the inline assistant payload Vapi expects.
 * We inject the user's cloned ElevenLabs voice + their generated script
 * as the system prompt, plus a personalized opener.
 */
export function buildAssistantPayload(
  config: VapiConfig,
  options: VapiAssistantOptions,
): Record<string, unknown> {
  const firstName = firstNameOf(options.leadFirstName);
  const personalizedScript = options.scriptText.replaceAll("{firstName}", firstName);

  const baseAssistant: Record<string, unknown> = {
    name: "Voice Qualifier",
    firstMessage: `Hi ${firstName}, this is Jordan — do you have a quick minute?`,
    voice: {
      provider: "11labs",
      voiceId: options.voiceId,
      model: "eleven_turbo_v2_5",
      stability: 0.5,
      similarityBoost: 0.75,
    },
    transcriber: {
      provider: "deepgram",
      model: "nova-2",
      language: "en",
    },
    model: {
      provider: config.llmProvider,
      model: config.llmModel,
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content: personalizedScript,
        },
      ],
    },
    recordingEnabled: true,
    endCallFunctionEnabled: true,
    silenceTimeoutSeconds: 20,
    maxDurationSeconds: 600,
  };

  if (options.callType === "voicemail") {
    // Voicemail mode: detect the beep, leave the script, hang up.
    return {
      ...baseAssistant,
      voicemailDetectionEnabled: true,
      voicemailMessage: personalizedScript,
      endCallMessage: "Thanks, talk soon.",
      maxDurationSeconds: 90,
    };
  }

  return baseAssistant;
}

export async function createVapiCall(
  config: VapiConfig,
  request: VapiCallRequest,
): Promise<VapiCallResponse> {
  const assistant = buildAssistantPayload(config, request.assistant);

  const body = {
    phoneNumberId: config.phoneNumberId,
    customer: {
      number: request.lead.phone,
      name: request.lead.name,
    },
    assistant,
    metadata: {
      campaignId: request.metadata.campaignId,
      clientId: request.metadata.clientId,
      leadName: request.lead.name,
      leadPhone: request.lead.phone,
    },
  };

  const res = await fetch(`${config.baseUrl}/call`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Vapi /call failed (${res.status}): ${text.slice(0, 500)}`);
  }

  let parsed: VapiCallResponse;
  try {
    parsed = JSON.parse(text) as VapiCallResponse;
  } catch {
    throw new Error("Vapi /call returned non-JSON response");
  }
  if (!parsed.id) throw new Error("Vapi /call response missing id");
  return parsed;
}

/**
 * Verify the shared-secret header Vapi sends with every webhook event.
 * Returns true when no secret is configured (dev mode), so local
 * tunneling without secrets still works.
 */
export function verifyVapiWebhook(headers: Headers): boolean {
  const expected = process.env.VAPI_WEBHOOK_SECRET;
  if (!expected) return true;
  const got =
    headers.get("x-vapi-secret") ||
    headers.get("x-vapi-signature") ||
    headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  return got === expected;
}
