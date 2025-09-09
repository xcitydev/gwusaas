// components/auth-redirect.tsx
"use client";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  // Check if user exists in Convex
  const convexUser = useQuery(
    api.users.getUser,
    isSignedIn ? { clerkUserId: user.id } : "skip"
  );

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      if (convexUser === null) {
        // User authenticated but doesn't exist in Convex - redirect to onboarding
        return;
      } else if (convexUser && !convexUser.user.onboardingCompleted) {
        // User exists but onboarding not completed
        router.push("/onboarding");
      } else if (convexUser && convexUser.user.onboardingCompleted) {
        // User exists and onboarding completed - redirect to dashboard
        // router.push("/dashboard");
      }
    }
  }, [isLoaded, isSignedIn, convexUser, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c79b09]"></div>
      </div>
    );
  }

  return <>{children}</>;
}
