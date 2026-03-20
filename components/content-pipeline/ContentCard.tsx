"use client";

import { useMemo, useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ContentCardProps {
  platform: string;
  dayNumber: number;
  topicTitle: string;
  topicAngle: string;
  contentType: string;
  content: string;
  imageUrl?: string;
  status: "draft" | "approved" | "exported" | "error";
  onApprove: () => void;
  onRegenerate: () => void;
}

function toLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function ContentCard({
  platform,
  dayNumber,
  topicTitle,
  topicAngle,
  contentType,
  content,
  imageUrl,
  status,
  onApprove,
  onRegenerate,
}: ContentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const preview = useMemo(() => {
    if (content.length <= 180) return content;
    return `${content.slice(0, 180)}...`;
  }, [content]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Copy failed", error);
    }
  };

  return (
    <Card className="border-border/80 bg-card/60">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{toLabel(platform)}</Badge>
          <Badge variant="outline">Day {dayNumber}</Badge>
          <Badge variant="outline">{toLabel(contentType)}</Badge>
          <Badge
            variant={status === "approved" ? "default" : "secondary"}
            className={status === "error" ? "bg-red-500/20 text-red-300" : ""}
          >
            {toLabel(status)}
          </Badge>
        </div>
        <CardTitle className="text-base">{topicTitle}</CardTitle>
        <p className="text-xs text-muted-foreground">{topicAngle}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm whitespace-pre-wrap">{expanded ? content : preview}</p>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${topicTitle} visual`}
            className="h-40 w-full rounded-md border border-border/70 object-cover"
          />
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setExpanded((prev) => !prev)}>
            {expanded ? "Collapse" : "Expand"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handleCopy()}>
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          {status !== "approved" && status !== "error" ? (
            <Button size="sm" onClick={onApprove}>
              Approve
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={onRegenerate}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
