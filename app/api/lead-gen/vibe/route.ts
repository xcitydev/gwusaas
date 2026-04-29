import { NextResponse } from "next/server";
import { z } from "zod";
import { generateJsonWithFallback, getAiErrorMessage } from "@/lib/ai";
import { requirePlan } from "@/lib/route-auth";
import { saveAiGenerationHistory } from "@/lib/convex-history";

const bodySchema = z.object({
  query: z.string().min(1),
  filterKind: z.enum(["job_title", "industry"]).optional(),
  filterValue: z.string().optional(),
  location: z.string().optional(),
  maxItems: z.number().int().min(1).max(50).optional(),
});

const systemPrompt =
  "You are the Vibe Prospecting B2B database. Return ONLY a JSON array of up to {MAX} realistic prospect objects drawn from known US/CA company directories, LinkedIn-style public profiles, and trade associations. " +
  "Each object must include: name (full name), email (business email, lowercase, realistic domain), phone (E.164 or (###) ###-####), company (real-sounding business name), jobTitle, industry, location (city, state), linkedin (full URL like https://linkedin.com/in/firstname-lastname-xxxx), website (company homepage), painPoint (one-sentence pain), outreachAngle (one-sentence opener), confidence (70-95). " +
  "Do NOT fabricate emails for real named individuals — use a realistic 'firstname.lastname@domain.com' pattern with a plausible domain. Prefer variety in locations and firm sizes. " +
  "Return valid JSON only, no prose.";

type VibeLead = {
  name: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  industry: string;
  location: string;
  linkedin: string;
  website: string;
  painPoint: string;
  outreachAngle: string;
  confidence: number;
};

export async function POST(req: Request) {
  try {
    const guard = await requirePlan("growth");
    if (!guard.ok) return guard.response;

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { query, filterKind, filterValue, location, maxItems } = parsed.data;
    const limit = maxItems ?? 25;

    const filterLine = filterKind && filterValue
      ? `${filterKind === "job_title" ? "Target job title" : "Target industry"}: "${filterValue}"\n`
      : "";
    const locationLine = location ? `Preferred location: ${location}\n` : "";

    const traceId = `lead-gen-vibe:${guard.userId}:${Date.now()}`;
    const { data, provider, model, rawText } = await generateJsonWithFallback<unknown[]>({
      system: systemPrompt.replace("{MAX}", String(limit)),
      messages: [
        {
          role: "user",
          content:
            `Search query: "${query}"\n` +
            filterLine +
            locationLine +
            `Return up to ${limit} high-quality B2B prospects as JSON array only.`,
        },
      ],
      traceId,
    });

    const leads: VibeLead[] = (Array.isArray(data) ? data : []).map((item) => {
      const row = item as Record<string, unknown>;
      return {
        name: String(row.name ?? row.contactName ?? ""),
        email: String(row.email ?? "").toLowerCase(),
        phone: String(row.phone ?? ""),
        company: String(row.company ?? ""),
        jobTitle: String(row.jobTitle ?? row.title ?? row.contactRole ?? ""),
        industry: String(row.industry ?? ""),
        location: String(row.location ?? ""),
        linkedin: String(row.linkedin ?? row.linkedinUrl ?? ""),
        website: String(row.website ?? ""),
        painPoint: String(row.painPoint ?? ""),
        outreachAngle: String(row.outreachAngle ?? ""),
        confidence: Number(row.confidence ?? 80),
      };
    });

    const generationId = await saveAiGenerationHistory({
      userId: guard.userId,
      type: "lead-gen-vibe",
      input: parsed.data,
      output: leads,
    });

    console.info("Vibe prospect search completed", {
      traceId,
      provider,
      model,
      count: leads.length,
      rawPreview: rawText.slice(0, 200),
    });

    return NextResponse.json({ leads, generationId, source: "vibe" });
  } catch (error) {
    console.error("Vibe prospect search failed", error);
    return NextResponse.json(
      { error: `Vibe search failed: ${getAiErrorMessage(error)}` },
      { status: 500 },
    );
  }
}
