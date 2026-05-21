"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Coins, FileText, Search } from "lucide-react";

import SideBar from "@/components/SideBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const labelCls = "text-xs font-black uppercase tracking-widest text-muted-foreground ml-1";
const inputCls = "h-12 bg-white/5 border-white/5 rounded-xl px-4 font-medium focus:ring-primary/20";
const textareaCls = "bg-white/5 border-white/5 rounded-2xl p-4 font-medium focus:ring-primary/20";

export default function AiVisibilityProPage() {
  const router = useRouter();
  const credits = useQuery(api.aiVisibilityPro.getMyCredits, {});
  const reports = useQuery(api.aiVisibilityPro.listMyReports, { limit: 25 });

  const [form, setForm] = useState({
    businessName: "",
    industry: "",
    audience: "",
    location: "",
    services: "",
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const creditsValue = credits?.credits ?? null;

  const handleGenerate = async () => {
    if (!form.businessName.trim() || !form.industry.trim() || !form.audience.trim() || !form.services.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (creditsValue !== null && creditsValue <= 0) {
      toast.error("You're out of credits. Purchase more to keep generating.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai-visibility-pro/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          toast.error("You're out of credits.");
        } else {
          toast.error(json?.error || "Failed to generate report");
        }
        return;
      }
      toast.success("Report generated!");
      router.push(`/dashboard/ai-visibility-pro/${json.reportId}`);
    } catch (err) {
      console.error(err);
      toast.error("Network error. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-6xl p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest">
              <Sparkles className="w-4 h-4" />
              <span>Get Found by AI</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white/90">
              Get Recommended by AI
            </h1>
            <p className="text-muted-foreground font-medium max-w-2xl">
              Run a check to see how your business shows up when people ask ChatGPT, Perplexity, and Google AI for recommendations — and get the content to fix it.
            </p>
          </div>

          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-primary/10 border border-primary/20 amber-glow">
            <Coins className="w-5 h-5 text-primary" />
            <div className="space-y-0.5">
              <div className="text-[10px] font-black uppercase tracking-widest text-primary">Credits</div>
              <div className="text-2xl font-black text-white/90 leading-none">
                {creditsValue === null ? "—" : creditsValue}
              </div>
            </div>
          </div>
        </div>

        {/* Generate Form */}
        <Card className="glass-card border-white/5 overflow-hidden shadow-card">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              Run a New Visibility Check
            </CardTitle>
            <CardDescription>1 credit per check. We save every result so you can come back later.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={labelCls}>Business Name</Label>
                <Input
                  className={inputCls}
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  placeholder="Grow With Us Agency"
                />
              </div>
              <div className="space-y-2">
                <Label className={labelCls}>Industry</Label>
                <Input
                  className={inputCls}
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  placeholder="Digital Marketing"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className={labelCls}>Target Audience</Label>
              <Input
                className={inputCls}
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value })}
                placeholder="Realtors and local business owners"
              />
            </div>

            <div className="space-y-2">
              <Label className={labelCls}>Location (optional)</Label>
              <Input
                className={inputCls}
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Austin, TX"
              />
            </div>

            <div className="space-y-2">
              <Label className={labelCls}>Services / Products</Label>
              <Textarea
                className={`${textareaCls} min-h-[120px]`}
                value={form.services}
                onChange={(e) => setForm({ ...form, services: e.target.value })}
                placeholder={"lead generation\nmarketing\nSEO consulting"}
              />
            </div>

            <div className="flex items-center justify-between pt-2 gap-4 flex-wrap">
              <p className="text-[11px] text-muted-foreground italic">
                Costs 1 credit. {creditsValue !== null && creditsValue > 0 ? `${creditsValue} remaining.` : "Out of credits."}
              </p>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || (creditsValue !== null && creditsValue <= 0)}
                className="h-12 px-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-lg amber-glow"
              >
                {isGenerating ? "Checking..." : (
                  <span className="flex items-center gap-2">Show Me What AI Says <ArrowRight className="w-4 h-4" /></span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report History */}
        <Card className="glass-card border-white/5 overflow-hidden shadow-card">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              My Past Checks
            </CardTitle>
            <CardDescription>Click any check to view, copy, or share.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            {reports === undefined && (
              <p className="text-sm text-muted-foreground">Loading...</p>
            )}
            {reports !== undefined && reports.length === 0 && (
              <div className="text-center py-12 space-y-2">
                <p className="text-muted-foreground font-medium">No checks yet.</p>
                <p className="text-xs text-muted-foreground">Run your first check above.</p>
              </div>
            )}
            {reports !== undefined && reports.length > 0 && (
              <ul className="divide-y divide-white/5">
                {reports.map((r) => (
                  <motion.li
                    key={r._id}
                    whileHover={{ x: 4 }}
                    className="py-4"
                  >
                    <Link
                      href={`/dashboard/ai-visibility-pro/${r._id}`}
                      className="flex items-center justify-between gap-4 group"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-white/90 group-hover:text-primary transition-colors">
                          {r.businessName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {r.industry} · {new Date(r.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                  </motion.li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </SideBar>
  );
}
