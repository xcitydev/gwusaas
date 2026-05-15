import { ghlFetch } from "./client";

export interface GHLConversationSummary {
  id: string;
  contactId: string;
  locationId: string;
  fullName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  lastMessageBody?: string;
  lastMessageType?: string;
  lastMessageDate?: string;
  unreadCount?: number;
  type?: string;
  starred?: boolean;
}

export interface GHLConversationMessage {
  id: string;
  conversationId: string;
  contactId: string;
  locationId: string;
  type: number | string;
  messageType?: string;
  body?: string;
  direction: "inbound" | "outbound" | string;
  status?: string;
  dateAdded: string;
  attachments?: string[];
  meta?: Record<string, unknown>;
}

export interface SearchConversationsParams {
  locationId: string;
  apiKey: string;
  limit?: number;
  startAfterDate?: number;
  query?: string;
  status?: "all" | "read" | "unread" | "starred" | "recents";
  sort?: "asc" | "desc";
  sortBy?: "last_message_date" | "last_manual_message_date";
  assignedTo?: string;
}

export interface GetMessagesParams {
  conversationId: string;
  apiKey: string;
  limit?: number;
  type?: string;
  lastMessageId?: string;
}

type SearchResponse = {
  conversations?: GHLConversationSummary[];
  total?: number;
};

type MessagesResponse = {
  messages?: {
    lastMessageId?: string;
    nextPage?: boolean;
    messages?: GHLConversationMessage[];
  };
  // Some endpoint variants return a flat list — handle both.
  data?: GHLConversationMessage[];
};

export type GHLMessageType =
  | "SMS"
  | "Email"
  | "WhatsApp"
  | "GMB"
  | "IG"
  | "FB"
  | "Custom";

export interface SendMessageParams {
  apiKey: string;
  type: GHLMessageType;
  contactId: string;
  message: string;
  /** Email-only: subject and html body. */
  subject?: string;
  html?: string;
  attachments?: string[];
  /** SMS-only override of the from-number. */
  fromNumber?: string;
  toNumber?: string;
}

type SendMessageResponse = {
  conversationId?: string;
  messageId?: string;
  messageIds?: string[];
};

/**
 * Searches conversations under a GHL location.
 * Maps to GET /conversations/search on LeadConnector v2.
 */
export async function searchConversations(
  params: SearchConversationsParams,
): Promise<{ conversations: GHLConversationSummary[]; total: number }> {
  const search = new URLSearchParams({ locationId: params.locationId });
  if (params.limit) search.set("limit", String(params.limit));
  if (params.startAfterDate)
    search.set("startAfterDate", String(params.startAfterDate));
  if (params.query) search.set("query", params.query);
  if (params.status) search.set("status", params.status);
  if (params.sort) search.set("sort", params.sort);
  if (params.sortBy) search.set("sortBy", params.sortBy);
  if (params.assignedTo) search.set("assignedTo", params.assignedTo);

  const result = await ghlFetch<SearchResponse>({
    endpoint: `/conversations/search?${search.toString()}`,
    method: "GET",
    apiKey: params.apiKey,
  });

  return {
    conversations: result.conversations ?? [],
    total: result.total ?? 0,
  };
}

/**
 * Fetches the message history for a single conversation.
 * Maps to GET /conversations/{conversationId}/messages on LeadConnector v2.
 */
export async function getConversationMessages(
  params: GetMessagesParams,
): Promise<{
  messages: GHLConversationMessage[];
  nextPage: boolean;
  lastMessageId?: string;
}> {
  const search = new URLSearchParams();
  if (params.limit) search.set("limit", String(params.limit));
  if (params.type) search.set("type", params.type);
  if (params.lastMessageId) search.set("lastMessageId", params.lastMessageId);

  const qs = search.toString();
  const endpoint = `/conversations/${params.conversationId}/messages${qs ? `?${qs}` : ""}`;

  const result = await ghlFetch<MessagesResponse>({
    endpoint,
    method: "GET",
    apiKey: params.apiKey,
  });

  const inner = result.messages;
  const messages = inner?.messages ?? result.data ?? [];

  return {
    messages,
    nextPage: Boolean(inner?.nextPage),
    lastMessageId: inner?.lastMessageId,
  };
}

/**
 * Sends an outbound message in a GHL conversation.
 * Maps to POST /conversations/messages on LeadConnector v2.
 */
export async function sendMessage(
  params: SendMessageParams,
): Promise<{ conversationId?: string; messageId?: string }> {
  const body: Record<string, unknown> = {
    type: params.type,
    contactId: params.contactId,
    message: params.message,
  };
  if (params.subject) body.subject = params.subject;
  if (params.html) body.html = params.html;
  if (params.attachments && params.attachments.length > 0) {
    body.attachments = params.attachments;
  }
  if (params.fromNumber) body.fromNumber = params.fromNumber;
  if (params.toNumber) body.toNumber = params.toNumber;

  const result = await ghlFetch<SendMessageResponse>({
    endpoint: "/conversations/messages",
    method: "POST",
    body,
    apiKey: params.apiKey,
  });

  return {
    conversationId: result.conversationId,
    messageId: result.messageId ?? result.messageIds?.[0],
  };
}
