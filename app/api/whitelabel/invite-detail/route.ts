import { NextResponse } from "next/server";
import { z } from "zod";
import { runContentPipelineQuery } from "@/lib/content-pipeline";

const searchSchema = z.object({
  token: z.string().min(4),
});

export async function GET(req: Request) {
  try {
    const params = Object.fromEntries(new URL(req.url).searchParams.entries());
    const parsed = searchSchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const invite = (await runContentPipelineQuery(
      "whitelabel:getClientByInviteToken",
      {
        inviteToken: parsed.data.token,
      },
    )) as
      | {
          agencyUserId: string;
          inviteToken?: string;
          clientName: string;
          clientEmail: string;
        }
      | null;

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    const config = (await runContentPipelineQuery("whitelabel:getConfig", {
      userId: invite.agencyUserId,
    })) as
      | {
          agencyName: string;
          platformName: string;
          logoUrl?: string;
          primaryColor: string;
          secondaryColor: string;
        }
      | null;

    return NextResponse.json({
      clientName: invite.clientName,
      clientEmail: invite.clientEmail,
      agencyUserId: invite.agencyUserId,
      branding: config,
    });
  } catch (error) {
    console.error("Failed to read invite details", error);
    return NextResponse.json({ error: "Failed to read invite details" }, { status: 500 });
  }
}
