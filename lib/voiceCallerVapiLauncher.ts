/**
 * Shared Vapi outbound-call launcher used by both
 *   - /api/voice-caller/vapi/launch (explicit Vapi route)
 *   - /api/voice-caller/launch       (when campaign.provider === "vapi")
 *
 * Keeps the per-lead loop + log seeding in one place so the two entry
 * points stay in lock-step.
 */

import {
  createVapiCall,
  loadVapiConfig,
  VapiConfigError,
  type VapiCallType,
  type VapiConfig,
} from "@/lib/vapiClient";
import { upsertVapiCallLog } from "@/lib/voiceCallerConvex";
import type { CampaignLead } from "@/types/voiceCaller";

export type VapiLaunchInput = {
  campaignId: string;
  clientId: string;
  voiceId: string;
  scriptText: string;
  callType: VapiCallType;
  leads: CampaignLead[];
};

export type VapiLaunchResult = {
  phone: string;
  name: string;
  ok: boolean;
  vapiCallId?: string;
  error?: string;
};

export type VapiLaunchOutcome =
  | { ok: true; results: VapiLaunchResult[]; config: VapiConfig }
  | { ok: false; error: string; status: number };

export async function launchVapiCampaign(
  input: VapiLaunchInput,
): Promise<VapiLaunchOutcome> {
  let config: VapiConfig;
  try {
    config = loadVapiConfig();
  } catch (error) {
    if (error instanceof VapiConfigError) {
      return { ok: false, error: error.message, status: 500 };
    }
    throw error;
  }

  if (input.leads.length === 0) {
    return { ok: false, error: "No leads to call", status: 400 };
  }

  const results: VapiLaunchResult[] = [];
  for (const lead of input.leads) {
    try {
      const call = await createVapiCall(config, {
        lead,
        assistant: {
          voiceId: input.voiceId,
          scriptText: input.scriptText,
          leadFirstName: lead.name,
          callType: input.callType,
        },
        metadata: {
          campaignId: input.campaignId,
          clientId: input.clientId,
        },
      });

      try {
        await upsertVapiCallLog({
          campaignId: input.campaignId,
          clientId: input.clientId,
          leadPhone: lead.phone,
          leadName: lead.name,
          vapiCallId: call.id,
        });
      } catch (logError) {
        console.warn("[voiceCallerVapiLauncher] seed log failed", {
          vapiCallId: call.id,
          error: logError instanceof Error ? logError.message : String(logError),
        });
      }

      results.push({ phone: lead.phone, name: lead.name, ok: true, vapiCallId: call.id });
    } catch (error) {
      results.push({
        phone: lead.phone,
        name: lead.name,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { ok: true, results, config };
}
