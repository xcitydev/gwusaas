import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Legacy users table (keeping for backward compatibility)
  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    onboardingCompleted: v.boolean(),
    profile: v.optional(v.object({
      firstName: v.string(),
      lastName: v.string(),
      phone: v.string(),
    })),
    companyDetails: v.optional(v.object({
      companyName: v.string(),
      industry: v.string(),
      website: v.string(),
      companySize: v.string(),
    })),
    location: v.optional(v.object({
      address: v.string(),
      city: v.string(),
      state: v.string(),
      zipCode: v.string(),
    })),
    ghl: v.optional(v.object({
      subAccountId: v.string(),
      subAccountLocation: v.string(),
    })),
  }).index("by_clerk_id", ["clerkUserId"]),

  // User profile schema
  profile: defineTable({
    clerkUserId: v.string(),
    fullName: v.string(),
    email: v.string(),
    onboardingCompleted: v.boolean(),
    role: v.optional(v.string()), // "admin" | "manager" | "client"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_user_id", ["clerkUserId"]),

  project: defineTable({
    clerkUserId: v.string(),
    name: v.string(),
    instagramHandle: v.string(),
    websiteUrl: v.optional(v.string()),
    status: v.string(), // "active" | "paused" | "archived"
    createdBy: v.id("profile"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_status", ["status"]),

  onboardingResponse: defineTable({
    projectId: v.id("project"),
    brandTone: v.optional(v.string()),
    colorPalette: v.optional(v.string()),
    goals: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    competitors: v.optional(v.string()),
    designStyle: v.optional(v.string()),
    uploads: v.optional(v.array(v.object({
      name: v.string(),
      url: v.string(),
    }))),
    progress: v.number(), // 0-100
    completed: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project_id", ["projectId"]),

  igMetricDaily: defineTable({
    projectId: v.id("project"),
    date: v.string(), // ISO YYYY-MM-DD
    followers: v.number(),
    posts: v.number(),
    likes: v.number(),
    comments: v.number(),
    reach: v.optional(v.number()),
    profileVisits: v.optional(v.number()),
    websiteClicks: v.optional(v.number()),
    dmLeads: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project_id", ["projectId"])
    .index("by_project_date", ["projectId", "date"]),

  lead: defineTable({
    projectId: v.id("project"),
    source: v.string(), // "instagram" | "website" | "manual"
    handleOrEmail: v.string(),
    message: v.optional(v.string()),
    status: v.string(), // "new" | "contacted" | "qualified" | "won" | "lost"
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project_id", ["projectId"])
    .index("by_status", ["status"])
    .index("by_project_status", ["projectId", "status"]),

  aiReport: defineTable({
    projectId: v.id("project"),
    reportType: v.string(), // "weekly_insight" | "caption_batch" | "hashtag_list" | "competitor_scan" | "action_plan"
    inputRefs: v.optional(v.any()),
    content: v.any(), // structured object
    score: v.optional(v.number()), // 0-100
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project_id", ["projectId"])
    .index("by_report_type", ["reportType"])
    .index("by_project_type", ["projectId", "reportType"]),

  auditLog: defineTable({
    clerkUserId: v.string(),
    action: v.string(),
    meta: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_clerk_user_id", ["clerkUserId"]),

  websiteProject: defineTable({
    clerkUserId: v.string(),
    title: v.string(),
    status: v.string(), // "planning" | "design" | "development" | "review" | "live"
    progress: v.number(), // 0-100
    features: v.optional(v.string()), // Required features
    brandElements: v.optional(v.string()), // Brand elements needed
    aboutUsSummary: v.optional(v.string()), // About Us/Team page content
    googleDriveLink: v.optional(v.string()), // Google Drive folder with assets
    assignedDeveloper: v.optional(v.string()),
    deadline: v.optional(v.string()),
    url: v.optional(v.string()),
    technologies: v.optional(v.array(v.string())),
    createdBy: v.id("profile"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_status", ["status"]),

  outreachCampaign: defineTable({
    clerkUserId: v.string(),
    instagramUsername: v.string(),
    instagramPassword: v.optional(v.string()), // Encrypted in production
    backupCodes: v.optional(v.string()), // Encrypted in production
    idealClient: v.optional(v.string()), // Description of ideal avatar client
    targetAccounts: v.optional(v.array(v.string())), // List of @handles
    outreachScript: v.optional(v.string()), // Ideal script for reaching out
    allowFollow: v.boolean(), // Allow following target accounts
    enableEngagement: v.boolean(), // Free engagement service
    status: v.string(), // "setup" | "active" | "paused" | "completed"
    createdBy: v.id("profile"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_status", ["status"]),

  contentDraft: defineTable({
    clerkUserId: v.string(),
    contentType: v.string(), // "social_media_design" | "blog_post" | "newsletter"
    status: v.string(), // "draft" | "in_review" | "approved" | "published"
    // Social Media Design fields
    designTexts: v.optional(v.array(v.string())), // Array of text for each design
    logoUrl: v.optional(v.string()), // Logo file URL
    designExamples: v.optional(v.string()), // Text or link to examples
    colors: v.optional(v.string()), // Color preferences
    googleDriveLink: v.optional(v.string()), // Google Drive link with labeled images
    // Blog Post fields
    topic: v.optional(v.string()), // Topic or headline
    targetAudience: v.optional(v.string()), // Target audience
    tone: v.optional(v.string()), // Tone/style preference
    referenceArticles: v.optional(v.string()), // Reference articles or brands
    keywords: v.optional(v.string()), // Keywords to include
    // Newsletter fields
    mainTopic: v.optional(v.string()), // Main topic or announcement
    goal: v.optional(v.string()), // Goal of newsletter
    emailListSegment: v.optional(v.string()), // Target audience/segment
    exampleNewsletters: v.optional(v.string()), // Example newsletters or layouts
    graphicsLink: v.optional(v.string()), // Graphics/images link
    createdBy: v.id("profile"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_content_type", ["contentType"])
    .index("by_status", ["status"]),
});
