"use client";

/**
 * Voice settings tab — the user records or uploads a voice sample, we send it
 * to /api/voice-caller/clone (which already creates an ElevenLabs voice and
 * stores the voice_id in the voiceClones table). Whatever clone is most
 * recently created is treated as the user's "active" voice for AI-generated
 * voice replies in the GHL conversations inbox.
 *
 * This reuses the same backend the voice caller already uses, so cloning here
 * also unlocks the voice for outbound qualifier calls (and vice versa).
 */

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Loader2,
  Mic,
  Play,
  Radio,
  Square,
  Upload,
  Volume2,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { VoiceClone } from "@/types/voiceCaller";

const PREVIEW_SENTENCE =
  "Hi! Just a quick voice note to confirm — I'd love to chat about your business. Got a minute?";

export function VoiceReplySettings() {
  const { user } = useUser();
  const clientId = user?.id ?? "";

  const voiceClone = useQuery(
    api.voiceCaller.getVoiceClone,
    clientId ? { clientId } : "skip",
  ) as VoiceClone | null | undefined;

  const [voiceName, setVoiceName] = useState("");
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Clean up object URLs we created for previews when leaving the page.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

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
    } catch (e) {
      toast.error(
        `Mic access failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function handleClone() {
    if (!sampleFile) {
      toast.error("Record or upload a sample first.");
      return;
    }
    if (!voiceName.trim()) {
      toast.error("Give your voice a name (e.g. your first name).");
      return;
    }
    setCloning(true);
    try {
      const form = new FormData();
      form.append("audioFile", sampleFile);
      form.append("voiceName", voiceName.trim());
      form.append("clientId", clientId);

      const res = await fetch("/api/voice-caller/clone", {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as { voiceId?: string; error?: string };
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      toast.success("Voice cloned and set as your active voice for replies.");
      setSampleFile(null);
      setVoiceName("");
    } catch (e) {
      toast.error(
        `Clone failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setCloning(false);
    }
  }

  async function handlePreview() {
    if (!voiceClone) {
      toast.error("Clone a voice first.");
      return;
    }
    setPreviewing(true);
    try {
      const res = await fetch("/api/voice-caller/generate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceId: voiceClone.voiceId,
          scriptText: PREVIEW_SENTENCE,
        }),
      });
      const json = (await res.json()) as { audioUrl?: string; error?: string };
      if (!res.ok || !json.audioUrl) {
        throw new Error(json.error || "Preview failed");
      }
      setPreviewUrl(json.audioUrl);
    } catch (e) {
      toast.error(
        `Preview failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card border-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-white/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" /> Active voice for replies
              </CardTitle>
              <CardDescription>
                When you send an AI voice reply from the conversations inbox,
                this is the voice that will speak.
              </CardDescription>
            </div>
            {voiceClone && (
              <Badge className="gap-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" /> Active
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {voiceClone ? (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Name
                  </Label>
                  <p className="text-sm mt-1">{voiceClone.voiceName}</p>
                </div>
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    ElevenLabs voice ID
                  </Label>
                  <p className="text-xs font-mono mt-1 break-all text-muted-foreground">
                    {voiceClone.voiceId}
                  </p>
                </div>
              </div>
              {voiceClone.sampleUrl && (
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Original sample
                  </Label>
                  <audio
                    controls
                    src={voiceClone.sampleUrl}
                    className="mt-2 w-full"
                  />
                </div>
              )}

              <Separator className="bg-white/5" />

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Hear how the AI will sound
                </Label>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={handlePreview}
                    disabled={previewing}
                    className="border-white/10 font-bold uppercase tracking-widest text-xs"
                  >
                    {previewing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Generate preview
                  </Button>
                  {previewUrl && (
                    <audio controls src={previewUrl} className="flex-1 min-w-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  &quot;{PREVIEW_SENTENCE}&quot;
                </p>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              No voice cloned yet. Record or upload a 30–120 second sample
              below — once cloned, AI-generated replies in the conversations
              inbox can be sent as voice notes in your voice.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card border-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-white/5">
          <CardTitle>
            {voiceClone ? "Replace your voice" : "Clone your voice"}
          </CardTitle>
          <CardDescription>
            Record 30–120 seconds of clean, single-speaker audio (no music).
            Cloning here also unlocks your voice for outbound qualifier calls.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="vr-name">Voice name</Label>
            <Input
              id="vr-name"
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              placeholder="e.g. Dre (warm)"
              className="bg-white/5 border-white/10 h-11"
            />
          </div>

          <div className="grid gap-2">
            <Label>Voice sample</Label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10">
                <Upload className="h-4 w-4" />
                <span>Upload audio</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) =>
                    setSampleFile(e.target.files?.[0] ?? null)
                  }
                />
              </label>
              {recording ? (
                <Button variant="destructive" onClick={stopRecording}>
                  <Square className="h-4 w-4 mr-2" /> Stop recording
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={startRecording}
                  className="border-white/10"
                >
                  <Radio className="h-4 w-4 mr-2" /> Record in browser
                </Button>
              )}
              {sampleFile && (
                <span className="text-xs text-muted-foreground">
                  {sampleFile.name} ({Math.round(sampleFile.size / 1024)} KB)
                </span>
              )}
            </div>
          </div>

          <Button
            onClick={handleClone}
            disabled={cloning || !sampleFile}
            className="amber-glow font-bold uppercase tracking-widest text-xs"
          >
            {cloning ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Mic className="h-4 w-4 mr-2" />
            )}
            {voiceClone ? "Replace active voice" : "Clone voice"}
          </Button>

          <p className="text-xs text-muted-foreground">
            By cloning, you confirm this is your own voice and you authorize
            ElevenLabs to synthesize it. Voice clones are private to your
            account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
