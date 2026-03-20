"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SignUpButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type InviteDetails = {
  clientName: string;
  clientEmail: string;
  branding?: {
    agencyName: string;
    platformName: string;
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
  } | null;
};

export default function JoinPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, isSignedIn } = useUser();
  const token = params.get("token") || "";
  const [details, setDetails] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/whitelabel/invite-detail?token=${encodeURIComponent(token)}`);
      const payload = (await res.json().catch(() => null)) as InviteDetails | null;
      if (!cancelled) {
        setDetails(payload);
        setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const acceptInvite = async () => {
    if (!token || !user?.id) return;
    setAccepting(true);
    try {
      const res = await fetch("/api/whitelabel/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteToken: token, clerkUserId: user.id }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(payload?.error || "Could not accept invite");
      toast.success("Invite accepted");
      router.push("/client-portal");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not accept invite");
    } finally {
      setAccepting(false);
    }
  };

  const platformName = details?.branding?.platformName || "Your Agency Portal";

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{platformName}</CardTitle>
          <CardDescription>Join your agency client portal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading invite...</p>
          ) : !token ? (
            <p className="text-sm text-red-400">Missing invite token.</p>
          ) : (
            <>
              <p className="text-sm">
                Invited client: <strong>{details?.clientName || "Client"}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                {details?.clientEmail || ""}
              </p>
              {!isSignedIn ? (
                <SignUpButton forceRedirectUrl={`/join?token=${encodeURIComponent(token)}`}>
                  <Button>Create your account</Button>
                </SignUpButton>
              ) : (
                <Button onClick={() => void acceptInvite()} disabled={accepting}>
                  {accepting ? "Accepting..." : "Accept invite"}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
