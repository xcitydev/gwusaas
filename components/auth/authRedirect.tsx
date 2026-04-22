// components/auth-redirect.tsx
"use client";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const createOrUpdateProfile = useMutation(api.profile.createOrUpdate);
  const [isProvisioningProfile, setIsProvisioningProfile] = useState(false);
  const profileProvisionAttemptedRef = useRef(false);
  const isAuthPage =
    pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");

  // Check if user exists in Convex
  const convexUser = useQuery(
    api.profile.getByClerkId,
    isSignedIn && user?.id ? { clerkUserId: user.id } : "skip"
  );

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || convexUser !== null) return;
    if (profileProvisionAttemptedRef.current) return;

    profileProvisionAttemptedRef.current = true;
    setIsProvisioningProfile(true);

    void createOrUpdateProfile({
      clerkUserId: user.id,
      fullName:
        user.fullName ||
        `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
        "User",
      email: user.primaryEmailAddress?.emailAddress || "",
      role: "client",
    })
      .catch((error) => {
        profileProvisionAttemptedRef.current = false;
        console.error("Failed to auto-provision Convex profile", error);
        toast.error("Failed to sync your account profile. Please refresh.");
      })
      .finally(() => {
        setIsProvisioningProfile(false);
      });
  }, [convexUser, createOrUpdateProfile, isLoaded, isSignedIn, user]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (!convexUser) return;

    if (isAuthPage) {
      router.replace(
        convexUser.onboardingCompleted ? "/dashboard" : "/onboarding"
      );
      return;
    }

    if (!convexUser.onboardingCompleted && pathname !== "/onboarding") {
      router.replace("/onboarding");
      return;
    }

    if (convexUser.onboardingCompleted && pathname.startsWith("/onboarding")) {
      router.replace("/dashboard");
    }
  }, [convexUser, isAuthPage, isLoaded, isSignedIn, pathname, router]);

  if (!isLoaded || (isSignedIn && (convexUser === undefined || isProvisioningProfile))) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/10 border-t-primary shadow-[0_0_20px_rgba(245,158,11,0.2)]"></div>
          <div className="absolute inset-0 animate-pulse bg-primary/20 rounded-full blur-2xl -z-10"></div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-xs font-black text-primary uppercase tracking-[0.3em] animate-pulse">
            {isProvisioningProfile ? "Initializing Protocol" : "Establishing Uplink"}
          </p>
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
            {isProvisioningProfile ? "Syncing Workspace Architectures" : "Verifying Clearance Credentials"}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
