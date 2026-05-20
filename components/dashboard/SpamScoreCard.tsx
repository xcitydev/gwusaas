"use client";

import { useMemo } from "react";
import { ShieldCheck, ShieldAlert, Sparkles, CheckCircle2, AlertTriangle, Lightbulb } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Email = {
  subject: string;
  body: string;
};

type Props = {
  emails: Email[];
};

const SPAM_TRIGGER_WORDS = [
  "free", "guarantee", "risk free", "make money", "passive income", "act now", "100%",
  "earn", "cash", "limited time", "opportunity", "urgent", "no catch", "click here",
  "best price", "double your", "cancel at any time", "risk-free", "get paid",
  "investment", "money back", "winner", "cheap", "extra cash", "increase sales",
  "make $", "dollar", "secret", "hidden", "no cost", "pure profit", "unlimited"
];

export function SpamScoreCard({ emails }: Props) {
  const reports = useMemo(() => {
    return emails.map((email, index) => {
      const subject = email.subject.toLowerCase();
      const body = email.body.toLowerCase();
      
      const foundWords: string[] = [];
      SPAM_TRIGGER_WORDS.forEach(word => {
        if (subject.includes(word) || body.includes(word)) {
          foundWords.push(word);
        }
      });

      // Checks
      const hasCapsSubject = email.subject === email.subject.toUpperCase() && email.subject.length > 5;
      const exclamationCount = (email.body.match(/!/g) || []).length;
      const tooManyExclamations = exclamationCount > 2;
      const wordCount = email.body.split(/\s+/).filter(Boolean).length;
      const isTooLong = wordCount > 150;
      const isTooShort = wordCount < 30;

      // Score deduction calculation (starts at 100)
      let score = 100;
      const issues: { type: "critical" | "warning" | "info"; message: string }[] = [];

      if (foundWords.length > 0) {
        score -= foundWords.length * 12;
        issues.push({
          type: "critical",
          message: `Spam-trigger words detected: ${foundWords.map(w => `"${w}"`).join(", ")}.`
        });
      }

      if (hasCapsSubject) {
        score -= 20;
        issues.push({
          type: "warning",
          message: "Subject line is all-caps. This triggers spam filters instantly."
        });
      }

      if (tooManyExclamations) {
        score -= 15;
        issues.push({
          type: "warning",
          message: `High exclamation mark count (${exclamationCount} found). Keeps it conversational without spamming exclamation points.`
        });
      }

      if (isTooLong) {
        score -= 10;
        issues.push({
          type: "info",
          message: `Email body is a bit long (${wordCount} words). Aim for 50-125 words for better mobile engagement.`
        });
      } else if (isTooShort) {
        score -= 5;
        issues.push({
          type: "info",
          message: `Email body is very short (${wordCount} words). Ensure you clearly state your value proposition.`
        });
      }

      score = Math.max(10, Math.min(100, score));

      // Grade
      let grade = "A+";
      let colorClass = "text-emerald-400 border-emerald-500/20 bg-emerald-500/10 shadow-[0_0_15px_-3px_rgba(52,211,153,0.2)]";
      if (score >= 90) {
        grade = "A";
      } else if (score >= 80) {
        grade = "B";
        colorClass = "text-yellow-400 border-yellow-500/20 bg-yellow-500/10 shadow-[0_0_15px_-3px_rgba(250,204,21,0.2)]";
      } else if (score >= 70) {
        grade = "C";
        colorClass = "text-orange-400 border-orange-500/20 bg-orange-500/10 shadow-[0_0_15px_-3px_rgba(251,146,60,0.2)]";
      } else {
        grade = "D";
        colorClass = "text-red-400 border-red-500/20 bg-red-500/10 shadow-[0_0_15px_-3px_rgba(248,113,113,0.2)]";
      }

      return {
        stepName: index === 0 ? "Initial Outreach" : index === 1 ? "Follow-Up #1" : "The Breakup",
        score,
        grade,
        colorClass,
        issues,
      };
    });
  }, [emails]);

  const averageScore = Math.round(reports.reduce((acc, r) => acc + r.score, 0) / reports.length);
  const overallGrade = averageScore >= 90 ? "A" : averageScore >= 80 ? "B" : averageScore >= 70 ? "C" : "D";
  const overallColor = 
    averageScore >= 90 ? "text-emerald-400 from-emerald-500/10 to-transparent border-emerald-500/10" : 
    averageScore >= 80 ? "text-yellow-400 from-yellow-500/10 to-transparent border-yellow-500/10" :
    averageScore >= 70 ? "text-orange-400 from-orange-500/10 to-transparent border-orange-500/10" :
    "text-red-400 from-red-500/10 to-transparent border-red-500/10";

  return (
    <Card className="glass-card border-white/5 overflow-hidden">
      <CardHeader className="border-b border-white/5 bg-white/5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-black">AI Deliverability & Spam Score Audit</CardTitle>
              <CardDescription>We analyzed your sequence content to predict inbox placement rates.</CardDescription>
            </div>
          </div>
          <Badge className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest bg-gradient-to-r ${overallColor} border`}>
            Overall Grade: {overallGrade} ({averageScore}%)
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6 md:p-8 space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          {reports.map((report, idx) => (
            <div key={idx} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {report.stepName}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${report.colorClass}`}>
                  {report.grade}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white/70">Deliverability Index</span>
                  <span className="font-mono text-primary font-bold">{report.score}/100</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full rounded-full transition-all duration-500" 
                    style={{ width: `${report.score}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/5">
                {report.issues.length === 0 ? (
                  <div className="flex items-start gap-2 text-emerald-400/90">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-medium leading-relaxed">
                      Clean email content! Great subject line and natural body text.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {report.issues.map((issue, i) => (
                      <div key={i} className="flex items-start gap-2">
                        {issue.type === "critical" ? (
                          <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        ) : issue.type === "warning" ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                        ) : (
                          <Lightbulb className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        )}
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {issue.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
