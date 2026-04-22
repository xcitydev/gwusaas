"use client";

import React from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface PaywallOverlayProps {
  children: React.ReactNode;
  isLocked: boolean;
  title?: string;
  description?: string;
  className?: string;
}

export function PaywallOverlay({
  children,
  isLocked,
  title = "Unlock Premium Feature",
  description = "You've reached your limit. Upgrade to unlock more results and power-user features.",
  className,
}: PaywallOverlayProps) {
  const router = useRouter();

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      {/* Blurred Content */}
      <div className="pointer-events-none select-none blur-[6px] grayscale opacity-40">
        {children}
      </div>

      {/* Overlay Content */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/20 px-6 text-center backdrop-blur-[2px]">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-xl font-bold tracking-tight">{title}</h3>
        <p className="mt-2 max-w-[280px] text-sm text-muted-foreground">
          {description}
        </p>
        <Button 
          className="mt-6" 
          onClick={() => router.push("/pricing")}
        >
          View Plans & Upgrade
        </Button>
      </div>
    </div>
  );
}
