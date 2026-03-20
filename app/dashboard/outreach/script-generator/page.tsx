"use client";

import { useState } from "react";
import SideBar from "@/components/SideBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Variation = { script: string };

export default function ScriptGeneratorPage() {
  const [what, setWhat] = useState("");
  const [who, setWho] = useState("");
  const [goal, setGoal] = useState("Book a call");
  const [tone, setTone] = useState("Friendly & casual");
  const [loading, setLoading] = useState(false);
  const [scripts, setScripts] = useState<Variation[]>([]);

  const generate = async () => {
    setLoading(true);
    setScripts([]);
    try {
      const res = await fetch("/api/scripts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ what, who, goal, tone }),
      });
      const payload = (await res.json()) as {
        scripts?: Variation[];
        error?: string;
      };
      if (!res.ok) throw new Error(payload.error || "Failed to generate scripts");
      setScripts(payload.scripts || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-6xl space-y-6 p-6 md:p-8">
        <div>
          <h1 className="text-3xl font-bold">Write a DM script with AI</h1>
          <p className="text-muted-foreground">
            Tell us about your client and goal. We will draft scripts for you.
          </p>
        </div>

        <Card>
          <CardContent className="grid gap-4 p-6 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>What does your client do?</Label>
              <Input value={what} onChange={(e) => setWhat(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Who are they trying to reach?</Label>
              <Input value={who} onChange={(e) => setWho(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Goal</Label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Book a call">Book a call</SelectItem>
                  <SelectItem value="Get a reply">Get a reply</SelectItem>
                  <SelectItem value="Drive to link">Drive to link</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Friendly & casual">Friendly & casual</SelectItem>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="Direct & bold">Direct & bold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="md:col-span-2"
              disabled={loading || !what || !who}
              onClick={() => void generate()}
            >
              {loading ? "Generating..." : "Generate script"}
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          {scripts.map((item, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-base">Variation {index + 1}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm whitespace-pre-wrap">{item.script}</p>
                <p className="text-xs text-muted-foreground">
                  {item.script.split(/\s+/).filter(Boolean).length} words
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(item.script).then(() => {
                      toast.success("Script copied");
                    });
                  }}
                >
                  Use this script
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </SideBar>
  );
}
