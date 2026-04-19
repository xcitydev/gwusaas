"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import SideBar from "@/components/SideBar";
import { useUser, useOrganization } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, Shield, Plug } from "lucide-react";

type KeyStatus = { hasKey: boolean; preview: string | null };
type MediaKeys = Record<string, KeyStatus>;

const MEDIA_KEY_FIELDS: Array<{ field: string; label: string; placeholder: string; description: string }> = [
  { field: "openaiApiKey", label: "OpenAI", placeholder: "sk-...", description: "DALL-E 3 & DALL-E 2 image generation" },
  { field: "stabilityApiKey", label: "Stability AI", placeholder: "sk-...", description: "Stable Diffusion image models" },
  { field: "replicateApiKey", label: "Replicate", placeholder: "r8_...", description: "FLUX, Kling, LTX, Wan, Hailuo, Veo 3" },
  { field: "runwayApiKey", label: "Runway ML", placeholder: "rw-...", description: "Runway Gen-4 Turbo video generation" },
  { field: "apifyApiKey", label: "Apify", placeholder: "apify_api_...", description: "Image search (Bing + Google)" },
];

function ApiKeyRow({
  label, description, fieldName, placeholder, hasKey, preview, onSaved,
}: {
  label: string; description: string; fieldName: string; placeholder: string;
  hasKey: boolean; preview: string | null; onSaved: () => void;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!value.trim()) return;
    setSaving(true);
    const res = await fetch("/api/user-api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [fieldName]: value }),
    });
    if (res.ok) {
      toast.success(`${label} key saved`);
      setValue("");
      onSaved();
    } else {
      toast.error(`Failed to save ${label} key`);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {hasKey ? (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">{preview}</Badge>
            <Badge className="bg-green-500 text-xs">Connected</Badge>
          </div>
        ) : (
          <Badge variant="destructive" className="text-xs">Not set</Badge>
        )}
      </div>
      <div className="flex gap-2">
        <Input type="password" placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} className="text-sm" />
        <Button size="sm" onClick={handleSave} disabled={saving || !value.trim()}>
          {saving ? "Saving…" : hasKey ? "Update" : "Save"}
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const [instagramHandle, setInstagramHandle] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [mediaKeys, setMediaKeys] = useState<MediaKeys>({});

  const loadMediaKeys = useCallback(() => {
    fetch("/api/user-api-keys").then((r) => r.json()).then(setMediaKeys).catch(() => {});
  }, []);

  useEffect(() => { loadMediaKeys(); }, [loadMediaKeys]);

  const { organization } = useOrganization();
  const convexOrg = useQuery(
    api.organization.getByClerkId,
    organization?.id ? { clerkOrgId: organization.id } : "skip"
  );
  
  const orgSettings = useQuery(
    api.settings.get,
    convexOrg?._id ? { organizationId: convexOrg._id } : "skip"
  );

  const setIgCreds = useMutation(api.settings.setIgCreds);

  useEffect(() => {
    if (orgSettings?.settings?.ig) {
      setInstagramHandle(orgSettings.settings.ig.instagramHandle || "");
      setAccessToken(orgSettings.settings.ig.accessToken || "");
    }
  }, [orgSettings]);

  const handleSaveIg = async () => {
    if (!convexOrg?._id) {
      toast.error("Organization not found");
      return;
    }

    try {
      await setIgCreds({
        organizationId: convexOrg._id,
        instagramHandle,
        accessToken,
      });
      toast.success("Instagram credentials updated");
    } catch (error: any) {
      toast.error(`Failed to update: ${error.message}`);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c79b09]"></div>
      </div>
    );
  }

  return (
    <SideBar>
      <div className="flex-1 space-y-4 p-8 pt-6 max-w-4xl mx-auto">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Manage your organization settings and integrations
          </p>
        </div>

        <Tabs defaultValue="instagram" className="space-y-4">
          <TabsList>
            <TabsTrigger value="instagram">Instagram</TabsTrigger>
            <TabsTrigger value="media-studio">Media Studio</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="webhook">Webhooks</TabsTrigger>
          </TabsList>

          <TabsContent value="instagram">
            <Card>
              <CardHeader>
                <CardTitle>Instagram Connection</CardTitle>
                <CardDescription>
                  Connect your Instagram account for official metrics via Meta Graph API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="handle">Instagram Handle</Label>
                  <Input
                    id="handle"
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value)}
                    placeholder="@yourhandle"
                  />
                </div>
                <div>
                  <Label htmlFor="token">Access Token (Optional)</Label>
                  <Input
                    id="token"
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="Meta Graph API access token"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Get this from Meta Developer Console
                  </p>
                </div>
                <Button onClick={handleSaveIg}>Save Credentials</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="media-studio">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plug className="h-4 w-4" /> Media Studio API Keys
                </CardTitle>
                <CardDescription>
                  Add keys for the providers you want to use in Media Studio. Each key unlocks different image and video models.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" /> Keys are stored securely and never exposed to the browser
                </div>
                {MEDIA_KEY_FIELDS.map((k, i) => (
                  <div key={k.field}>
                    {i > 0 && <Separator className="mb-6" />}
                    <ApiKeyRow
                      label={k.label}
                      description={k.description}
                      fieldName={k.field}
                      placeholder={k.placeholder}
                      hasKey={mediaKeys[k.field]?.hasKey ?? false}
                      preview={mediaKeys[k.field]?.preview ?? null}
                      onSaved={loadMediaKeys}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Team Management</CardTitle>
                <CardDescription>
                  Manage team members and their roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Team management is handled through Clerk Organizations.
                  Use the Clerk dashboard to invite members and assign roles.
                </p>
                <Button className="mt-4" variant="outline">
                  Open Clerk Dashboard
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhook">
            <Card>
              <CardHeader>
                <CardTitle>Webhook Configuration</CardTitle>
                <CardDescription>
                  Configure webhook secrets for Apify integration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label>Webhook Secret</Label>
                  <Input
                    value={process.env.NEXT_PUBLIC_WEBHOOK_SECRET || "Set in environment variables"}
                    disabled
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure WEBHOOK_APIFY_SECRET in your environment
                  </p>
                </div>
                <div className="mt-4">
                  <Label>Webhook URL</Label>
                  <Input
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/api/webhook/apify`}
                    disabled
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Use this URL in your Apify actor configuration
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SideBar>
  );
}
