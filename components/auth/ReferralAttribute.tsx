"use client";

/**
 * Mounted in the dashboard layout. On first load after sign-up, reads any
 * pending referral code from localStorage (set by ReferralCapture) and
 * POSTs it to /api/referrals/attribute. Clears localStorage on success
 * OR on a definitive failure (invalid code, self-referral) so we don't
 * keep retrying forever.
 *
 * Idempotent on the server side — running multiple times for the same
 * (user, code) pair is a no-op.
 */

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";

const STORAGE_KEY = "gwu:pending-referral-code";

export function ReferralAttribute() {
  const { isLoaded, isSignedIn } = useUser();
  const calledRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (calledRef.current) return;
    if (typeof window === "undefined") return;

    let code: string | null = null;
    try {
      code = localStorage.getItem(STORAGE_KEY);
    } catch {
      return;
    }
    if (!code) return;

    calledRef.current = true;
    fetch("/api/referrals/attribute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referralCode: code }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        // On any definitive answer (success OR a recognized error), clear
        // the code so we don't keep retrying. Only retry on transient 5xx.
        if (res.ok || (res.status >= 400 && res.status < 500)) {
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {
            // ignore
          }
        }
        // eslint-disable-next-line no-console
        console.debug("[ReferralAttribute] result", res.status, json);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("[ReferralAttribute] failed (will retry next mount)", err);
      });
  }, [isLoaded, isSignedIn]);

  return null;
}
