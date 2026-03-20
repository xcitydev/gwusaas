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
    userType: v.optional(v.string()), // "client" | "agency"
    organizationId: v.optional(v.id("organizations")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_user_id", ["clerkUserId"]),

  organizations: defineTable({
    ownerId: v.string(),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_owner_id", ["ownerId"]),

  orgClients: defineTable({
    organizationId: v.id("organizations"),
    clientName: v.string(),
    clientEmail: v.string(),
    instagramUsername: v.string(),
    niche: v.string(),
    notes: v.optional(v.string()),
    status: v.string(), // "active" | "paused" | "cancelled"
    addedAt: v.number(),
    avatarUrl: v.optional(v.string()),
  })
    .index("by_organization_id", ["organizationId"])
    .index("by_organization_id_status", ["organizationId", "status"]),

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

  dmCampaigns: defineTable({
    ownerUserId: v.string(),
    clientId: v.string(), // orgClients._id string OR "direct:<clerkUserId>"
    campaignName: v.string(),
    platform: v.string(), // "instagram"
    messageType: v.string(), // "account_outreach" | "mass_dm" | "follow_up"
    script: v.string(),
    status: v.string(), // "draft" | "active" | "paused" | "completed"
    totalTargets: v.number(),
    totalSent: v.number(),
    totalReplies: v.number(),
    totalBooked: v.number(),
    totalClosed: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_owner_user_id", ["ownerUserId"])
    .index("by_client_id", ["clientId"])
    .index("by_client_id_created_at", ["clientId", "createdAt"]),

  dmContacts: defineTable({
    ownerUserId: v.string(),
    campaignId: v.id("dmCampaigns"),
    clientId: v.string(),
    instagramUsername: v.string(),
    fullName: v.optional(v.string()),
    followerCount: v.optional(v.number()),
    bio: v.optional(v.string()),
    profileUrl: v.optional(v.string()),
    qualificationScore: v.number(),
    qualificationReason: v.optional(v.string()),
    qualificationStatus: v.string(), // "unqualified" | "maybe" | "qualified" | "top_lead"
    dmStatus: v.string(), // "pending" | "sent" | "replied" | ...
    dmSentAt: v.optional(v.number()),
    dmRepliedAt: v.optional(v.number()),
    lastFollowUpAt: v.optional(v.number()),
    followUpCount: v.number(),
    notes: v.optional(v.string()),
    tags: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_campaign_id", ["campaignId"])
    .index("by_client_id", ["clientId"])
    .index("by_client_id_dm_status", ["clientId", "dmStatus"]),

  dmMessages: defineTable({
    ownerUserId: v.string(),
    contactId: v.id("dmContacts"),
    campaignId: v.id("dmCampaigns"),
    direction: v.string(), // "outbound" | "inbound"
    messageText: v.string(),
    sentAt: v.number(),
    isFollowUp: v.boolean(),
    followUpNumber: v.number(),
  })
    .index("by_contact_id", ["contactId"])
    .index("by_campaign_id", ["campaignId"]),

  deals: defineTable({
    ownerUserId: v.string(),
    contactId: v.id("dmContacts"),
    clientId: v.string(),
    campaignId: v.id("dmCampaigns"),
    stage: v.string(), // "contacted" | "replied" | ...
    dealValue: v.optional(v.number()),
    currency: v.string(),
    closedAt: v.optional(v.number()),
    lostReason: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_client_id", ["clientId"])
    .index("by_client_id_stage", ["clientId", "stage"])
    .index("by_contact_id", ["contactId"]),

  scrapedFollowers: defineTable({
    ownerUserId: v.string(),
    clientId: v.string(),
    sourceAccount: v.string(),
    instagramUsername: v.string(),
    fullName: v.optional(v.string()),
    followerCount: v.optional(v.number()),
    bio: v.optional(v.string()),
    profileUrl: v.optional(v.string()),
    isPrivate: v.boolean(),
    isVerified: v.boolean(),
    qualificationScore: v.number(),
    qualificationStatus: v.string(),
    qualificationReason: v.optional(v.string()),
    addedToCampaign: v.boolean(),
    scrapedAt: v.number(),
  })
    .index("by_client_id", ["clientId"])
    .index("by_client_id_status", ["clientId", "qualificationStatus"])
    .index("by_client_id_scraped_at", ["clientId", "scrapedAt"]),

  scrapeJobs: defineTable({
    ownerUserId: v.string(),
    clientId: v.string(),
    sourceAccount: v.string(),
    status: v.string(), // "pending" | "running" | "complete" | "error"
    totalFound: v.number(),
    totalQualified: v.number(),
    errorMessage: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_client_id", ["clientId"])
    .index("by_client_id_started_at", ["clientId", "startedAt"]),

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

  seoAudits: defineTable({
    userId: v.string(),
    url: v.string(),
    result: v.any(),
    createdAt: v.number(),
  }).index("by_user_id", ["userId"]),

  keywordResearch: defineTable({
    userId: v.string(),
    topic: v.string(),
    keywords: v.array(v.any()),
    createdAt: v.number(),
  }).index("by_user_id", ["userId"]),

  aiGenerations: defineTable({
    userId: v.string(),
    type: v.string(), // "cold-email" | "content-ideas" | "competitor"
    input: v.any(),
    output: v.any(),
    createdAt: v.number(),
  }).index("by_user_id", ["userId"]),

  graphics: defineTable({
    ideaTitle: v.string(),
    imageUrl: v.string(),
    platform: v.string(),
    niche: v.string(),
    prompt: v.string(),
    userId: v.string(),
    createdAt: v.number(),
    runId: v.optional(v.id("aiGenerations")),
  })
    .index("by_user_id", ["userId"])
    .index("by_run_id", ["runId"]),

  // GHL sub-account connections (one per client/workspace)
  ghlConnections: defineTable({
    clerkUserId: v.string(),
    locationId: v.string(),
    locationName: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_location_id", ["locationId"])
    .index("by_clerk_user_id_active", ["clerkUserId", "isActive"]),

  // Cached GHL contacts (synced from GHL, stored locally for fast reads)
  ghlContacts: defineTable({
    ghlContactId: v.string(),
    locationId: v.string(),
    firstName: v.string(),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    tags: v.array(v.string()),
    stage: v.optional(v.string()),
    lastSyncedAt: v.number(),
  })
    .index("by_ghl_contact_id", ["ghlContactId"])
    .index("by_location_id", ["locationId"]),

  // Outreach activity log
  ghlOutreachLog: defineTable({
    locationId: v.string(),
    contactId: v.string(),
    action: v.string(),
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_location_id", ["locationId"])
    .index("by_location_id_created_at", ["locationId", "createdAt"]),

  contentPipelineConfigs: defineTable({
    userId: v.string(),
    clientId: v.optional(v.string()),
    niche: v.string(),
    brandName: v.string(),
    brandVoice: v.string(),
    contentPillars: v.array(v.string()),
    targetPlatforms: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"]),

  contentPipelineRuns: defineTable({
    userId: v.string(),
    configId: v.id("contentPipelineConfigs"),
    status: v.string(),
    errorMessage: v.optional(v.string()),
    weekStartDate: v.string(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user_id", ["userId"])
    .index("by_config_id", ["configId"])
    .index("by_user_id_created_at", ["userId", "createdAt"]),

  viralTopics: defineTable({
    runId: v.id("contentPipelineRuns"),
    userId: v.string(),
    platform: v.string(),
    topic: v.string(),
    viralReason: v.string(),
    sourceUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_run_id", ["runId"])
    .index("by_user_id", ["userId"]),

  refinedTopics: defineTable({
    runId: v.id("contentPipelineRuns"),
    userId: v.string(),
    platform: v.string(),
    topicTitle: v.string(),
    topicAngle: v.string(),
    dayNumber: v.number(),
    createdAt: v.number(),
  })
    .index("by_run_id", ["runId"])
    .index("by_user_id", ["userId"])
    .index("by_run_day_platform", ["runId", "dayNumber", "platform"]),

  generatedContent: defineTable({
    runId: v.id("contentPipelineRuns"),
    refinedTopicId: v.id("refinedTopics"),
    userId: v.string(),
    platform: v.string(),
    dayNumber: v.number(),
    contentType: v.string(),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    status: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_run_id", ["runId"])
    .index("by_refined_topic_id", ["refinedTopicId"])
    .index("by_user_id", ["userId"])
    .index("by_run_day_platform", ["runId", "dayNumber", "platform"]),

  whitelabelConfigs: defineTable({
    userId: v.string(),
    agencyName: v.string(),
    platformName: v.string(),
    logoUrl: v.optional(v.string()),
    faviconUrl: v.optional(v.string()),
    primaryColor: v.string(),
    secondaryColor: v.string(),
    customDomain: v.optional(v.string()),
    domainVerified: v.boolean(),
    supportEmail: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_custom_domain", ["customDomain"]),

  whitelabelClients: defineTable({
    agencyUserId: v.string(),
    clientName: v.string(),
    clientEmail: v.string(),
    clientBusinessName: v.optional(v.string()),
    plan: v.string(),
    status: v.string(),
    inviteToken: v.optional(v.string()),
    clerkUserId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_agency_user_id", ["agencyUserId"])
    .index("by_invite_token", ["inviteToken"])
    .index("by_client_clerk_user_id", ["clerkUserId"]),

  whitelabelDomainVerifications: defineTable({
    userId: v.string(),
    domain: v.string(),
    txtRecord: v.string(),
    verified: v.boolean(),
    lastCheckedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_domain", ["domain"]),

  savedViralIdeas: defineTable({
    userId: v.string(),
    idea: v.string(),
    platform: v.string(),
    category: v.string(),
    hook: v.optional(v.string()),
    whyItWorks: v.optional(v.string()),
    saved: v.boolean(),
    addedToPipeline: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_id_created_at", ["userId", "createdAt"]),

  waitlistSignups: defineTable({
    email: v.string(),
    userType: v.string(), // "agency" | "client" | "freelancer"
    source: v.string(),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_created_at", ["createdAt"]),
});
