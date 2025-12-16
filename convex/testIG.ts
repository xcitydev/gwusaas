import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalQuery } from "./_generated/server";
import { verifyUserAccess, getCurrentUserId } from "./lib/spec";
import { internal, api } from "./_generated/api";
import type { QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";

const INSTAGRAM_GRAPH_API_BASE = "https://graph.facebook.com/v18.0";

/**
 * Get Instagram Business Account ID from Facebook Page
 */
async function getInstagramBusinessAccount(pageId: string, accessToken: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${INSTAGRAM_GRAPH_API_BASE}/${pageId}?fields=instagram_business_account&access_token=${accessToken}`
    );
    const data = await response.json();
    return data.instagram_business_account?.id || null;
  } catch (error) {
    console.error("Error getting IG Business Account:", error);
    return null;
  }
}

/**
 * Connect Instagram Page to user account
 */
export const connectPage = mutation({
  args: {
    pageId: v.string(),
    pageName: v.string(),
    accessToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify user is authenticated
    const access = await verifyUserAccess(ctx);
    const userId = await getCurrentUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Get Instagram Business Account ID
    const igBusinessAccountId = await getInstagramBusinessAccount(args.pageId, args.accessToken);
    if (!igBusinessAccountId) {
      throw new Error("Failed to get Instagram Business Account. Make sure the Page has an Instagram account connected.");
    }

    // Check if page already exists
    const existing = await ctx.db
      .query("instagramPage")
      .withIndex("by_page_id", (q) => q.eq("pageId", args.pageId))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        pageName: args.pageName,
        accessToken: args.accessToken,
        instagramBusinessAccountId: igBusinessAccountId,
        updatedAt: now,
      });
      return { success: true, pageId: existing._id };
    }

    // Create new
    const pageRecordId = await ctx.db.insert("instagramPage", {
      clerkUserId: userId,
      pageId: args.pageId,
      pageName: args.pageName,
      instagramBusinessAccountId: igBusinessAccountId,
      accessToken: args.accessToken,
      webhookVerified: false,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, pageId: pageRecordId };
  },
});

/**
 * Fetch all DMs (conversations) for an Instagram Business Account
 */
export const fetchAllDMs = action({
  args: {
    pageId: v.string(),
  },
  handler: async (ctx: ActionCtx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Get page info
    const page = await ctx.runQuery(internal.testIG.getPageById, {
      pageId: args.pageId,
    });

    if (!page || page.clerkUserId !== userId) {
      throw new Error("Page not found or unauthorized");
    }

    const igBusinessAccountId = page.instagramBusinessAccountId;
    const accessToken = page.accessToken;

    // Fetch conversations
    const conversationsUrl = `${INSTAGRAM_GRAPH_API_BASE}/${igBusinessAccountId}/conversations?fields=participants,updated_time&access_token=${accessToken}`;
    
    const conversationsResponse = await fetch(conversationsUrl);
    const conversationsData = await conversationsResponse.json();

    if (conversationsData.error) {
      throw new Error(`Instagram API Error: ${conversationsData.error.message}`);
    }

    const conversations = conversationsData.data || [];
    const allMessages: any[] = [];

    // Fetch messages for each conversation
    for (const conversation of conversations) {
      const threadId = conversation.id;
      const participants = conversation.participants?.data || [];
      const participantId = participants.find((p: any) => p.id !== igBusinessAccountId)?.id;

      if (!participantId) continue;

      // Fetch messages in this thread
      const messagesUrl = `${INSTAGRAM_GRAPH_API_BASE}/${threadId}/messages?fields=id,from,message,created_time,attachments&access_token=${accessToken}`;
      const messagesResponse = await fetch(messagesUrl);
      const messagesData = await messagesResponse.json();

      if (messagesData.data) {
        for (const message of messagesData.data) {
          allMessages.push({
            threadId,
            participantId,
            messageId: message.id,
            message: message.message || "",
            from: message.from?.id === igBusinessAccountId ? "page" : "user",
            timestamp: new Date(message.created_time).getTime(),
            attachments: message.attachments?.data?.map((att: any) => ({
              type: att.type || "file",
              url: att.image_data?.url || att.video_data?.url || att.file_url || "",
            })) || [],
          });
        }
      }
    }

    // Store messages in database
    await ctx.runMutation(internal.testIG.storeMessages, {
      clerkUserId: userId,
      pageId: args.pageId,
      messages: allMessages,
    });

    return {
      success: true,
      conversationsCount: conversations.length,
      messagesCount: allMessages.length,
    };
  },
});

/**
 * Internal query to get page by ID
 */
export const getPageById = internalQuery({
  args: {
    pageId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("instagramPage")
      .withIndex("by_page_id", (q) => q.eq("pageId", args.pageId))
      .first();
  },
});

/**
 * Internal mutation to store messages
 */
export const storeMessages = internalMutation({
  args: {
    clerkUserId: v.string(),
    pageId: v.string(),
    messages: v.array(v.object({
      threadId: v.string(),
      participantId: v.string(),
      messageId: v.string(),
      message: v.string(),
      from: v.string(),
      timestamp: v.number(),
      attachments: v.optional(v.array(v.object({
        type: v.string(),
        url: v.string(),
      }))),
    })),
  },
  handler: async (ctx: MutationCtx, args) => {
    const now = Date.now();

    for (const msg of args.messages) {
      // Check if message already exists
      const existing = await ctx.db
        .query("instagramDM")
        .withIndex("by_thread_id", (q) => q.eq("threadId", msg.threadId))
        .filter((q) => q.eq(q.field("messageId"), msg.messageId))
        .first();

      if (!existing) {
        await ctx.db.insert("instagramDM", {
          clerkUserId: args.clerkUserId,
          pageId: args.pageId,
          threadId: msg.threadId,
          participantId: msg.participantId,
          participantUsername: undefined, // Will be fetched separately if needed
          messageId: msg.messageId,
          message: msg.message,
          from: msg.from as "page" | "user",
          timestamp: msg.timestamp,
          attachments: msg.attachments,
          read: msg.from === "page", // Messages sent by page are read
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  },
});

/**
 * Get all DMs for current user
 */
export const listDMs = query({
  args: {
    pageId: v.optional(v.string()),
    threadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    let query = ctx.db
      .query("instagramDM")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId));

    const messages = await query.collect();

    // Filter by pageId if provided
    let filtered = messages;
    if (args.pageId) {
      filtered = filtered.filter((m) => m.pageId === args.pageId);
    }

    // Filter by threadId if provided
    if (args.threadId) {
      filtered = filtered.filter((m) => m.threadId === args.threadId);
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    return filtered;
  },
});

/**
 * Get all conversations (threads) for current user
 */
export const listConversations = query({
  args: {
    pageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    let query = ctx.db
      .query("instagramDM")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId));

    const messages = await query.collect();

    // Filter by pageId if provided
    let filtered = messages;
    if (args.pageId) {
      filtered = filtered.filter((m) => m.pageId === args.pageId);
    }

    // Group by threadId
    const threadsMap = new Map<string, any>();

    for (const msg of filtered) {
      if (!threadsMap.has(msg.threadId)) {
        threadsMap.set(msg.threadId, {
          threadId: msg.threadId,
          participantId: msg.participantId,
          participantUsername: msg.participantUsername,
          pageId: msg.pageId,
          lastMessage: msg.message,
          lastMessageTime: msg.timestamp,
          unreadCount: 0,
          messageCount: 0,
        });
      }

      const thread = threadsMap.get(msg.threadId)!;
      thread.messageCount++;
      if (!msg.read && msg.from === "user") {
        thread.unreadCount++;
      }
      if (msg.timestamp > thread.lastMessageTime) {
        thread.lastMessage = msg.message;
        thread.lastMessageTime = msg.timestamp;
      }
    }

    const threads = Array.from(threadsMap.values());
    threads.sort((a, b) => b.lastMessageTime - a.lastMessageTime);

    return threads;
  },
});

/**
 * Mark messages as read
 */
export const markAsRead = mutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const messages = await ctx.db
      .query("instagramDM")
      .withIndex("by_thread_id", (q) => q.eq("threadId", args.threadId))
      .collect();

    const now = Date.now();

    for (const msg of messages) {
      if (msg.clerkUserId === userId && !msg.read && msg.from === "user") {
        await ctx.db.patch(msg._id, {
          read: true,
          updatedAt: now,
        });
      }
    }

    return { success: true };
  },
});

/**
 * Get connected Instagram pages for current user
 */
export const listPages = query({
  args: {},
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const pages = await ctx.db
      .query("instagramPage")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .collect();

    return pages;
  },
});

/**
 * Setup webhook for Instagram messages
 */
export const setupWebhook = action({
  args: {
    pageId: v.string(),
    webhookUrl: v.string(),
  },
  handler: async (ctx: ActionCtx, args) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Get page info
    const page = await ctx.runQuery(internal.testIG.getPageById, {
      pageId: args.pageId,
    });

    if (!page || page.clerkUserId !== userId) {
      throw new Error("Page not found or unauthorized");
    }

    const accessToken = page.accessToken;
    const appId = process.env.FACEBOOK_APP_ID;

    if (!appId) {
      throw new Error("Facebook App ID not configured");
    }

    // Subscribe to messages webhook
    const subscribeUrl = `${INSTAGRAM_GRAPH_API_BASE}/${page.instagramBusinessAccountId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks&access_token=${accessToken}`;
    
    const subscribeResponse = await fetch(subscribeUrl, {
      method: "POST",
    });

    const subscribeData = await subscribeResponse.json();

    if (subscribeData.error) {
      throw new Error(`Failed to subscribe: ${subscribeData.error.message}`);
    }

    // Update page record
    await ctx.runMutation(internal.testIG.updateWebhookStatus, {
      pageId: args.pageId,
      webhookUrl: args.webhookUrl,
      webhookVerified: true,
    });

    return {
      success: true,
      message: "Webhook configured successfully",
    };
  },
});

/**
 * Internal mutation to update webhook status
 */
export const updateWebhookStatus = internalMutation({
  args: {
    pageId: v.string(),
    webhookUrl: v.string(),
    webhookVerified: v.boolean(),
  },
  handler: async (ctx: MutationCtx, args) => {
    const page = await ctx.db
      .query("instagramPage")
      .withIndex("by_page_id", (q) => q.eq("pageId", args.pageId))
      .first();

    if (page) {
      await ctx.db.patch(page._id, {
        webhookUrl: args.webhookUrl,
        webhookVerified: args.webhookVerified,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Process webhook message event
 */
export const processWebhookMessage = internalMutation({
  args: {
    pageId: v.string(),
    senderId: v.string(),
    recipientId: v.string(),
    messageId: v.string(),
    messageText: v.string(),
    timestamp: v.number(),
    attachments: v.array(v.any()),
  },
  handler: async (ctx: MutationCtx, args) => {
    // Get page to find clerkUserId
    const page = await ctx.db
      .query("instagramPage")
      .withIndex("by_page_id", (q) => q.eq("pageId", args.pageId))
      .first();

    if (!page) {
      console.error("Page not found for webhook:", args.pageId);
      return;
    }

    // Determine thread ID (conversation between sender and recipient)
    // Instagram uses a thread ID format, but we'll create one from the participants
    const sortedIds = [args.senderId, args.recipientId].sort();
    const threadId = `${sortedIds[0]}_${sortedIds[1]}`;

    // Check if message already exists
    const existing = await ctx.db
      .query("instagramDM")
      .withIndex("by_thread_id", (q) => q.eq("threadId", threadId))
      .filter((q) => q.eq(q.field("messageId"), args.messageId))
      .first();

    if (existing) {
      return; // Message already processed
    }

    const now = Date.now();
    const attachments = args.attachments.map((att: any) => ({
      type: att.type || "file",
      url: att.payload?.url || att.image_data?.url || att.video_data?.url || "",
    }));

    // Store the message
    await ctx.db.insert("instagramDM", {
      clerkUserId: page.clerkUserId,
      pageId: args.pageId,
      threadId: threadId,
      participantId: args.senderId,
      participantUsername: undefined, // Can be fetched separately
      messageId: args.messageId,
      message: args.messageText,
      from: args.senderId === page.instagramBusinessAccountId ? "page" : "user",
      timestamp: args.timestamp * 1000, // Convert to milliseconds
      attachments: attachments.length > 0 ? attachments : undefined,
      read: args.senderId === page.instagramBusinessAccountId, // Messages from page are read
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Process webhook postback event
 */
export const processWebhookPostback = internalMutation({
  args: {
    pageId: v.string(),
    senderId: v.string(),
    recipientId: v.string(),
    payload: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx: MutationCtx, args) => {
    // Log postback events (button clicks, quick replies, etc.)
    // You can extend this to handle specific postback actions
    console.log("Postback received:", {
      pageId: args.pageId,
      senderId: args.senderId,
      payload: args.payload,
      timestamp: args.timestamp,
    });

    // Optionally store postback events in a separate table or as messages
  },
});

