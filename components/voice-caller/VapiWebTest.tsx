"use client";

/**
 * Browser-based Vapi voice call — mirrors the "Talk" button in the Vapi
 * dashboard. Lets the user have a real-time voice conversation with their
 * own qualifier (own cloned voice + own script) without dialing a phone.
 *
 * Requires NEXT_PUBLIC_VAPI_PUBLIC_KEY (Vapi → Org → API Keys → Public Key).
 * That key is safe to expose to the browser by design.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Cloud,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  Play,
  Stethoscope,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { Campaign, VoiceClone } from "@/types/voiceCaller";

type TranscriptItem = {
  role: "assistant" | "user";
  text: string;
  ts: number;
};

type Props = {
  voiceClone: VoiceClone | null | undefined;
  campaigns: Campaign[] | undefined;
};

const DEFAULT_FIRST_MESSAGE =
  "Hi! Thanks for jumping on. I'm going to ask a few quick questions to see if we'd be a fit — sound good?";

const DEFAULT_SYSTEM_PROMPT = `You are a friendly, professional outbound qualifier for a marketing agency.
Goal: in under 4 minutes, find out if the lead has (1) a real problem we can solve, (2) budget authority,
(3) decision-making power, and (4) interest in booking a follow-up.

Style:
- Sound human and conversational. Short sentences. One question at a time.
- Mirror the lead's energy. Never read a script verbatim.
- If the lead asks a question, answer briefly then steer back to qualification.
- If they're qualified, offer to book a 20-minute call.
- If they're not interested, thank them and end the call politely.`;

export function VapiWebTest({ voiceClone, campaigns }: Props) {
  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
  const vapiRef = useRef<unknown>(null);

  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("custom");
  const [systemPrompt, setSystemPrompt] = useState<string>(DEFAULT_SYSTEM_PROMPT);
  const [firstMessage, setFirstMessage] = useState<string>(DEFAULT_FIRST_MESSAGE);
  // Optional: if set, we hand this assistantId to Vapi instead of building
  // an inline config. Useful for sanity-checking the SDK+key against an
  // assistant you already know works in the Vapi dashboard.
  const [assistantId, setAssistantId] = useState<string>("");
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  // Default OFF — using a cloned ElevenLabs voice requires the Vapi org to
  // have an ElevenLabs API key configured (Vapi dashboard → Provider Keys).
  // Without that, every call dies with "Pipeline error eleven labs".
  const [useClonedVoice, setUseClonedVoice] = useState(false);

  const [status, setStatus] = useState<
    "idle" | "connecting" | "in-call" | "ending"
  >("idle");
  const [muted, setMuted] = useState(false);
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const selectedCampaign = useMemo(
    () => campaigns?.find((c) => c._id === selectedCampaignId) ?? null,
    [campaigns, selectedCampaignId],
  );

  // When user picks an existing campaign, prefill the prompt with its script.
  useEffect(() => {
    if (selectedCampaign) {
      setSystemPrompt(selectedCampaign.scriptText);
    }
  }, [selectedCampaign]);

  // Auto-scroll transcript.
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Cleanup on unmount — make sure we don't leave a call hanging.
  useEffect(() => {
    return () => {
      const v = vapiRef.current as { stop?: () => void } | null;
      try {
        v?.stop?.();
      } catch {
        // ignore
      }
    };
  }, []);

  async function getVapiInstance() {
    if (vapiRef.current) return vapiRef.current;
    if (!publicKey) {
      throw new Error(
        "NEXT_PUBLIC_VAPI_PUBLIC_KEY is not configured — add it to your .env.local",
      );
    }
    // Dynamic import so the SDK is only pulled in when the tab is used.
    const mod = await import("@vapi-ai/web");
    const VapiCtor = (mod as { default: new (key: string) => unknown }).default;
    const instance = new VapiCtor(publicKey) as {
      on: (event: string, cb: (payload?: unknown) => void) => void;
      start: (config: Record<string, unknown>) => Promise<unknown>;
      stop: () => void;
      setMuted: (m: boolean) => void;
      isMuted: () => boolean;
    };

    // Vapi 2.5+ gives us granular setup events. Use them to pinpoint the
    // exact stage where things fail instead of getting a vague "Failed to
    // fetch" or "Meeting ended due to ejection".
    instance.on("call-start-progress", (payload) => {
      // eslint-disable-next-line no-console
      console.log("[VapiWebTest] call-start-progress", payload);
    });
    instance.on("call-start-success", (payload) => {
      // eslint-disable-next-line no-console
      console.log("[VapiWebTest] call-start-success", payload);
    });
    instance.on("call-start-failed", (payload) => {
      // eslint-disable-next-line no-console
      console.error("[VapiWebTest] call-start-failed", payload);
      const obj = (payload ?? {}) as Record<string, unknown>;
      const stage = (obj.stage as string) ?? "unknown";
      const errMsg = (obj.error as string) ?? "no error message";
      const ctx = obj.context ? ` (context: ${JSON.stringify(obj.context)})` : "";
      const msg = `Call setup failed at stage "${stage}": ${errMsg}${ctx}`;
      setError(msg);
      toast.error(msg);
      setStatus("idle");
    });

    instance.on("network-quality-change", (event) => {
      // eslint-disable-next-line no-console
      console.log("[VapiWebTest] network-quality-change", event);
    });
    instance.on("network-connection", (event) => {
      // eslint-disable-next-line no-console
      console.log("[VapiWebTest] network-connection", event);
      const obj = (event ?? {}) as Record<string, unknown>;
      const type = (obj.type as string) ?? "";
      // Daily fires "transport-disconnected" / "transport-failed" when the
      // browser stops sending or receiving audio. That's almost always a
      // local mic/network issue, not a Vapi config problem — surface it
      // clearly so the user knows where to look.
      if (
        type.includes("disconnected") ||
        type.includes("failed") ||
        type.includes("interrupted")
      ) {
        const msg =
          "Audio transport dropped (your browser stopped sending/receiving audio). Most common causes: another app grabbed the microphone, the tab lost focus, the browser revoked mic permission, or a firewall is blocking WebRTC (UDP). Check the mic icon in the address bar, close Zoom/Meet/Teams/etc., and try again.";
        setError((prev) => prev ?? msg);
      }
    });

    instance.on("call-start", () => {
      setStatus("in-call");
      setError(null);
    });
    instance.on("call-end", (payload) => {
      // eslint-disable-next-line no-console
      console.log("[VapiWebTest] call-end", payload);
      setStatus("idle");
      setAssistantSpeaking(false);
      // If the call ended without a real conversation (no transcript yet)
      // surface the endedReason so the user knows why.
      const obj = (payload ?? {}) as Record<string, unknown>;
      const endedReason =
        (obj.endedReason as string | undefined) ??
        (obj.reason as string | undefined) ??
        ((obj.call as Record<string, unknown> | undefined)?.endedReason as
          | string
          | undefined);
      if (endedReason) {
        setError((prev) => prev ?? `Call ended: ${endedReason}`);
      }
    });
    instance.on("speech-start", () => setAssistantSpeaking(true));
    instance.on("speech-end", () => setAssistantSpeaking(false));
    instance.on("error", (payload) => {
      // Vapi nests the message in different shapes depending on where the
      // failure happens (auth, assistant config, websocket, server). Walk
      // every spot it could land before falling back to a stringified dump.
      const extractMessage = (p: unknown): string => {
        if (!p) return "Unknown Vapi error";
        if (typeof p === "string") return p;
        if (p instanceof Error) return p.message;
        if (typeof p !== "object") return String(p);
        const obj = p as Record<string, unknown>;
        const candidates: unknown[] = [
          obj.message,
          obj.errorMsg,
          obj.errorMessage,
          obj.msg,
          obj.reason,
          (obj.error as Record<string, unknown> | undefined)?.message,
          (obj.error as Record<string, unknown> | undefined)?.errorMsg,
          (obj.error as Record<string, unknown> | undefined)?.msg,
          (obj.errorBody as Record<string, unknown> | undefined)?.message,
          obj.error,
          obj.body,
        ];
        for (const c of candidates) {
          if (typeof c === "string" && c.trim()) return c;
        }
        try {
          return JSON.stringify(p);
        } catch {
          return "Vapi error (unserializable payload)";
        }
      };
      const msg = extractMessage(payload);
      // Always log the full object so the user can inspect it in DevTools.
      // eslint-disable-next-line no-console
      console.error("[VapiWebTest] vapi error event", payload);
      setError(msg);
      toast.error(`Vapi: ${msg}`);
      setStatus("idle");
    });
    instance.on("message", (payload) => {
      if (!payload || typeof payload !== "object") return;
      const msg = payload as {
        type?: string;
        role?: string;
        transcript?: string;
        transcriptType?: "partial" | "final";
      };
      if (msg.type !== "transcript") return;
      if (msg.transcriptType !== "final") return;
      const text = (msg.transcript ?? "").trim();
      if (!text) return;
      const role: "assistant" | "user" =
        msg.role === "assistant" || msg.role === "bot" ? "assistant" : "user";
      setTranscript((prev) => [...prev, { role, text, ts: Date.now() }]);
    });

    vapiRef.current = instance;
    return instance;
  }

  function buildAssistantConfig(): Record<string, unknown> {
    // Bare-minimum inline assistant. No name, no clientMessages, no timeouts,
    // no transcriber section (Vapi falls back to its default if omitted).
    // Anything optional we send is one more thing Vapi can reject.
    const voice =
      voiceClone && useClonedVoice
        ? {
            provider: "11labs",
            voiceId: voiceClone.voiceId,
          }
        : {
            provider: "vapi",
            voiceId: "Elliot",
          };

    return {
      firstMessage: firstMessage.trim() || DEFAULT_FIRST_MESSAGE,
      voice,
      model: {
        // gpt-4o is the universally-available model on Vapi orgs;
        // gpt-4.1 needs a specific routing config that some orgs lack.
        provider: "openai",
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt.trim() || DEFAULT_SYSTEM_PROMPT,
          },
        ],
      },
    };
  }

  async function handleStart() {
    if (!publicKey) {
      const msg =
        "NEXT_PUBLIC_VAPI_PUBLIC_KEY is missing. Grab the public key from the Vapi dashboard (Org → API Keys → Public) and add it to .env.local.";
      setError(msg);
      toast.error(msg);
      return;
    }
    setStatus("connecting");
    setTranscript([]);
    setError(null);
    try {
      const trimmedAssistantId = assistantId.trim();

      // Pre-flight: if the user gave us an assistantId, try to verify it.
      // This is non-blocking — if the diagnostic call itself fails (network,
      // auth gate, server route not yet hot-reloaded), we just log and keep
      // going. Pre-flight is here to give better errors, not to gate calls.
      // It ALSO lets us read the base assistant's model config so when we
      // override the system prompt we can keep the assistant's existing
      // provider+model (Vapi requires the full model object on override).
      let baseAssistantModel: { provider?: string; model?: string } | null = null;
      if (trimmedAssistantId) {
        try {
          const pf = await fetch(
            `/api/voice-caller/vapi/assistant?id=${encodeURIComponent(
              trimmedAssistantId,
            )}`,
            { cache: "no-store" },
          );
          const pfJson = (await pf.json()) as {
            ok: boolean;
            error?: string;
            hint?: string;
            assistant?: {
              model?: { provider?: string; model?: string };
            };
          };
          // eslint-disable-next-line no-console
          console.log("[VapiWebTest] preflight assistant check", pfJson);
          if (pfJson.ok && pfJson.assistant?.model) {
            baseAssistantModel = pfJson.assistant.model;
          }
          if (!pfJson.ok) {
            const msg = `${pfJson.error ?? "Assistant pre-flight warning"}${
              pfJson.hint ? ` — ${pfJson.hint}` : ""
            }`;
            toast.warning(msg);
          }
        } catch (preflightErr) {
          // eslint-disable-next-line no-console
          console.warn(
            "[VapiWebTest] preflight check failed (non-blocking)",
            preflightErr,
          );
        }
      }

      // Explicitly request mic permission before vapi.start(). Some browsers
      // hand the SDK an empty audio track unless we ask first, which Vapi
      // surfaces as "Assistant Did Not Receive Audio" in the dashboard logs.
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        // Release the tracks immediately — the SDK opens its own when it starts.
        stream.getTracks().forEach((t) => t.stop());
      } catch (micErr) {
        const msg =
          micErr instanceof Error
            ? micErr.message
            : "Microphone permission denied";
        setError(`Microphone access required: ${msg}`);
        toast.error(`Mic blocked: ${msg}`);
        setStatus("idle");
        return;
      }

      let vapi: {
        start: (
          assistant?: string | Record<string, unknown>,
          assistantOverrides?: Record<string, unknown>,
        ) => Promise<unknown>;
        setMuted: (m: boolean) => void;
      };
      try {
        vapi = (await getVapiInstance()) as typeof vapi;
      } catch (sdkErr) {
        const m = sdkErr instanceof Error ? sdkErr.message : String(sdkErr);
        const msg = `Could not load the Vapi SDK chunk (${m}). Restart the dev server (it sometimes serves stale dynamic-import chunks after a code change).`;
        setError(msg);
        toast.error(msg);
        setStatus("idle");
        return;
      }

      // Some SDK versions start with the mic still muted, which Daily.co
      // reads as "no participant" and ejects after a few seconds. Force
      // unmute before starting.
      try {
        vapi.setMuted(false);
        setMuted(false);
      } catch {
        // ignore — setMuted may throw if not yet connected
      }

      try {
        if (trimmedAssistantId) {
          // Override the dashboard assistant's config with whatever the
          // user typed in the form. This bypasses the "Key doesn't allow
          // transient assistant" restriction on the publishable key while
          // still letting the user customize firstMessage / system prompt /
          // voice per call.
          const overrides: Record<string, unknown> = {};
          const trimmedFirst = firstMessage.trim();
          const trimmedPrompt = systemPrompt.trim();
          // Always override with whatever's in the form — the user typed it
          // there for a reason; they don't want Riley's defaults bleeding
          // through unless they explicitly cleared the field.
          if (trimmedFirst) {
            overrides.firstMessage = trimmedFirst;
          }
          if (trimmedPrompt) {
            // Vapi requires the full model object (provider + model) when
            // overriding any model field — sending just `messages` returns
            // 400 "assistantOverrides.model.provider must be one of...".
            // So inherit provider+model from the base assistant we fetched
            // in pre-flight, with safe defaults if pre-flight didn't run.
            overrides.model = {
              provider: baseAssistantModel?.provider ?? "openai",
              model: baseAssistantModel?.model ?? "gpt-4o",
              messages: [{ role: "system", content: trimmedPrompt }],
            };
          }
          if (voiceClone && useClonedVoice) {
            overrides.voice = {
              provider: "11labs",
              voiceId: voiceClone.voiceId,
            };
          }

          if (Object.keys(overrides).length > 0) {
            // eslint-disable-next-line no-console
            console.log(
              "[VapiWebTest] starting with assistantId + overrides",
              trimmedAssistantId,
              overrides,
            );
            await vapi.start(trimmedAssistantId, overrides);
          } else {
            // eslint-disable-next-line no-console
            console.log(
              "[VapiWebTest] starting with assistantId (no overrides)",
              trimmedAssistantId,
            );
            await vapi.start(trimmedAssistantId);
          }
        } else {
          const config = buildAssistantConfig();
          // eslint-disable-next-line no-console
          console.log("[VapiWebTest] starting with inline assistant", config);
          await vapi.start(config);
        }
      } catch (startErr) {
        const m = startErr instanceof Error ? startErr.message : String(startErr);
        // eslint-disable-next-line no-console
        console.error("[VapiWebTest] vapi.start() threw", startErr);
        const msg = `vapi.start() failed: ${m}`;
        setError(msg);
        toast.error(msg);
        setStatus("idle");
        return;
      }
      // status flips to "in-call" via the call-start event listener
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error(`Couldn't start call: ${msg}`);
      setStatus("idle");
    }
  }

  function handleStop() {
    setStatus("ending");
    const v = vapiRef.current as { stop?: () => void } | null;
    try {
      v?.stop?.();
    } catch {
      // ignore
    }
    // call-end event will reset to idle
    setTimeout(() => setStatus("idle"), 500);
  }

  async function handleDiagnose() {
    setDiagnosing(true);
    setDiagnosis(null);
    try {
      const params = new URLSearchParams();
      if (publicKey) params.set("publicKey", publicKey);
      const res = await fetch(
        `/api/voice-caller/vapi/diagnose?${params.toString()}`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as Record<string, unknown>;
      // eslint-disable-next-line no-console
      console.log("[VapiWebTest] diagnose result", json);

      // Build a human-readable summary from the structured response.
      const lines: string[] = [];
      if (json.ok === false) {
        lines.push(`❌ ${(json.error as string) || "Diagnostic failed."}`);
        if (json.hint) lines.push((json.hint as string) ?? "");
      } else {
        lines.push("✅ Server key reaches your Vapi org.");
        if (typeof json.assistantCount === "number") {
          lines.push(`Found ${json.assistantCount} assistant(s) in this org.`);
        }
        const analysis = json.publicKeyAnalysis as
          | {
              found: boolean;
              type?: string;
              looksLikePrivateKey?: boolean;
              allowedOrigins?: string[] | null;
              verdict: string;
            }
          | null
          | undefined;
        if (!publicKey) {
          lines.push("⚠️ NEXT_PUBLIC_VAPI_PUBLIC_KEY is not set in the browser.");
        } else if (!analysis) {
          lines.push(
            "⚠️ Couldn't analyze the public key (Vapi /api-key endpoint didn't respond as expected).",
          );
          if (json.listKeysError) {
            lines.push(`Details: ${json.listKeysError as string}`);
          }
        } else if (!analysis.found) {
          // Inconclusive — Vapi's /api-key endpoint only lists private keys,
          // so absence here doesn't mean the key is bad.
          lines.push(`⚠️ ${analysis.verdict}`);
        } else {
          const prefix = analysis.looksLikePrivateKey ? "❌" : "✅";
          lines.push(`${prefix} ${analysis.verdict}`);
        }
      }
      setDiagnosis(lines.filter(Boolean).join("\n"));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setDiagnosis(`Diagnostic request failed: ${msg}`);
    } finally {
      setDiagnosing(false);
    }
  }

  function handleToggleMute() {
    const v = vapiRef.current as { setMuted?: (m: boolean) => void } | null;
    const next = !muted;
    try {
      v?.setMuted?.(next);
      setMuted(next);
    } catch {
      // ignore
    }
  }

  // Treat the brief "ending" phase as still in-call so the End-call button
  // stays mounted (and can render its spinner) during the 500ms teardown
  // before status flips to "idle".
  const inCall =
    status === "in-call" ||
    status === "connecting" ||
    status === "ending";

  return (
    <div className="space-y-4">
      {!publicKey && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader className="flex-row items-start gap-3 space-y-0">
            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-500" />
            <div>
              <CardTitle className="text-base">
                Add your Vapi public key
              </CardTitle>
              <CardDescription>
                Set <code className="text-xs">NEXT_PUBLIC_VAPI_PUBLIC_KEY</code>{" "}
                in <code className="text-xs">.env.local</code> using the{" "}
                <strong>Public</strong> key from the Vapi dashboard (
                <em>Org → API Keys</em>). Restart the dev server. The browser
                call uses this key — it's safe to expose.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" /> Test your qualifier in the browser
          </CardTitle>
          <CardDescription>
            This is the same experience as the <strong>Talk</strong> button in
            the Vapi dashboard — but using your cloned voice and your script.
            The AI speaks first, you answer, it qualifies you. No phone number
            needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Voice</Label>
              <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
                <Mic className="h-3.5 w-3.5 text-muted-foreground" />
                {voiceClone && useClonedVoice ? (
                  <span className="truncate">
                    {voiceClone.voiceName}{" "}
                    <code className="ml-1 text-xs text-muted-foreground">
                      {voiceClone.voiceId}
                    </code>
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Vapi built-in voice (Elliot)
                  </span>
                )}
              </div>
              {voiceClone && (
                <label className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={useClonedVoice}
                    onChange={(e) => setUseClonedVoice(e.target.checked)}
                    disabled={inCall}
                    className="mt-0.5"
                  />
                  <span>
                    Use my cloned voice instead.{" "}
                    <strong className="text-amber-300">
                      Requires your ElevenLabs API key configured in Vapi
                    </strong>{" "}
                    (Vapi dashboard → Provider Keys → ElevenLabs). Without
                    that, calls fail with &quot;Pipeline error eleven labs&quot;.
                  </span>
                </label>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="campaign-select">Load script from campaign</Label>
              <Select
                value={selectedCampaignId}
                onValueChange={setSelectedCampaignId}
                disabled={inCall}
              >
                <SelectTrigger id="campaign-select">
                  <SelectValue placeholder="Custom prompt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom prompt below</SelectItem>
                  {(campaigns ?? []).map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.callType === "live" ? "Live · " : "Voicemail · "}
                      {new Date(c.createdAt).toLocaleDateString()} ·{" "}
                      {c.leads.length} leads
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="first-message">First message (AI opener)</Label>
            <Input
              id="first-message"
              value={firstMessage}
              onChange={(e) => setFirstMessage(e.target.value)}
              placeholder={DEFAULT_FIRST_MESSAGE}
              disabled={inCall}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="assistant-id">
              Or use an existing Vapi assistant ID{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="assistant-id"
              value={assistantId}
              onChange={(e) => setAssistantId(e.target.value)}
              placeholder="e.g. fb8fe3a8-41a6-42ca-887c-3aac…"
              disabled={inCall}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Paste an assistant ID from the Vapi dashboard (top of the
              assistant page) to bypass the inline config below — useful for
              sanity-checking the integration against a known-good assistant
              like Riley. Leave blank to use the inline config.
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="system-prompt">System prompt / script</Label>
            <Textarea
              id="system-prompt"
              rows={8}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              disabled={inCall}
            />
            <p className="text-xs text-muted-foreground">
              Tip: pick a saved campaign above to load its script, or write a
              fresh one here.
            </p>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center gap-2">
            {!inCall ? (
              <>
                <Button onClick={handleStart} size="lg" disabled={!publicKey}>
                  <Play className="mr-2 h-4 w-4" /> Start browser call
                </Button>
                <Button
                  onClick={handleDiagnose}
                  variant="outline"
                  size="lg"
                  disabled={diagnosing}
                >
                  {diagnosing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Stethoscope className="mr-2 h-4 w-4" />
                  )}
                  Run diagnostics
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleStop}
                  variant="destructive"
                  size="lg"
                  disabled={status === "ending"}
                >
                  {status === "ending" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PhoneOff className="mr-2 h-4 w-4" />
                  )}
                  End call
                </Button>
                <Button
                  onClick={handleToggleMute}
                  variant={muted ? "default" : "outline"}
                  size="lg"
                >
                  {muted ? (
                    <>
                      <MicOff className="mr-2 h-4 w-4" /> Unmute
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-4 w-4" /> Mute
                    </>
                  )}
                </Button>
                <Badge
                  variant="secondary"
                  className="gap-1.5 px-3 py-1.5 text-xs"
                >
                  {status === "connecting" ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" /> Connecting…
                    </>
                  ) : assistantSpeaking ? (
                    <>
                      <Volume2 className="h-3 w-3 animate-pulse" /> AI speaking
                    </>
                  ) : (
                    <>
                      <Mic className="h-3 w-3" /> Your turn
                    </>
                  )}
                </Badge>
              </>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/5 p-3 text-sm text-red-500">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <div className="font-medium">{error}</div>
                <div className="text-xs opacity-80">
                  Full payload logged to the browser console (DevTools → Console
                  → search <code>[VapiWebTest]</code>). If this says &quot;ejection&quot;
                  or &quot;meeting ended&quot;, click <strong>Run diagnostics</strong>{" "}
                  to find the exact cause.
                </div>
              </div>
            </div>
          )}

          {diagnosis && (
            <div className="rounded-md border border-blue-500/40 bg-blue-500/5 p-3 text-sm">
              <div className="mb-1 flex items-center gap-2 font-medium text-blue-300">
                <Stethoscope className="h-4 w-4" /> Diagnostic result
              </div>
              <pre className="whitespace-pre-wrap font-sans text-xs text-blue-100/90">
                {diagnosis}
              </pre>
            </div>
          )}

          {(transcript.length > 0 || inCall) && (
            <div className="rounded-md border border-border/60 bg-muted/30 p-3">
              <div className="mb-2 text-sm font-medium">Live transcript</div>
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {transcript.length === 0 && (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    Waiting for the first words…
                  </div>
                )}
                {transcript.map((t, i) => (
                  <div
                    key={i}
                    className={`flex ${
                      t.role === "assistant" ? "justify-start" : "justify-end"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        t.role === "assistant"
                          ? "bg-primary/10 text-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <div className="mb-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                        {t.role === "assistant" ? "AI" : "You"}
                      </div>
                      {t.text}
                    </div>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
