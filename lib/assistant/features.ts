import type { Plan } from "@/lib/plans";

export type AssistantFeature = {
  id: string;
  label: string;
  href: string;
  description: string;
  synonyms: string[];
  requiredPlan: Plan;
  howTo: string;
};

export const ASSISTANT_FEATURES: AssistantFeature[] = [
  {
    id: "outreach",
    label: "Get New Customers",
    href: "/dashboard/outreach",
    description:
      "Find new customers on Instagram by sending automated DMs to target accounts. Supports real-estate outreach, general Instagram outreach, and mass-DM blasts.",
    synonyms: [
      "find customers",
      "get clients",
      "instagram outreach",
      "send dms",
      "real estate clients",
      "mass dm",
      "outreach campaign",
      "cold outreach",
    ],
    requiredPlan: "growth",
    howTo:
      "Click 'Launch New' in the top right, pick the outreach style (real estate, general Instagram, or mass DM), then fill in your Instagram account details and target accounts. Required fields are marked with a red asterisk.",
  },
  {
    id: "content-pipeline",
    label: "7-Day Content Plan",
    href: "/dashboard/content-pipeline",
    description:
      "Generates a week of social media content across multiple platforms automatically.",
    synonyms: [
      "content plan",
      "social media posts",
      "schedule posts",
      "weekly content",
      "content calendar",
    ],
    requiredPlan: "growth",
    howTo:
      "Open the page and start a new pipeline run by describing your business and the platforms you post to. The system will research topics, refine them, then generate full posts.",
  },
  {
    id: "voice-caller",
    label: "AI Phone Agent",
    href: "/dashboard/voice-caller",
    description:
      "Make outbound qualifier phone calls with an AI voice that sounds like the user's own cloned voice.",
    synonyms: [
      "voice calls",
      "phone calls",
      "cold calls",
      "ai caller",
      "voice agent",
      "call leads",
    ],
    requiredPlan: "growth",
    howTo:
      "First clone your voice in Settings → Voice Replies (record 30–120 seconds of clean audio). Then create a campaign, write a script, pick the voice, and launch it against your target list.",
  },
  {
    id: "lead-gen",
    label: "Find Customers (Lead Gen)",
    href: "/dashboard/lead-gen",
    description:
      "Search for businesses matching a target profile and pull contact info.",
    synonyms: [
      "find leads",
      "scrape leads",
      "lead generation",
      "find businesses",
      "prospecting",
    ],
    requiredPlan: "growth",
    howTo:
      "Describe the kind of business you want to find (industry, location, size). The system will return a list you can export or push into an outreach campaign.",
  },
  {
    id: "scraper",
    label: "Find Leads (Scraper)",
    href: "/dashboard/scraper",
    description: "Scrape lead lists from various sources.",
    synonyms: ["scraper", "scrape", "lead list"],
    requiredPlan: "growth",
    howTo:
      "Pick a source and search terms. The scraper will pull matching leads into your account.",
  },
  {
    id: "ai-studio",
    label: "Create with AI",
    href: "/dashboard/ai-studio",
    description: "General-purpose AI workspace for drafting and ideation.",
    synonyms: [
      "ai studio",
      "ai chat",
      "create with ai",
      "draft with ai",
      "brainstorm",
    ],
    requiredPlan: "free",
    howTo:
      "Pick a workflow (draft, ideate, rewrite) and describe what you want. The AI will generate options you can refine.",
  },
  {
    id: "media-studio",
    label: "Make Images & Videos",
    href: "/dashboard/media-studio",
    description: "Generate images and short videos with AI.",
    synonyms: [
      "make images",
      "generate images",
      "make videos",
      "create graphics",
      "ai images",
      "ai videos",
    ],
    requiredPlan: "growth",
    howTo:
      "Choose image or video, describe what you want, pick a style, and generate. You can refine prompts or pick from variations.",
  },
  {
    id: "seo",
    label: "Get Found on Google",
    href: "/dashboard/seo",
    description: "SEO audit, keyword research, and on-page recommendations.",
    synonyms: ["seo", "google ranking", "keyword research", "seo audit"],
    requiredPlan: "starter",
    howTo:
      "Enter your domain to run an audit. The system will surface technical SEO issues, keyword opportunities, and on-page suggestions.",
  },
  {
    id: "ai-visibility-pro",
    label: "Get Found by AI",
    href: "/dashboard/ai-visibility-pro",
    description:
      "Check how your business appears in AI search results (ChatGPT, Perplexity, etc.) and how to improve.",
    synonyms: [
      "ai search",
      "chatgpt visibility",
      "ai seo",
      "ai visibility",
      "perplexity",
    ],
    requiredPlan: "free",
    howTo:
      "Enter your business name and we'll show how AI assistants currently describe you, with a checklist to improve those results.",
  },
  {
    id: "transcriber",
    label: "Audio to Text",
    href: "/dashboard/transcriber",
    description: "Transcribe audio files to text.",
    synonyms: ["transcribe", "audio to text", "transcription", "stt"],
    requiredPlan: "starter",
    howTo: "Upload an audio file. Transcripts are returned as text you can copy or download.",
  },
  {
    id: "viral-ideas",
    label: "Viral Ideas",
    href: "/dashboard/viral-ideas",
    description: "Get viral content angles based on what's trending.",
    synonyms: [
      "viral",
      "trending ideas",
      "content ideas",
      "viral content",
      "what's working",
    ],
    requiredPlan: "free",
    howTo:
      "Describe your niche. The system pulls trending angles you can adapt and turn into posts.",
  },
  {
    id: "ads",
    label: "Run Ads",
    href: "/dashboard/ads",
    description: "Launch and manage paid ad campaigns.",
    synonyms: ["ads", "run ads", "paid ads", "advertising", "campaign"],
    requiredPlan: "growth",
    howTo: "Pick an ad type and platform, define your audience and creative, then launch.",
  },
  {
    id: "content",
    label: "My Content",
    href: "/dashboard/content",
    description: "Library of content drafts and assets you've created.",
    synonyms: ["my content", "content library", "drafts", "assets"],
    requiredPlan: "starter",
    howTo: "Browse, edit, or schedule drafts. Click a draft to edit or approve it.",
  },
  {
    id: "email",
    label: "Email & SMS",
    href: "/dashboard/email",
    description: "Send email and SMS sequences to your contacts.",
    synonyms: ["email", "sms", "newsletters", "email marketing", "sms blast"],
    requiredPlan: "starter",
    howTo: "Pick a sequence type, write your message, choose the audience, and send or schedule.",
  },
  {
    id: "deals",
    label: "Sales",
    href: "/dashboard/deals",
    description: "Sales pipeline / deals board.",
    synonyms: ["deals", "sales", "pipeline", "crm deals"],
    requiredPlan: "growth",
    howTo: "Drag deals across stages. Click a deal for full history and contact info.",
  },
  {
    id: "crm",
    label: "Customers (CRM)",
    href: "/dashboard/crm",
    description: "Contact records and interaction history.",
    synonyms: ["crm", "contacts", "customers", "leads database"],
    requiredPlan: "growth",
    howTo: "Search or filter contacts. Click any contact to see their full history with you.",
  },
  {
    id: "conversations",
    label: "Inbox",
    href: "/dashboard/conversations",
    description: "Unified inbox for all client messages (Instagram, email, SMS).",
    synonyms: ["inbox", "messages", "conversations", "dm inbox"],
    requiredPlan: "free",
    howTo: "Replies arrive here in real time. Use the AI voice reply button to respond with your cloned voice.",
  },
  {
    id: "approvals",
    label: "Needs Your Sign-Off",
    href: "/dashboard/approvals",
    description: "Pending items waiting for the user's approval.",
    synonyms: ["approvals", "sign off", "pending approval", "review"],
    requiredPlan: "free",
    howTo: "Review each item and approve or request changes.",
  },
  {
    id: "referral-program",
    label: "Earn Money (Referrals)",
    href: "/dashboard/referral-program",
    description: "Refer others and earn commission on their plans.",
    synonyms: ["refer", "referral", "earn money", "affiliate", "commission"],
    requiredPlan: "free",
    howTo: "Copy your referral link from this page. You earn 30% commission on every referred plan.",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/dashboard/settings",
    description: "Account settings — profile, voice clone, integrations, billing.",
    synonyms: ["settings", "profile", "account settings", "voice clone settings"],
    requiredPlan: "free",
    howTo: "Use the tabs at the top to switch between profile, voice replies, integrations, and billing.",
  },
  {
    id: "support",
    label: "Get Help",
    href: "/dashboard/support",
    description: "Contact support or browse help articles.",
    synonyms: ["help", "support", "contact us", "faq"],
    requiredPlan: "free",
    howTo: "Search the help center or open a ticket from this page.",
  },
  {
    id: "pricing",
    label: "Pricing & Upgrade",
    href: "/pricing",
    description: "View plans and upgrade.",
    synonyms: ["pricing", "upgrade", "plans", "billing", "subscribe"],
    requiredPlan: "free",
    howTo: "Pick a plan and check out. Your upgrade unlocks immediately.",
  },
];

export function findFeature(query: string): AssistantFeature | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  for (const f of ASSISTANT_FEATURES) {
    if (f.id === q || f.label.toLowerCase() === q) return f;
  }
  for (const f of ASSISTANT_FEATURES) {
    if (f.synonyms.some((s) => s.toLowerCase() === q)) return f;
  }
  for (const f of ASSISTANT_FEATURES) {
    if (
      f.label.toLowerCase().includes(q) ||
      f.synonyms.some((s) => s.toLowerCase().includes(q)) ||
      f.description.toLowerCase().includes(q)
    ) {
      return f;
    }
  }
  return null;
}

export function buildFeatureCatalogForPrompt(): string {
  return ASSISTANT_FEATURES.map(
    (f) =>
      `- id: "${f.id}" | route: ${f.href} | "${f.label}" — ${f.description} (plan: ${f.requiredPlan})`,
  ).join("\n");
}
