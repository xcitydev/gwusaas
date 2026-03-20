"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState<"agency" | "client" | "freelancer">("agency");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [count, setCount] = useState<number>(37);

  useEffect(() => {
    const loadCount = async () => {
      const res = await fetch("/api/waitlist", { method: "GET" });
      const payload = (await res.json().catch(() => null)) as { count?: number } | null;
      if (res.ok && typeof payload?.count === "number") {
        setCount(payload.count);
      }
    };
    void loadCount();
  }, []);

  const submit = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, userType }),
      });
      const payload = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(payload.error || "Failed to join waitlist");
      setMessage(payload.message || "You're on the list. We'll be in touch soon.");
      if (payload.message?.includes("already")) return;
      setCount((prev) => prev + 1);
      setEmail("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to join waitlist");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="waitlist" className="ai-reveal" style={{ animationDelay: "180ms" }}>
      <Card className="border-[#2B2B30] bg-[#17171C]">
        <CardHeader className="text-center">
          <CardTitle className="font-syne text-4xl text-[#F0F0F5]">
            Be the first to get access
          </CardTitle>
          <p className="text-[#B4B4BE]">
            We&apos;re rolling out to a limited number of agencies first. Join the waitlist and
            we&apos;ll reach out personally.
          </p>
        </CardHeader>
        <CardContent className="mx-auto w-full max-w-xl space-y-3">
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@agency.com"
            className="h-11 border-[#3C3C43] bg-[#111114] text-[#F0F0F5]"
          />
          <Select
            value={userType}
            onValueChange={(value) => setUserType(value as "agency" | "client" | "freelancer")}
          >
            <SelectTrigger className="h-11 border-[#3C3C43] bg-[#111114] text-[#F0F0F5]">
              <SelectValue placeholder="I am a..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="agency">Agency owner</SelectItem>
              <SelectItem value="client">Direct client</SelectItem>
              <SelectItem value="freelancer">Freelancer</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="h-11 w-full bg-[#F5A623] text-black hover:bg-[#FFD166]"
            disabled={submitting || !email.trim()}
            onClick={() => void submit()}
          >
            {submitting ? "Joining..." : "Join waitlist"}
          </Button>
          {message ? <p className="text-center text-sm text-[#D3D3DE]">{message}</p> : null}
          <div className="pt-2 text-center">
            <p className="text-sm text-[#A9A9B6]">{count + 200} agencies already on the waitlist</p>
            <div className="mt-3 flex items-center justify-center -space-x-2">
              {["AM", "BK", "CD", "ES", "FT"].map((name, idx) => (
                <span
                  key={name}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#111114] text-xs font-semibold text-[#F0F0F5]"
                  style={{
                    backgroundColor: ["#54412A", "#2F4A5A", "#6B3A3A", "#3F5E40", "#444460"][idx],
                  }}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
