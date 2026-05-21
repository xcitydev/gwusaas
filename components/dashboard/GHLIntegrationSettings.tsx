"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, Loader2, PlugZap, Unplug } from "lucide-react";

const GHL_AFFILIATE_SIGNUP_URL =
  "https://www.gohighlevel.com/dre-medici?fp_ref=grow-with-us-agency73";

type ConnectionStatus = {
  locationId: string;
  locationName: string;
  isActive: boolean;
  signupSource?: string;
  hasApiKey: boolean;
  createdAt: number;
} | null;

export function GHLIntegrationSettings() {
  const [status, setStatus] = useState<ConnectionStatus>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [locationId, setLocationId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const refreshStatus = async () => {
    try {
      const res = await fetch("/api/ghl/connection-status", { cache: "no-store" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load status");
      setStatus(json.data as ConnectionStatus);
    } catch (error) {
      console.error(error);
      toast.error("Could not load GHL connection status");
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleConnect = async () => {
    if (!apiKey.trim() || !locationId.trim()) {
      toast.error("Enter both your GHL API key and Location ID");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/ghl/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          locationId: locationId.trim(),
          signupSource: "existing",
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to connect");
      }
      toast.success(`Connected to ${json.data.locationName}`);
      setApiKey("");
      setLocationId("");
      await refreshStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection failed";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/ghl/disconnect", { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to disconnect");
      toast.success("GoHighLevel disconnected");
      await refreshStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Disconnect failed";
      toast.error(message);
    } finally {
      setDisconnecting(false);
    }
  };

  if (loadingStatus) {
    return (
      <Card className="glass-card border-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/5">
          <CardTitle>GoHighLevel Integration</CardTitle>
          <CardDescription>Loading connection status…</CardDescription>
        </CardHeader>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (status?.isActive) {
    return (
      <Card className="glass-card border-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>GoHighLevel Integration</CardTitle>
              <CardDescription>
                Your GHL sub-account is connected and syncing.
              </CardDescription>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Location Name
              </Label>
              <p className="text-sm mt-1">{status.locationName}</p>
            </div>
            <div>
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Location ID
              </Label>
              <p className="text-sm mt-1 font-mono">{status.locationId}</p>
            </div>
            <div>
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Connected On
              </Label>
              <p className="text-sm mt-1">
                {new Date(status.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                API Key
              </Label>
              {status.hasApiKey ? (
                <p className="text-sm mt-1 text-emerald-400">Encrypted on file</p>
              ) : (
                <p className="text-sm mt-1 text-amber-400">
                  Connected (legacy record). No reconnect needed unless GHL actions fail.
                </p>
              )}
            </div>
          </div>

          <Separator className="bg-white/5" />

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="font-bold uppercase tracking-widest text-xs"
            >
              {disconnecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Unplug className="h-4 w-4 mr-2" />
              )}
              Disconnect
            </Button>
            <Button
              variant="outline"
              asChild
              className="font-bold uppercase tracking-widest text-xs border-white/10"
            >
              <a
                href="https://app.gohighlevel.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open GoHighLevel
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-white/5 overflow-hidden">
      <CardHeader className="border-b border-white/5">
        <CardTitle>GoHighLevel Integration</CardTitle>
        <CardDescription>
          Connect your GoHighLevel sub-account to sync contacts, pipelines, and
          opportunities into the platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-8 space-y-6">
        <div className="space-y-2">
          <Label
            htmlFor="ghl-api-key"
            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
          >
            GHL API Key
          </Label>
          <Input
            id="ghl-api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste your Private Integration / Location API key"
            className="bg-white/5 border-white/10 h-11 font-mono"
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            Found in GHL → Settings → Private Integrations (or Settings → Business
            Profile → API Key for legacy).
          </p>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="ghl-location-id"
            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
          >
            Location ID
          </Label>
          <Input
            id="ghl-location-id"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            placeholder="e.g. ve9EPM428h8vShlRW1KT"
            className="bg-white/5 border-white/10 h-11 font-mono"
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            GHL → Settings → Business Profile → copy the Location/Sub-Account ID.
          </p>
        </div>

        <div className="pt-2">
          <Button
            onClick={handleConnect}
            disabled={submitting}
            className="w-full md:w-auto px-8 h-11 amber-glow font-bold uppercase tracking-widest text-xs"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <PlugZap className="h-4 w-4 mr-2" />
            )}
            Connect GoHighLevel
          </Button>
        </div>

        <Separator className="bg-white/5" />

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
          <div>
            <h4 className="font-black uppercase tracking-widest text-xs text-primary">
              Don&apos;t have a GoHighLevel account yet?
            </h4>
            <p className="text-sm text-muted-foreground mt-2">
              Spin one up in a few minutes — sign up through our partner link below
              and your sub-account will be ready to connect right after.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="border-primary/40 text-primary hover:bg-primary/10 font-bold uppercase tracking-widest text-xs"
          >
            <a
              href={GHL_AFFILIATE_SIGNUP_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Sign up for GoHighLevel
              <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
