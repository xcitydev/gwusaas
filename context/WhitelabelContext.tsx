"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type WhitelabelBranding = {
  platformName: string;
  agencyName: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  supportEmail?: string;
  isWhitelabel: boolean;
};

const defaultBranding: WhitelabelBranding = {
  platformName: "GWU Agency",
  agencyName: "GWU",
  primaryColor: "#c79b09",
  secondaryColor: "#6b4dff",
  isWhitelabel: false,
};

type WhitelabelContextValue = WhitelabelBranding & {
  loading: boolean;
};

const WhitelabelContext = createContext<WhitelabelContextValue>({
  ...defaultBranding,
  loading: true,
});

export function WhitelabelProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<WhitelabelBranding>(defaultBranding);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const host = window.location.host;
        const res = await fetch(`/api/whitelabel/branding?host=${encodeURIComponent(host)}`);
        const payload = (await res.json().catch(() => null)) as WhitelabelBranding | null;
        if (!cancelled && payload) {
          setBranding(payload);
          document.documentElement.style.setProperty("--wl-primary", payload.primaryColor);
          document.documentElement.style.setProperty("--wl-secondary", payload.secondaryColor);
          if (payload.faviconUrl) {
            let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
            if (!link) {
              link = document.createElement("link");
              link.rel = "icon";
              document.head.appendChild(link);
            }
            link.href = payload.faviconUrl;
          }
        }
      } catch (error) {
        console.error("Failed to load whitelabel branding", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      ...branding,
      loading,
    }),
    [branding, loading],
  );

  return (
    <WhitelabelContext.Provider value={value}>{children}</WhitelabelContext.Provider>
  );
}

export function useWhitelabel() {
  return useContext(WhitelabelContext);
}
