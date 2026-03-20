"use client";

import { useState } from "react";
import SideBar from "@/components/SideBar";
import { PlanGate } from "@/components/PlanGate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Link from "next/link";

type EmailMessage = {
  subject: string;
  body: string;
};

type EmailSequence = {
  initial: EmailMessage;
  followUp: EmailMessage;
  breakup: EmailMessage;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function toEmailMessage(value: unknown): EmailMessage | null {
  const obj = asRecord(value);
  if (!obj) return null;

  const subjectCandidate = obj.subject;
  const bodyCandidate = obj.body ?? obj.content ?? obj.email ?? obj.text;

  const subject = typeof subjectCandidate === "string" ? subjectCandidate.trim() : "";
  const body = typeof bodyCandidate === "string" ? bodyCandidate.trim() : "";

  if (!subject && !body) return null;
  return { subject: subject || "(No subject provided)", body };
}

function normalizeSequence(value: unknown): EmailSequence | null {
  const obj = asRecord(value);

  if (obj) {
    const initial = toEmailMessage(obj.initial ?? obj.initialEmail ?? obj.first);
    const followUp = toEmailMessage(
      obj.followUp ?? obj.followup ?? obj.follow_up ?? obj.second,
    );
    const breakup = toEmailMessage(obj.breakup ?? obj.break_up ?? obj.third);

    if (initial && followUp && breakup) {
      return { initial, followUp, breakup };
    }
  }

  if (Array.isArray(value) && value.length >= 3) {
    const initial = toEmailMessage(value[0]);
    const followUp = toEmailMessage(value[1]);
    const breakup = toEmailMessage(value[2]);

    if (initial && followUp && breakup) {
      return { initial, followUp, breakup };
    }
  }

  return null;
}

export default function AiServicesHubPage() {
  const [targetIndustry, setTargetIndustry] = useState("");
  const [offer, setOffer] = useState("");
  const [tone, setTone] = useState<"professional" | "casual" | "bold">("professional");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sequence, setSequence] = useState<EmailSequence | null>(null);
  const canGenerate = targetIndustry.trim().length > 0 && offer.trim().length > 0;

  const generateSequence = async () => {
    setError(null);
    setSequence(null);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/cold-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetIndustry, offer, tone }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          payload?.error || "Failed to generate cold email sequence",
        );
      }
      const data = (await res.json()) as { sequence: unknown };
      const normalizedSequence = normalizeSequence(data.sequence);
      if (!normalizedSequence) {
        throw new Error(
          "AI response format was invalid. Please regenerate the sequence.",
        );
      }
      setSequence(normalizedSequence);
      toast.success("Cold email sequence generated");
    } catch (err) {
      console.error("[AI Services] sequence generation error", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      toast.error("Could not generate sequence");
    } finally {
      setLoading(false);
    }
  };

  const copyEmail = async (message: EmailMessage) => {
    await navigator.clipboard.writeText(`Subject: ${message.subject}\n\n${message.body}`);
    toast.success("Email copied to clipboard");
  };

  const sequenceEntries: Array<[string, EmailMessage]> = sequence
    ? [
        ["Initial", sequence.initial],
        ["Follow-up", sequence.followUp],
        ["Breakup", sequence.breakup],
      ]
    : [];

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-7xl p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">AI Services Hub</h1>
          <p className="text-muted-foreground">AI tools for outreach, creative, and growth workflows.</p>
        </div>

        <PlanGate requiredPlan="growth">
          <Card>
            <CardHeader>
              <CardTitle>All AI tools</CardTitle>
              <CardDescription>
                Everything you had before is still here. Open any AI workflow below.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Button asChild variant="outline">
                <Link href="/dashboard/content-pipeline">7-Day Content Pipeline</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/seo">SEO Hub</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/lead-gen">Lead Gen</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/viral-ideas">Viral Ideas</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/outreach/script-generator">AI Scripts</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/content">Content Tools</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cold Email Sequence Generator</CardTitle>
              <CardDescription>
                Generate initial, follow-up, and breakup emails with one click.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-background/40 p-4 text-sm text-muted-foreground">
                Enter the industry and your offer, choose a tone, then click generate. You will get
                3 ready-to-send emails: initial outreach, follow-up, and breakup.
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="targetIndustry">Target Industry</Label>
                  <Input
                    id="targetIndustry"
                    value={targetIndustry}
                    onChange={(event) => setTargetIndustry(event.target.value)}
                    placeholder="e.g. Realtors, Dentists, SaaS founders"
                  />
                  <p className="text-xs text-muted-foreground">Who you are reaching out to.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offer">Offer</Label>
                  <Input
                    id="offer"
                    value={offer}
                    onChange={(event) => setOffer(event.target.value)}
                    placeholder="e.g. Done-for-you lead generation system"
                  />
                  <p className="text-xs text-muted-foreground">What value you are pitching.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tone">Tone</Label>
                  <select
                    id="tone"
                    value={tone}
                    onChange={(event) => setTone(event.target.value as "professional" | "casual" | "bold")}
                    className="w-full border rounded-md bg-background px-3 py-2 text-sm"
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="bold">Bold</option>
                  </select>
                  <p className="text-xs text-muted-foreground">Controls how direct the copy sounds.</p>
                </div>
              </div>

              <Button onClick={generateSequence} disabled={loading || !canGenerate}>
                Generate Sequence
              </Button>
              {!canGenerate && !loading ? (
                <p className="text-xs text-muted-foreground">
                  Fill in both Target Industry and Offer to generate the sequence.
                </p>
              ) : null}

              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : null}

              {error ? <p className="text-sm text-red-500">{error}</p> : null}

              {!loading && !error && !sequence ? (
                <p className="text-sm text-muted-foreground">
                  No sequence yet. Enter your details above and click Generate Sequence.
                </p>
              ) : null}

              <div className="space-y-3">
                {sequenceEntries.map(([label, message]) => (
                  <Card key={label}>
                    <CardHeader>
                      <CardTitle className="text-base">{label}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm"><strong>Subject:</strong> {message.subject}</p>
                      <Textarea value={message.body} readOnly className="min-h-28" />
                      <Button variant="outline" onClick={() => copyEmail(message)}>
                        Copy Email
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </PlanGate>
      </div>
    </SideBar>
  );
}
