"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Sparkles, RefreshCw, FileSpreadsheet, Copy, Send } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type EmailStep = { subject: string; body: string };
type SmsStep = { body: string };
type Step = EmailStep | SmsStep;
type PersonalizedSet = Step[];

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] ?? "").trim();
    });
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function MailMergeCsv() {
  const { user } = useUser();
  const fileRef = useRef<HTMLInputElement>(null);
  const templates = useQuery(
    api.outreachTemplates.listTemplates,
    user?.id ? { clerkUserId: user.id } : "skip",
  );
  const [templateId, setTemplateId] = useState<string>("");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [csvName, setCsvName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<PersonalizedSet[] | null>(null);

  const template = useMemo(
    () => templates?.find((t) => t._id === templateId),
    [templates, templateId],
  );

  const columns = rows[0] ? Object.keys(rows[0]) : [];

  const onUpload = (file: File) => {
    setCsvName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        toast.error("CSV is empty or invalid");
        return;
      }
      if (parsed.length > 25) {
        toast.message(`Loaded ${parsed.length} rows — only first 25 will be personalized per run.`);
      }
      setRows(parsed.slice(0, 25));
      setResults(null);
    };
    reader.readAsText(file);
  };

  const personalize = async () => {
    if (!template || rows.length === 0) {
      toast.error("Pick a template and upload a CSV first");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/personalize-merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: template.channel,
          steps: template.steps,
          rows,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setResults(data.personalized);
      toast.success(`Personalized ${data.personalized.length} recipients`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const sendAll = async () => {
    if (!template || !results) return;
    const fieldKey = template.channel === "email" ? "email" : "phone";
    const recipients = results
      .map((set, i) => {
        const to = rows[i][fieldKey] ?? rows[i].to ?? rows[i].email ?? rows[i].phone;
        return to ? { to: String(to), steps: set } : null;
      })
      .filter((r): r is { to: string; steps: PersonalizedSet } => r !== null);

    if (recipients.length === 0) {
      toast.error(`No ${fieldKey} column found in CSV (or column "to" / "${fieldKey}")`);
      return;
    }

    if (!confirm(`Send ${template.channel.toUpperCase()} step 1 to ${recipients.length} recipients now?`)) {
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/send/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: template.channel,
          templateId: template._id,
          recipients,
          stepIndex: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Bulk send failed");
      toast.success(`Sent: ${data.sent}/${data.total}`);
      if (data.sent < data.total) {
        const failures = (data.results ?? []).filter((r: { ok: boolean }) => !r.ok);
        console.warn("Some sends failed", failures);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk send failed");
    } finally {
      setSending(false);
    }
  };

  const copyAll = () => {
    if (!results || !template) return;
    const blob = results
      .map((set, i) => {
        const header = `=== ${rows[i].name ?? rows[i].email ?? `Recipient ${i + 1}`} ===\n`;
        const body = set
          .map((step, idx) => {
            if (template.channel === "email") {
              const e = step as EmailStep;
              return `Step ${idx + 1} — ${e.subject}\n\n${e.body}`;
            }
            return `Step ${idx + 1}\n\n${(step as SmsStep).body}`;
          })
          .join("\n\n---\n\n");
        return header + body;
      })
      .join("\n\n========\n\n");
    navigator.clipboard.writeText(blob);
    toast.success("All variants copied");
  };

  return (
    <Card className="glass-card border-white/5 overflow-hidden">
      <CardHeader className="border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl font-black">CSV Mail Merge</CardTitle>
            <CardDescription>Upload leads, AI rewrites the sequence per recipient.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Saved template
            </label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className="bg-white/5 border-white/10 h-11">
                <SelectValue placeholder={templates?.length ? "Pick a saved template" : "No templates saved yet"} />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((t) => (
                  <SelectItem key={t._id} value={t._id}>
                    {t.channel === "email" ? "✉️" : "💬"} {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Leads CSV (max 25 rows)
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
              }}
            />
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              className="w-full h-11 justify-start border-white/10"
            >
              <Upload className="w-4 h-4 mr-2" />
              {csvName ? csvName : "Choose CSV…"}
            </Button>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="rounded-xl border border-white/5 bg-white/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Detected columns ({rows.length} rows)
              </span>
              <Badge variant="outline" className="text-[10px]">
                {columns.length} cols
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {columns.map((c) => (
                <Badge key={c} variant="secondary" className="text-[10px] bg-white/5">
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={personalize}
          disabled={loading || !template || rows.length === 0}
          className="w-full h-12 amber-glow font-black uppercase tracking-widest"
        >
          {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {loading ? "Personalizing…" : `Personalize ${rows.length || ""} Recipients`}
        </Button>

        {results && template && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-sm font-bold">{results.length} personalized variants</h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyAll}>
                  <Copy className="w-3.5 h-3.5 mr-2" /> Copy All
                </Button>
                <Button size="sm" onClick={sendAll} disabled={sending} className="amber-glow">
                  {sending ? (
                    <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5 mr-2" />
                  )}
                  {sending ? "Sending…" : `Send Step 1 to All`}
                </Button>
              </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto space-y-3 pr-2">
              {results.map((set, idx) => (
                <details key={idx} className="rounded-xl border border-white/5 bg-white/[0.03] p-4 group" open={idx < 2}>
                  <summary className="cursor-pointer text-xs font-bold flex items-center justify-between">
                    <span className="text-white/90">
                      {rows[idx]?.name ?? rows[idx]?.email ?? `Recipient ${idx + 1}`}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {set.length} steps
                    </Badge>
                  </summary>
                  <div className="mt-3 space-y-3">
                    {set.map((step, sIdx) => (
                      <div key={sIdx} className="p-3 rounded-lg bg-black/30 border border-white/5">
                        {template.channel === "email" && (
                          <p className="text-[11px] font-bold text-primary mb-1.5">
                            {(step as EmailStep).subject}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {step.body}
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
