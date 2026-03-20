"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ScrapeForm({
  sourceAccount,
  idealLeadDescription,
  limit,
  setSourceAccount,
  setIdealLeadDescription,
  setLimit,
  onStart,
  loading,
}: {
  sourceAccount: string;
  idealLeadDescription: string;
  limit: number;
  setSourceAccount: (value: string) => void;
  setIdealLeadDescription: (value: string) => void;
  setLimit: (value: number) => void;
  onStart: () => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Account to scrape</Label>
        <Input value={sourceAccount} onChange={(e) => setSourceAccount(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>What are we looking for?</Label>
        <Textarea
          rows={3}
          value={idealLeadDescription}
          onChange={(e) => setIdealLeadDescription(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {[500, 1000, 2500, 5000].map((size) => (
          <Button
            key={size}
            variant={limit === size ? "default" : "outline"}
            onClick={() => setLimit(size)}
          >
            {size.toLocaleString()}
          </Button>
        ))}
      </div>
      <Button disabled={loading} onClick={onStart}>
        {loading ? "Scraping followers..." : "Start scraping"}
      </Button>
    </div>
  );
}
