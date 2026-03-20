"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Props = {
  userId: string;
  currentDomain?: string;
  domainVerified?: boolean;
  onSaved: () => void;
};

export function CustomDomainTab({ userId, currentDomain, domainVerified, onSaved }: Props) {
  const [domain, setDomain] = useState(currentDomain || "");
  const [txtRecord, setTxtRecord] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const createVerification = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/whitelabel/domain-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, domain }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { txtRecord?: string; error?: string }
        | null;
      if (!res.ok) throw new Error(payload?.error || "Failed to create record");
      setTxtRecord(payload?.txtRecord || "");
      toast.success("DNS verification record generated");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setVerifying(true);
    try {
      const res = await fetch("/api/whitelabel/verify-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { verified?: boolean; message?: string; expectedTxtRecord?: string; error?: string }
        | null;
      if (!res.ok) throw new Error(payload?.error || "Verification failed");
      if (payload?.verified) {
        toast.success("Domain verified and now live");
        onSaved();
      } else {
        setTxtRecord(payload?.expectedTxtRecord || txtRecord);
        toast.message(payload?.message || "Still pending verification");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Domain</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Custom domain</Label>
          <Input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="app.theiragency.com"
          />
        </div>
        <Button onClick={() => void createVerification()} disabled={!domain || loading}>
          {loading ? "Generating..." : "Generate TXT record"}
        </Button>
        {txtRecord ? (
          <div className="rounded-lg border p-3 text-sm space-y-1">
            <p>Add this TXT record to your DNS:</p>
            <p>
              <strong>Type:</strong> TXT
            </p>
            <p>
              <strong>Host:</strong> @
            </p>
            <p className="break-all">
              <strong>Value:</strong> {txtRecord}
            </p>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void verify()} disabled={!domain || verifying}>
            {verifying ? "Verifying..." : "Verify domain"}
          </Button>
          {domainVerified ? <Badge className="bg-emerald-500/20 text-emerald-300">Verified</Badge> : null}
        </div>
      </CardContent>
    </Card>
  );
}
