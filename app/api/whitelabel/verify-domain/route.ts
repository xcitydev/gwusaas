import { NextResponse } from "next/server";
import { promises as dns } from "node:dns";
import { z } from "zod";
import { requirePlan } from "@/lib/route-auth";
import {
  runContentPipelineMutation,
  runContentPipelineQuery,
} from "@/lib/content-pipeline";

const bodySchema = z.object({
  domain: z.string().min(3),
});

export async function POST(req: Request) {
  try {
    const guard = await requirePlan("white_label");
    if (!guard.ok) return guard.response;

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const verification = (await runContentPipelineQuery(
      "whitelabel:getDomainVerification",
      {
        userId: guard.userId,
      },
    )) as
      | {
          domain: string;
          txtRecord: string;
        }
      | null;

    if (!verification || verification.domain !== parsed.data.domain.toLowerCase()) {
      return NextResponse.json(
        { error: "No matching verification record found for this domain." },
        { status: 404 },
      );
    }

    const records = await dns.resolveTxt(parsed.data.domain);
    const flattened = records.flat().map((entry) => entry.trim());
    const verified = flattened.includes(verification.txtRecord);

    if (verified) {
      await runContentPipelineMutation("whitelabel:markDomainVerified", {
        userId: guard.userId,
        domain: parsed.data.domain,
      });
      return NextResponse.json({ verified: true });
    }

    return NextResponse.json({
      verified: false,
      message: "TXT record not found yet",
      expectedTxtRecord: verification.txtRecord,
    });
  } catch (error) {
    console.error("Domain verification failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to verify domain",
      },
      { status: 500 },
    );
  }
}
