"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Config = {
  agencyName: string;
  platformName: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  supportEmail?: string;
};

type Props = {
  initial: Config | null;
  userId: string;
  onSaved: () => void;
};

export function BrandingTab({ initial, userId, onSaved }: Props) {
  const [form, setForm] = useState<Config>({
    agencyName: initial?.agencyName || "",
    platformName: initial?.platformName || "",
    logoUrl: initial?.logoUrl || "",
    faviconUrl: initial?.faviconUrl || "",
    primaryColor: initial?.primaryColor || "#6C3BFF",
    secondaryColor: initial?.secondaryColor || "#1ACBA0",
    supportEmail: initial?.supportEmail || "",
  });
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/whitelabel/save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...form }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(payload?.error || "Failed to save");
      toast.success("White-label branding saved");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Agency name</Label>
            <Input
              value={form.agencyName}
              onChange={(e) => setForm((prev) => ({ ...prev, agencyName: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Platform name</Label>
            <Input
              value={form.platformName}
              onChange={(e) => setForm((prev) => ({ ...prev, platformName: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Logo URL</Label>
            <Input
              value={form.logoUrl || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, logoUrl: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Favicon URL</Label>
            <Input
              value={form.faviconUrl || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, faviconUrl: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Primary color</Label>
              <Input
                value={form.primaryColor}
                onChange={(e) => setForm((prev) => ({ ...prev, primaryColor: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Secondary color</Label>
              <Input
                value={form.secondaryColor}
                onChange={(e) => setForm((prev) => ({ ...prev, secondaryColor: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Support email</Label>
            <Input
              value={form.supportEmail || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, supportEmail: e.target.value }))}
            />
          </div>
          <Button
            onClick={() => void save()}
            disabled={loading || !form.platformName || !form.agencyName}
          >
            {loading ? "Saving..." : "Save branding"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border p-4" style={{ borderColor: form.secondaryColor }}>
            <div className="flex items-center gap-3">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt={form.platformName} className="h-8 w-8 rounded" />
              ) : (
                <div
                  className="h-8 w-8 rounded flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: form.primaryColor }}
                >
                  {form.platformName.charAt(0) || "B"}
                </div>
              )}
              <p className="font-semibold">{form.platformName || "Your Platform"}</p>
            </div>
            <div className="mt-4 grid gap-2">
              <div className="rounded-md px-3 py-2 text-sm" style={{ backgroundColor: `${form.primaryColor}22` }}>
                Dashboard
              </div>
              <div className="rounded-md px-3 py-2 text-sm" style={{ backgroundColor: `${form.secondaryColor}22` }}>
                Content Pipeline
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
