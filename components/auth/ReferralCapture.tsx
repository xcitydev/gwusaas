"use client";

/**
 * Tiny client component that runs on the sign-up page. If the URL has a
 * `?ref=` query param, it stores the code in localStorage so we can
 * attribute the referral once Clerk completes sign-up and the user lands
 * on the dashboard.
 *
 * Stores nothing if no code is present, so it's safe to mount everywhere.
 */

import { useEffect } from "react";

const STORAGE_KEY = "gwu:pending-referral-code";

export function ReferralCapture() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref")?.trim().toLowerCase();
    if (!ref || !ref.startsWith("ref-")) return;
    try {
      localStorage.setItem(STORAGE_KEY, ref);
    } catch {
      // localStorage disabled — quietly drop, sign-up still works fine.
    }
  }, []);

  return null;
}

ReferralCapture.STORAGE_KEY = STORAGE_KEY;
