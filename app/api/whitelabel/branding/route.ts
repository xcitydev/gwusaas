import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { runContentPipelineQuery } from "@/lib/content-pipeline";

const DEFAULT_BRANDING = {
  platformName: "GWU Agency",
  agencyName: "GWU",
  logoUrl: undefined,
  faviconUrl: undefined,
  primaryColor: "#c79b09",
  secondaryColor: "#6b4dff",
  supportEmail: undefined,
  isWhitelabel: false,
};

function normalizeHost(value: string) {
  return value.split(":")[0].toLowerCase().trim();
}

export async function GET(req: Request) {
  try {
    const headerStore = await headers();
    const headerHost = headerStore.get("x-wl-host");
    const urlHost = new URL(req.url).searchParams.get("host");
    const host =
      normalizeHost(headerHost || urlHost || headerStore.get("host") || "");

    if (!host || host === "localhost" || host.endsWith(".localhost")) {
      return NextResponse.json(DEFAULT_BRANDING);
    }

    const config = (await runContentPipelineQuery("whitelabel:getConfigByDomain", {
      customDomain: host,
    })) as
      | {
          platformName: string;
          agencyName: string;
          logoUrl?: string;
          faviconUrl?: string;
          primaryColor: string;
          secondaryColor: string;
          supportEmail?: string;
          domainVerified: boolean;
        }
      | null;

    if (!config || !config.domainVerified) {
      return NextResponse.json(DEFAULT_BRANDING);
    }

    return NextResponse.json({
      platformName: config.platformName,
      agencyName: config.agencyName,
      logoUrl: config.logoUrl,
      faviconUrl: config.faviconUrl,
      primaryColor: config.primaryColor,
      secondaryColor: config.secondaryColor,
      supportEmail: config.supportEmail,
      isWhitelabel: true,
    });
  } catch (error) {
    console.error("Failed to resolve whitelabel branding", error);
    return NextResponse.json(DEFAULT_BRANDING);
  }
}
