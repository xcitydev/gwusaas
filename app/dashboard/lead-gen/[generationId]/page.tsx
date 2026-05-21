"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import SideBar from "@/components/SideBar";
import { PlanGate } from "@/components/PlanGate";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type NormalizedLead = {
  name: string;
  email: string;
  phone: string;
  company: string;
  location: string;
  linkedin: string;
};

function pickString(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function normalizeLeadRow(item: unknown): NormalizedLead {
  if (!item || typeof item !== "object") {
    return {
      name: "",
      email: "",
      phone: "",
      company: "",
      location: "",
      linkedin: "",
    };
  }
  const row = item as Record<string, unknown>;
  return {
    name: pickString(row, "name", "contactName"),
    email: pickString(row, "email"),
    phone: pickString(row, "phone"),
    company: pickString(row, "company"),
    location: pickString(row, "location"),
    linkedin: pickString(row, "linkedin", "linkedinUrl", "linkedIn"),
  };
}

function downloadCsv(rows: NormalizedLead[]) {
  if (rows.length === 0) return;
  const headers = ["name", "email", "phone", "company", "location", "linkedin"];
  const lines = [
    headers.join(","),
    ...rows.map((lead) =>
      headers
        .map((key) => {
          const value = String((lead as Record<string, unknown>)[key] ?? "");
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(href);
}

const RUN_TYPE_LABEL: Record<string, string> = {
  "lead-gen-vibe": "Vibe Prospecting",
  "lead-gen-scrape": "Apify Scrape",
  "lead-gen-strategy": "Lead Strategy",
};

export default function LeadGenRunPage() {
  const params = useParams<{ generationId: string }>();
  const { user } = useUser();
  const generationId = params.generationId as Id<"aiGenerations">;

  const run = useQuery(
    api.aiHistory.getAiGenerationById,
    user?.id ? { userId: user.id, generationId } : "skip",
  );

  const normalizedLeads = useMemo<NormalizedLead[]>(() => {
    if (!run || !Array.isArray(run.output)) return [];
    return (run.output as unknown[]).map(normalizeLeadRow);
  }, [run]);

  const metadataEntries = useMemo<Array<{ key: string; value: string }>>(() => {
    if (!run || !run.input || typeof run.input !== "object") return [];
    return Object.entries(run.input as Record<string, unknown>)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => ({
        key,
        value:
          typeof value === "string" ? value : JSON.stringify(value),
      }));
  }, [run]);

  const runLabel = run?.type ? RUN_TYPE_LABEL[run.type] ?? run.type : "";
  const sourceBadge =
    run?.type === "lead-gen-vibe"
      ? { label: "via Vibe Prospecting", className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" }
      : { label: "via Apify", className: "bg-amber-500/10 text-amber-300 border-amber-500/20" };

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 md:p-8 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold">Lead Gen Run</h1>
            <p className="text-sm text-muted-foreground">
              Inspect a saved lead generation run.
            </p>
          </div>
          <Button asChild variant="outline" className="self-start sm:self-auto">
            <Link href="/dashboard/lead-gen">Back to Lead Gen</Link>
          </Button>
        </div>

        <PlanGate requiredPlan="growth">
          {run === undefined ? (
            <Skeleton className="h-48 w-full" />
          ) : run === null ? (
            <Card>
              <CardHeader>
                <CardTitle>Run not found</CardTitle>
                <CardDescription>
                  This lead gen run does not exist or access is restricted.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Run Metadata</CardTitle>
                  <CardDescription>
                    {runLabel} · {new Date(run.createdAt).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {metadataEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No input parameters recorded.
                    </p>
                  ) : (
                    <dl className="grid gap-3 sm:grid-cols-2">
                      {metadataEntries.map(({ key, value }) => (
                        <div
                          key={key}
                          className="rounded-lg border border-white/5 bg-white/2 px-3 py-2 min-w-0"
                        >
                          <dt className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {key}
                          </dt>
                          <dd className="text-sm text-foreground/90 mt-0.5 wrap-break-word">
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle>Run Output</CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-2">
                        <span>
                          {normalizedLeads.length} result
                          {normalizedLeads.length === 1 ? "" : "s"}
                        </span>
                        {normalizedLeads.length > 0 && (
                          <span
                            className={
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border " +
                              sourceBadge.className
                            }
                          >
                            {sourceBadge.label}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    {normalizedLeads.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadCsv(normalizedLeads)}
                      >
                        Export CSV
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {normalizedLeads.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      This run produced no leads.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-md border border-white/10 bg-[#0f0f0f]">
                      <table className="w-full text-sm">
                        <thead className="bg-white/2 text-xs uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">
                              Name
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                              Email
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                              Phone
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                              Company
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                              Location
                            </th>
                            <th className="px-3 py-2 text-left font-medium">
                              LinkedIn
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {normalizedLeads.map((lead, idx) => (
                            <tr
                              key={`${lead.email || lead.name || "lead"}-${idx}`}
                              className="border-t border-white/5 hover:bg-white/2"
                            >
                              <td className="px-3 py-2 align-top">
                                {lead.name || "—"}
                              </td>
                              <td className="px-3 py-2 align-top">
                                {lead.email ? (
                                  <a
                                    href={`mailto:${lead.email}`}
                                    className="text-amber-300 hover:underline break-all"
                                  >
                                    {lead.email}
                                  </a>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="px-3 py-2 align-top whitespace-nowrap">
                                {lead.phone || "—"}
                              </td>
                              <td className="px-3 py-2 align-top">
                                {lead.company || "—"}
                              </td>
                              <td className="px-3 py-2 align-top">
                                {lead.location || "—"}
                              </td>
                              <td className="px-3 py-2 align-top">
                                {lead.linkedin ? (
                                  <a
                                    href={lead.linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-400 hover:underline"
                                  >
                                    Profile
                                  </a>
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </PlanGate>
      </div>
    </SideBar>
  );
}
