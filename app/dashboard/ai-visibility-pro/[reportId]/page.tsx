"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ArrowLeft, Copy, FileJson, MessageSquare, Star, Globe, ListChecks } from "lucide-react";
import { toast } from "sonner";

import SideBar from "@/components/SideBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Report = {
  result: {
    queries: Array<{
      query: string;
      answer: string;
      contentBlock: {
        question: string;
        directAnswer: string;
        expanded: string;
        bullets?: string[];
      };
    }>;
    authority: {
      credibility: string[];
      differentiators: string[];
      trustSignals: string[];
    };
    faqs: Array<{ question: string; answer: string }>;
    externalSignals: {
      websites: string[];
      platforms: string[];
      prStrategies: string[];
    };
    visibilityScore: { score: number; explanation: string };
  };
  businessName: string;
  industry: string;
  audience: string;
  location?: string;
  services: string;
  createdAt: number;
};

export default function ReportPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = use(params);
  const report = useQuery(api.aiVisibilityPro.getReport, {
    reportId: reportId as Id<"aiVisibilityProReports">,
  }) as Report | null | undefined;

  const copyJson = () => {
    if (!report) return;
    navigator.clipboard.writeText(JSON.stringify(report.result, null, 2));
    toast.success("JSON copied to clipboard");
  };

  if (report === undefined) {
    return (
      <SideBar>
        <div className="mx-auto w-full max-w-5xl p-6 md:p-8">
          <p className="text-sm text-muted-foreground animate-pulse">Loading report...</p>
        </div>
      </SideBar>
    );
  }

  if (report === null) {
    return (
      <SideBar>
        <div className="mx-auto w-full max-w-5xl p-6 md:p-8 space-y-4">
          <p className="text-lg font-bold">Report not found.</p>
          <Link
            href="/dashboard/ai-visibility-pro"
            className="text-primary hover:underline text-sm font-bold"
          >
            ← Back to Get Found by AI
          </Link>
        </div>
      </SideBar>
    );
  }

  const { result } = report;

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-5xl p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <Link
              href="/dashboard/ai-visibility-pro"
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Back to Get Found by AI
            </Link>
            <h1 className="text-3xl font-black tracking-tight text-white/90">
              {report.businessName}
            </h1>
            <p className="text-xs text-muted-foreground">
              {report.industry} · {new Date(report.createdAt).toLocaleString()}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={copyJson}
            className="h-10 rounded-xl border-white/10 hover:bg-white/5 font-bold"
          >
            <FileJson className="w-4 h-4 mr-2" />
            Copy JSON
          </Button>
        </div>

        {/* Visibility Score */}
        <Card className="glass-card border-white/5 overflow-hidden shadow-card">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              Your AI Visibility Score
            </CardTitle>
            <CardDescription>How likely AI is to recommend your business right now.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="text-7xl font-black text-primary leading-none amber-glow">
                {result.visibilityScore.score}
                <span className="text-3xl text-muted-foreground">/100</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xl flex-1 min-w-[240px]">
                {result.visibilityScore.explanation}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Queries + Content Blocks */}
        <Card className="glass-card border-white/5 overflow-hidden shadow-card">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              High-Intent AI Queries ({result.queries.length})
            </CardTitle>
            <CardDescription>
              Questions people ask AI that should trigger your business as a recommendation.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8 space-y-6">
            {result.queries.map((q, idx) => (
              <div key={idx} className="space-y-3 p-5 rounded-2xl bg-white/5 border border-white/5">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold text-white/90 flex-1">{q.query}</p>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(q.answer);
                      toast.success("Answer copied");
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-primary transition"
                    aria-label="Copy answer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{q.answer}</p>

                <div className="pt-3 border-t border-white/5 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Optimized Content Block</p>
                  <p className="text-sm font-bold text-white/90">{q.contentBlock.question}</p>
                  <p className="text-sm text-muted-foreground">{q.contentBlock.directAnswer}</p>
                  <p className="text-xs text-muted-foreground italic">{q.contentBlock.expanded}</p>
                  {q.contentBlock.bullets && q.contentBlock.bullets.length > 0 && (
                    <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1 pt-1">
                      {q.contentBlock.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Authority Layer */}
        <Card className="glass-card border-white/5 overflow-hidden shadow-card">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-primary" />
              Brand Authority Layer
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 md:p-8 grid gap-6 md:grid-cols-3">
            <AuthorityList title="Credibility" items={result.authority.credibility} />
            <AuthorityList title="Differentiators" items={result.authority.differentiators} />
            <AuthorityList title="Trust Signals" items={result.authority.trustSignals} />
          </CardContent>
        </Card>

        {/* FAQs */}
        <Card className="glass-card border-white/5 overflow-hidden shadow-card">
          <CardHeader className="border-b border-white/5">
            <CardTitle>FAQs</CardTitle>
            <CardDescription>Add these to your site for better AI visibility.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8 space-y-4">
            {result.faqs.map((faq, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <p className="font-bold text-white/90">{faq.question}</p>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* External Signals */}
        <Card className="glass-card border-white/5 overflow-hidden shadow-card">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              External Signals
            </CardTitle>
            <CardDescription>Where to build mentions and authority off-site.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8 grid gap-6 md:grid-cols-3">
            <AuthorityList title="Websites" items={result.externalSignals.websites} />
            <AuthorityList title="Platforms" items={result.externalSignals.platforms} />
            <AuthorityList title="PR Strategies" items={result.externalSignals.prStrategies} />
          </CardContent>
        </Card>
      </div>
    </SideBar>
  );
}

function AuthorityList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-primary">{title}</p>
      <ul className="text-sm text-muted-foreground space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-primary mt-0.5">·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
