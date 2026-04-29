"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import {
  AudioLines,
  Cloud,
  Loader2,
  Mic,
  PhoneCall,
  Play,
  Radio,
  Rocket,
  Send,
  Server,
  Upload,
  VoicemailIcon,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

import type {
  CallProvider,
  Campaign,
  CampaignLead,
  VoiceClone,
} from "@/types/voiceCaller";
import { LiveCallMonitor } from "./LiveCallMonitor";
import { PostCallReport } from "./PostCallReport";

type CallType = "live" | "voicemail";

function parseLeadsFromText(raw: string): CampaignLead[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      const [name, phone, company, email] = parts;
      if (!phone || !name) return null;
      return {
        name,
        phone,
        company: company || undefined,
        email: email || undefined,
      } as CampaignLead;
    })
    .filter((l): l is CampaignLead => Boolean(l));
}

export function VoiceCallerDashboard() {
  const { user } = useUser();
  const clientId = user?.id ?? "";

  const voiceClone = useQuery(
    api.voiceCaller.getVoiceClone,
    clientId ? { clientId } : "skip",
  ) as VoiceClone | null | undefined;

  const campaigns = useQuery(
    api.voiceCaller.getCampaigns,
    clientId ? { clientId } : "skip",
  ) as Campaign[] | undefined;

  const callLogs = useQuery(
    api.voiceCaller.getCallLogs,
    clientId ? { clientId } : "skip",
  );

  // ─── Tab 1 state ───
  const [voiceName, setVoiceName] = useState("");
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [cloning, setCloning] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // ─── Tab 2 state ───
  const [niche, setNiche] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [offer, setOffer] = useState("");
  const [scriptText, setScriptText] = useState("");
  const [generatingScript, setGeneratingScript] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [campaignAudioUrl, setCampaignAudioUrl] = useState<string | null>(null);
  const [leadsRaw, setLeadsRaw] = useState("");
  const [callType, setCallType] = useState<CallType>("voicemail");
  const [provider, setProvider] = useState<CallProvider>("vapi");
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

  // ─── Tab 3 state ───
  const [launching, setLaunching] = useState(false);
  const [initiatingLive, setInitiatingLive] = useState<string | null>(null);
  const [monitorCampaign, setMonitorCampaign] = useState<{
    campaignId: string;
    leadName: string;
    leadPhone: string;
  } | null>(null);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const leadsParsed = useMemo(() => parseLeadsFromText(leadsRaw), [leadsRaw]);
  const activeCampaign = useMemo(
    () => campaigns?.find((c) => c._id === activeCampaignId) ?? null,
    [campaigns, activeCampaignId],
  );

  // ─── Voice cloning ───
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-sample-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        setSampleFile(file);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (error) {
      toast.error(`Mic access failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function handleCloneVoice() {
    if (!sampleFile) {
      toast.error("Upload or record a voice sample first.");
      return;
    }
    if (!voiceName.trim()) {
      toast.error("Give your voice a name.");
      return;
    }
    setCloning(true);
    try {
      const form = new FormData();
      form.append("audioFile", sampleFile);
      form.append("voiceName", voiceName.trim());
      form.append("clientId", clientId);

      const res = await fetch("/api/voice-caller/clone", { method: "POST", body: form });
      const json = (await res.json()) as { voiceId?: string; error?: string };
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      toast.success(`Voice cloned: ${json.voiceId}`);
      setSampleFile(null);
      setVoiceName("");
    } catch (error) {
      toast.error(`Clone failed: ${error instanceof Error ? error.message : error}`);
    } finally {
      setCloning(false);
    }
  }

  // ─── Campaign build ───
  async function handleGenerateScript() {
    if (!niche.trim() || !agencyName.trim() || !offer.trim()) {
      toast.error("Fill out niche, agency name, and offer.");
      return;
    }
    setGeneratingScript(true);
    try {
      const res = await fetch("/api/voice-caller/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, clientName: agencyName, offer }),
      });
      const json = (await res.json()) as { script?: string; error?: string };
      if (!res.ok || !json.script) throw new Error(json.error || "No script returned");
      setScriptText(json.script);
      toast.success("Script generated.");
    } catch (error) {
      toast.error(`Script failed: ${error instanceof Error ? error.message : error}`);
    } finally {
      setGeneratingScript(false);
    }
  }

  async function handleSaveCampaign(): Promise<string | null> {
    if (!voiceClone) {
      toast.error("Clone a voice first.");
      return null;
    }
    if (!scriptText.trim()) {
      toast.error("Generate or write a script first.");
      return null;
    }
    if (leadsParsed.length === 0) {
      toast.error("Add at least one lead (format: name, phone, company, email).");
      return null;
    }
    setSavingCampaign(true);
    try {
      const res = await fetch("/api/voice-caller/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceId: voiceClone.voiceId,
          scriptText,
          callType,
          leads: leadsParsed,
          provider,
        }),
      });
      const json = (await res.json()) as { campaignId?: string; error?: string };
      if (!res.ok || !json.campaignId) throw new Error(json.error || "Create failed");
      setActiveCampaignId(json.campaignId);
      toast.success("Campaign saved.");
      return json.campaignId;
    } catch (error) {
      toast.error(`Save failed: ${error instanceof Error ? error.message : error}`);
      return null;
    } finally {
      setSavingCampaign(false);
    }
  }

  async function handleGenerateAudio() {
    if (!voiceClone) {
      toast.error("Clone a voice first.");
      return;
    }
    let campaignId = activeCampaignId;
    if (!campaignId) {
      campaignId = await handleSaveCampaign();
      if (!campaignId) return;
    }
    setGeneratingAudio(true);
    try {
      const res = await fetch("/api/voice-caller/generate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceId: voiceClone.voiceId,
          scriptText,
          campaignId,
        }),
      });
      const json = (await res.json()) as { audioUrl?: string; error?: string };
      if (!res.ok || !json.audioUrl) throw new Error(json.error || "No audio returned");
      setCampaignAudioUrl(json.audioUrl);
      toast.success("Audio rendered.");
    } catch (error) {
      toast.error(`Audio failed: ${error instanceof Error ? error.message : error}`);
    } finally {
      setGeneratingAudio(false);
    }
  }

  // ─── Launch ───
  async function handleLaunch(campaign: Campaign) {
    const campaignProvider = campaign.provider ?? "internal";
    // Vapi generates audio in real time — no pre-render required.
    if (
      campaignProvider === "internal" &&
      !campaign.audioUrl &&
      campaign.callType === "voicemail"
    ) {
      toast.error("Voicemail campaigns need an audio URL — render the voice first.");
      return;
    }
    setLaunching(true);
    try {
      const launchBody: Record<string, unknown> = {
        campaignId: campaign._id,
        clientId,
        callType: campaign.callType,
        leads: campaign.leads,
      };
      if (campaignProvider === "internal") {
        launchBody.audioUrl = campaign.audioUrl || campaignAudioUrl || "";
      }
      const res = await fetch("/api/voice-caller/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(launchBody),
      });
      const json = (await res.json()) as {
        launched?: boolean;
        count?: number;
        total?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Launch failed");
      toast.success(`Launched ${json.count}/${json.total} leads.`);
    } catch (error) {
      toast.error(`Launch failed: ${error instanceof Error ? error.message : error}`);
    } finally {
      setLaunching(false);
    }
  }

  async function handleInitiateLive(campaign: Campaign, lead: CampaignLead) {
    if (!voiceClone) {
      toast.error("No cloned voice available.");
      return;
    }
    setInitiatingLive(`${campaign._id}:${lead.phone}`);
    try {
      const res = await fetch("/api/voice-caller/live-call/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadPhone: lead.phone,
          leadName: lead.name,
          campaignId: campaign._id,
          clientId,
          voiceId: voiceClone.voiceId,
          scriptText: campaign.scriptText,
        }),
      });
      const json = (await res.json()) as { callSid?: string; error?: string };
      if (!res.ok || !json.callSid) throw new Error(json.error || "Initiate failed");
      toast.success(`Live call dialing: ${json.callSid.slice(-6)}`);
      setMonitorCampaign({
        campaignId: campaign._id,
        leadName: lead.name,
        leadPhone: lead.phone,
      });
    } catch (error) {
      toast.error(`Call failed: ${error instanceof Error ? error.message : error}`);
    } finally {
      setInitiatingLive(null);
    }
  }

  useEffect(() => {
    if (campaigns && campaigns.length > 0 && !activeCampaignId) {
      setActiveCampaignId(campaigns[0]._id);
    }
  }, [campaigns, activeCampaignId]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">AI Voice Qualifier</h1>
          <p className="text-muted-foreground mt-1">
            Clone your voice, write a qualifier script, and let an AI agent call and qualify
            leads for you in real-time.
          </p>
        </div>
        {voiceClone && (
          <Badge variant="secondary" className="h-7 self-center gap-1 px-3">
            <Mic className="h-3.5 w-3.5" /> {voiceClone.voiceName}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="clone" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="clone">
            <Mic className="mr-2 h-4 w-4" /> Clone Voice
          </TabsTrigger>
          <TabsTrigger value="build">
            <AudioLines className="mr-2 h-4 w-4" /> Build Campaign
          </TabsTrigger>
          <TabsTrigger value="launch">
            <Rocket className="mr-2 h-4 w-4" /> Launch & Track
          </TabsTrigger>
        </TabsList>

        {/* ─────────── TAB 1 ─────────── */}
        <TabsContent value="clone" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clone your voice</CardTitle>
              <CardDescription>
                Upload 30–120 seconds of clean audio, or record a sample in your browser.
                ElevenLabs will produce a voice_id we can reuse across campaigns.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="voiceName">Voice name</Label>
                <Input
                  id="voiceName"
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  placeholder="e.g. Jordan (warm male)"
                />
              </div>

              <div className="grid gap-2">
                <Label>Voice sample</Label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
                    <Upload className="h-4 w-4" />
                    <span>Upload audio</span>
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => setSampleFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {recording ? (
                    <Button variant="destructive" onClick={stopRecording}>
                      <Radio className="mr-2 h-4 w-4" /> Stop recording
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={startRecording}>
                      <Radio className="mr-2 h-4 w-4" /> Record in browser
                    </Button>
                  )}
                  {sampleFile && (
                    <span className="text-sm text-muted-foreground">
                      {sampleFile.name} ({Math.round(sampleFile.size / 1024)} KB)
                    </span>
                  )}
                </div>
              </div>

              <Button onClick={handleCloneVoice} disabled={cloning || !sampleFile}>
                {cloning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mic className="mr-2 h-4 w-4" />
                )}
                Clone voice
              </Button>

              {voiceClone && (
                <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm">
                  <div className="font-medium">Active voice</div>
                  <div className="text-muted-foreground">
                    {voiceClone.voiceName} · <code className="text-xs">{voiceClone.voiceId}</code>
                  </div>
                  {voiceClone.sampleUrl && (
                    <audio controls src={voiceClone.sampleUrl} className="mt-2 w-full" />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────── TAB 2 ─────────── */}
        <TabsContent value="build" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>1. Generate a qualifier script</CardTitle>
              <CardDescription>
                Claude writes a 45–60 second cold call script tailored to your niche.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="niche">Niche</Label>
                  <Input
                    id="niche"
                    placeholder="med spas in Miami"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="agencyName">Agency name</Label>
                  <Input
                    id="agencyName"
                    placeholder="Boolspace"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="offer">Core offer</Label>
                  <Input
                    id="offer"
                    placeholder="20 new booked consults / mo"
                    value={offer}
                    onChange={(e) => setOffer(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleGenerateScript} disabled={generatingScript}>
                {generatingScript ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Generate script
              </Button>

              <div className="grid gap-1.5">
                <Label htmlFor="script">Script</Label>
                <Textarea
                  id="script"
                  rows={8}
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  placeholder="The generated script appears here — edit freely before rendering."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Choose campaign type</CardTitle>
              <CardDescription>
                Voicemail drops play a pre-rendered recording. Live calls open a real-time AI
                conversation using your cloned voice.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={callType === "voicemail" ? "default" : "outline"}
                  onClick={() => setCallType("voicemail")}
                >
                  <VoicemailIcon className="mr-2 h-4 w-4" /> Voicemail drop
                </Button>
                <Button
                  variant={callType === "live" ? "default" : "outline"}
                  onClick={() => setCallType("live")}
                >
                  <PhoneCall className="mr-2 h-4 w-4" /> Live AI call
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2b. Calling engine</CardTitle>
              <CardDescription>
                <strong>Vapi (recommended)</strong> handles speech-to-text, the LLM, and
                text-to-speech end-to-end with sub-second latency. <strong>Internal</strong>{" "}
                uses your Twilio number plus our custom stream engine — more control, more
                moving pieces.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={provider === "vapi" ? "default" : "outline"}
                  onClick={() => setProvider("vapi")}
                >
                  <Cloud className="mr-2 h-4 w-4" /> Vapi
                  <Badge variant="secondary" className="ml-2">
                    recommended
                  </Badge>
                </Button>
                <Button
                  variant={provider === "internal" ? "default" : "outline"}
                  onClick={() => setProvider("internal")}
                >
                  <Server className="mr-2 h-4 w-4" /> Internal (Twilio)
                </Button>
              </div>
              {provider === "vapi" && (
                <p className="text-xs text-muted-foreground">
                  Audio is generated live during the call — no pre-render step needed. Your
                  cloned ElevenLabs voice is used directly.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Add leads</CardTitle>
              <CardDescription>
                One lead per line. Format: <code>Name, +15551234567, Company, email</code> —
                company and email optional.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={6}
                value={leadsRaw}
                onChange={(e) => setLeadsRaw(e.target.value)}
                placeholder={`Jane Doe, +15551234567, Acme Inc, jane@acme.com\nJohn Smith, +15559876543`}
              />
              <div className="text-sm text-muted-foreground">
                {leadsParsed.length} lead{leadsParsed.length === 1 ? "" : "s"} parsed
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSaveCampaign} disabled={savingCampaign}>
                  {savingCampaign ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Save draft campaign
                </Button>
                {callType === "voicemail" && provider === "internal" && (
                  <Button
                    variant="outline"
                    onClick={handleGenerateAudio}
                    disabled={generatingAudio || !voiceClone}
                  >
                    {generatingAudio ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <AudioLines className="mr-2 h-4 w-4" />
                    )}
                    Render voicemail audio
                  </Button>
                )}
              </div>

              {campaignAudioUrl && (
                <div className="rounded-md border border-border/60 bg-muted/30 p-3">
                  <div className="mb-2 text-sm font-medium">Rendered audio</div>
                  <audio controls src={campaignAudioUrl} className="w-full" />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────── TAB 3 ─────────── */}
        <TabsContent value="launch" className="space-y-4">
          {(!campaigns || campaigns.length === 0) && (
            <Card>
              <CardHeader>
                <CardTitle>No campaigns yet</CardTitle>
                <CardDescription>
                  Head back to <strong>Build Campaign</strong> to create one.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {campaigns?.map((campaign) => {
            const campaignProvider = campaign.provider ?? "internal";
            const logsForCampaign = (callLogs ?? []).filter(
              (l) => l.campaignId === campaign._id,
            );
            const launchDisabled =
              launching ||
              (campaign.callType === "voicemail" &&
                campaignProvider === "internal" &&
                !campaign.audioUrl);
            const showLaunchButton =
              campaign.callType === "voicemail" || campaignProvider === "vapi";
            return (
              <Card key={campaign._id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {campaign.callType === "live" ? (
                          <PhoneCall className="h-4 w-4" />
                        ) : (
                          <VoicemailIcon className="h-4 w-4" />
                        )}
                        {campaign.callType === "live" ? "Live AI call" : "Voicemail drop"}
                        <Badge variant="outline" className="ml-2">
                          {campaign.status}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="ml-1 gap-1"
                          title="Calling engine"
                        >
                          {campaignProvider === "vapi" ? (
                            <>
                              <Cloud className="h-3 w-3" /> Vapi
                            </>
                          ) : (
                            <>
                              <Server className="h-3 w-3" /> Internal
                            </>
                          )}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {campaign.leads.length} leads ·{" "}
                        {new Date(campaign.createdAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {showLaunchButton && (
                        <Button
                          onClick={() => handleLaunch(campaign)}
                          disabled={launchDisabled}
                        >
                          {launching ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Rocket className="mr-2 h-4 w-4" />
                          )}
                          {campaign.callType === "voicemail"
                            ? "Launch blast"
                            : "Launch all"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {campaign.audioUrl && (
                    <audio controls src={campaign.audioUrl} className="w-full" />
                  )}

                  <details className="rounded-md border border-border/60 bg-muted/30 p-3">
                    <summary className="cursor-pointer text-sm font-medium">
                      Script
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                      {campaign.scriptText}
                    </pre>
                  </details>

                  <div className="overflow-auto rounded-md border border-border/60">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 text-left">Lead</th>
                          <th className="px-3 py-2 text-left">Phone</th>
                          <th className="px-3 py-2 text-left">Outcome</th>
                          <th className="px-3 py-2 text-left">Score</th>
                          <th className="px-3 py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaign.leads.map((lead) => {
                          const log = logsForCampaign.find((l) => l.leadPhone === lead.phone);
                          const loadingKey = `${campaign._id}:${lead.phone}`;
                          return (
                            <tr key={lead.phone} className="border-t border-border/60">
                              <td className="px-3 py-2">
                                <div className="font-medium">{lead.name}</div>
                                {lead.company && (
                                  <div className="text-xs text-muted-foreground">
                                    {lead.company}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 font-mono text-xs">{lead.phone}</td>
                              <td className="px-3 py-2">
                                {log ? (
                                  <Badge
                                    variant={
                                      log.outcome === "qualified" ? "default" : "secondary"
                                    }
                                    className={
                                      log.outcome === "qualified"
                                        ? "bg-emerald-500/80 hover:bg-emerald-500"
                                        : ""
                                    }
                                  >
                                    {log.outcome}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {log ? `${log.qualScore}/4` : "—"}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <div className="flex justify-end gap-1">
                                  {campaign.callType === "live" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleInitiateLive(campaign, lead)}
                                      disabled={initiatingLive === loadingKey}
                                    >
                                      {initiatingLive === loadingKey ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Play className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  )}
                                  {log && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setSelectedLogId(log._id)}
                                    >
                                      Report
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {monitorCampaign && (
            <LiveCallMonitor
              campaignId={monitorCampaign.campaignId}
              leadName={monitorCampaign.leadName}
              leadPhone={monitorCampaign.leadPhone}
              onClose={() => setMonitorCampaign(null)}
            />
          )}

          {selectedLogId && (
            <PostCallReport
              callLogId={selectedLogId}
              onClose={() => setSelectedLogId(null)}
            />
          )}
        </TabsContent>
      </Tabs>

      {!voiceClone && activeCampaign === null && (
        <p className="mt-6 text-xs text-muted-foreground">
          Tip: clone a voice first, then the campaign builder unlocks full functionality.
        </p>
      )}
    </div>
  );
}
