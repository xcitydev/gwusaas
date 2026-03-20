import { NextResponse } from "next/server";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";

const bodySchema = z.object({
  email: z.string().email(),
  userType: z.enum(["agency", "client", "freelancer"]),
});

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null;

export async function POST(req: Request) {
  try {
    if (!convex) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_CONVEX_URL is not configured" },
        { status: 500 },
      );
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await convex.mutation("waitlist:createSignup" as never, {
      email: parsed.data.email,
      userType: parsed.data.userType,
      source: "ai-studio-page",
    } as never);

    if ((result as { status: string }).status === "exists") {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        message: "You're already on the list!",
      });
    }

    return NextResponse.json({
      ok: true,
      duplicate: false,
      message: "You're on the list. We'll be in touch soon.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to join waitlist" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    if (!convex) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_CONVEX_URL is not configured" },
        { status: 500 },
      );
    }
    const count = await convex.query("waitlist:getCount" as never, {} as never);
    return NextResponse.json({ count });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get waitlist count" },
      { status: 500 },
    );
  }
}
