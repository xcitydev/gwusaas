"use client";

import { useEffect, useMemo, useState } from "react";
import SideBar from "@/components/SideBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Inbox,
  Loader2,
  MessageSquare,
  Phone,
  Mail,
  RefreshCw,
  Search,
  PlugZap,
  Send,
  Sparkles,
  Mic,
} from "lucide-react";
import Link from "next/link";
import { AutomationStatusBanner } from "@/components/automations/AutomationStatusBanner";

type ConversationSummary = {
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
};

type ConversationMessage = {
  id: string;
  conversationId: string;
  contactId: string;
  body?: string;
  direction: string;
  status?: string;
  dateAdded: string;
  messageType?: string;
};

type ConversationsResponse = {
  success: boolean;
  data?: {
    conversations: ConversationSummary[];
    total: number;
    locationId: string;
    locationName: string;
  };
  error?: string;
};

type MessagesResponse = {
  success: boolean;
  data?: {
    messages: ConversationMessage[];
    nextPage: boolean;
    lastMessageId?: string;
  };
  error?: string;
};

type FilterTab = "all" | "unread" | "starred" | "recents";

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "unread", label: "Unread" },
  { value: "all", label: "All" },
  { value: "recents", label: "Recents" },
  { value: "starred", label: "Starred" },
];

function formatTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDateGroup(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (isToday) return "Today";
  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

export default function ConversationsPage() {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [query, setQuery] = useState("");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [locationName, setLocationName] = useState<string>("");
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsConnection, setNeedsConnection] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // ── Reply composer state ──
  const [replyText, setReplyText] = useState("");
  const [replyIntent, setReplyIntent] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingVoice, setSendingVoice] = useState(false);
  const [draftReasoning, setDraftReasoning] = useState<string | null>(null);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const loadConversations = async () => {
    setLoadingList(true);
    setError(null);
    try {
      const search = new URLSearchParams();
      search.set("status", filter);
      search.set("limit", "50");
      if (query.trim()) search.set("query", query.trim());
      const res = await fetch(`/api/ghl/conversations?${search.toString()}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as ConversationsResponse;
      if (!json.success || !json.data) {
        if (
          json.error?.toLowerCase().includes("no ghl connection") ||
          res.status === 400
        ) {
          setNeedsConnection(true);
        }
        throw new Error(json.error || "Failed to load conversations");
      }
      setNeedsConnection(false);
      setConversations(json.data.conversations);
      setLocationName(json.data.locationName);
      if (!selectedId && json.data.conversations.length > 0) {
        setSelectedId(json.data.conversations[0].id);
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to load conversations";
      setError(message);
    } finally {
      setLoadingList(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    setMessages([]);
    try {
      const res = await fetch(
        `/api/ghl/conversations/${conversationId}/messages?limit=100`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as MessagesResponse;
      if (!json.success || !json.data) {
        throw new Error(json.error || "Failed to load messages");
      }
      // GHL returns newest-first; show oldest-first in the thread.
      const ordered = [...json.data.messages].sort(
        (a, b) =>
          new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime(),
      );
      setMessages(ordered);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to load messages";
      toast.error(message);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    if (selectedId) loadMessages(selectedId);
    // Reset the composer whenever the user opens a different thread.
    setReplyText("");
    setReplyIntent("");
    setDraftReasoning(null);
  }, [selectedId]);

  const handleAiDraft = async () => {
    if (!selectedId) return;
    setDrafting(true);
    setDraftReasoning(null);
    try {
      const res = await fetch(
        `/api/ghl/conversations/${selectedId}/ai-draft`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent: replyIntent.trim() || undefined,
            channel: selected?.lastMessageType?.replace("TYPE_", "") ?? "SMS",
          }),
        },
      );
      const json = (await res.json()) as {
        success: boolean;
        data?: { reply: string; reasoning?: string; intent?: string };
        error?: string;
      };
      if (!json.success || !json.data) {
        throw new Error(json.error || "AI draft failed");
      }
      setReplyText(json.data.reply);
      setDraftReasoning(json.data.reasoning ?? null);
      toast.success(
        json.data.intent
          ? `Draft ready (${json.data.intent})`
          : "Draft ready",
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Draft failed";
      toast.error(msg);
    } finally {
      setDrafting(false);
    }
  };

  const resolveChannel = (
    raw?: string,
  ): "SMS" | "Email" | "WhatsApp" | "IG" | "FB" | "Custom" => {
    const r = (raw ?? "").replace("TYPE_", "").toUpperCase();
    if (r === "EMAIL") return "Email";
    if (r === "WHATSAPP") return "WhatsApp";
    if (r === "IG" || r === "INSTAGRAM") return "IG";
    if (r === "FB" || r === "FACEBOOK") return "FB";
    return "SMS";
  };

  const handleSend = async () => {
    if (!selectedId || !selected) return;
    const text = replyText.trim();
    if (!text) {
      toast.error("Type a message first");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(
        `/api/ghl/conversations/${selectedId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            type: resolveChannel(selected.lastMessageType),
            contactId: selected.contactId,
          }),
        },
      );
      const json = (await res.json()) as {
        success: boolean;
        error?: string;
      };
      if (!json.success) {
        throw new Error(json.error || "Send failed");
      }
      toast.success("Reply sent");
      setReplyText("");
      setReplyIntent("");
      setDraftReasoning(null);
      // Refresh the thread so the new outbound message appears.
      await loadMessages(selectedId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Send failed";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const handleSendVoice = async () => {
    if (!selectedId || !selected) return;
    const text = replyText.trim();
    if (!text) {
      toast.error("Draft or type a reply first — that's what gets spoken.");
      return;
    }
    setSendingVoice(true);
    try {
      const res = await fetch(
        `/api/ghl/conversations/${selectedId}/voice-reply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            channel: resolveChannel(selected.lastMessageType),
            contactId: selected.contactId,
          }),
        },
      );
      const json = (await res.json()) as {
        success: boolean;
        error?: string;
        audioUrl?: string;
      };
      if (!json.success) {
        throw new Error(json.error || "Voice reply failed");
      }
      toast.success("Voice reply sent");
      setReplyText("");
      setReplyIntent("");
      setDraftReasoning(null);
      await loadMessages(selectedId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Voice reply failed";
      toast.error(msg);
    } finally {
      setSendingVoice(false);
    }
  };

  if (needsConnection) {
    return (
      <SideBar>
        <div className="flex-1 p-6 md:p-8 max-w-3xl mx-auto">
          <Card className="glass-card border-white/5 p-10 text-center space-y-4">
            <PlugZap className="h-10 w-10 text-primary mx-auto" />
            <div>
              <h2 className="text-2xl font-bold">Connect GoHighLevel first</h2>
              <p className="text-muted-foreground mt-2">
                Hook up your GHL sub-account in Settings, then come back to view
                your conversations here.
              </p>
            </div>
            <div className="pt-2">
              <Button asChild className="amber-glow font-bold uppercase tracking-widest text-xs">
                <Link href="/dashboard/settings">Open Settings</Link>
              </Button>
            </div>
          </Card>
        </div>
      </SideBar>
    );
  }

  return (
    <SideBar>
      <div className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Inbox className="h-6 w-6 text-primary" /> Conversations
            </h2>
            <p className="text-muted-foreground text-sm">
              {locationName ? `Synced from ${locationName}` : "GoHighLevel inbox"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadConversations}
            disabled={loadingList}
            className="border-white/10 font-bold uppercase tracking-widest text-xs"
          >
            {loadingList ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Refresh</span>
          </Button>
        </div>

        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-160px)]">
          {/* LIST */}
          <Card className="glass-card border-white/5 col-span-12 md:col-span-4 lg:col-span-3 flex flex-col overflow-hidden p-0">
            <div className="p-3 border-b border-white/5 space-y-3">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") loadConversations();
                  }}
                  placeholder="Search conversations…"
                  className="bg-white/5 border-white/10 pl-9 h-9"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {FILTER_TABS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setFilter(t.value)}
                    className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border transition-colors ${
                      filter === t.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white/5 text-muted-foreground border-white/10 hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingList ? (
                <div className="p-8 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="p-6 text-sm text-red-400">{error}</div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No conversations found for this filter.
                </div>
              ) : (
                conversations.map((c) => {
                  const name = c.fullName || c.contactName || "Unknown";
                  const isActive = c.id === selectedId;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full text-left p-3 border-b border-white/5 hover:bg-white/5 transition-colors ${
                        isActive ? "bg-white/5" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-black shrink-0">
                          {initials(name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-bold truncate">{name}</p>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {formatTime(c.lastMessageDate)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {c.lastMessageBody?.trim() || "—"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {c.unreadCount && c.unreadCount > 0 ? (
                              <Badge className="bg-primary text-primary-foreground text-[10px] h-4 px-1.5">
                                {c.unreadCount}
                              </Badge>
                            ) : null}
                            {c.lastMessageType ? (
                              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                                {c.lastMessageType.replace("TYPE_", "")}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          {/* THREAD */}
          <Card className="glass-card border-white/5 col-span-12 md:col-span-8 lg:col-span-6 flex flex-col overflow-hidden p-0">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                Select a conversation to view messages.
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-black">
                      {initials(selected.fullName || selected.contactName)}
                    </div>
                    <div>
                      <p className="font-bold">
                        {selected.fullName || selected.contactName || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selected.phone || selected.email || "No contact info"}
                      </p>
                    </div>
                  </div>
                </div>

                <AutomationStatusBanner conversationId={selectedId} />

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loadingMessages ? (
                    <div className="p-8 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center pt-8">
                      No messages in this conversation yet.
                    </p>
                  ) : (
                    <MessageList messages={messages} />
                  )}
                </div>

                <div className="p-3 border-t border-white/5 space-y-2">
                  <Input
                    value={replyIntent}
                    onChange={(e) => setReplyIntent(e.target.value)}
                    placeholder="Optional intent for AI draft (e.g. 'qualify with budget question', 'book a 20-min call')"
                    className="bg-white/5 border-white/10 h-9 text-xs"
                    disabled={drafting || sending}
                  />
                  <div className="flex items-end gap-2">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type a reply, or click AI Draft to generate one based on the thread."
                      rows={3}
                      className="bg-white/5 border-white/10 resize-none flex-1"
                      disabled={sending}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          (e.metaKey || e.ctrlKey) &&
                          !sending &&
                          replyText.trim()
                        ) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAiDraft}
                        disabled={drafting || sending}
                        className="border-white/10 font-bold uppercase tracking-widest text-[10px]"
                        title="Generate a reply based on the conversation"
                      >
                        {drafting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        <span className="ml-1.5 hidden sm:inline">AI Draft</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSendVoice}
                        disabled={
                          sendingVoice || sending || !replyText.trim()
                        }
                        className="border-white/10 font-bold uppercase tracking-widest text-[10px]"
                        title="Send the reply as a voice note in your cloned voice"
                      >
                        {sendingVoice ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Mic className="h-3.5 w-3.5" />
                        )}
                        <span className="ml-1.5 hidden sm:inline">
                          Send voice
                        </span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSend}
                        disabled={sending || sendingVoice || !replyText.trim()}
                        className="amber-glow font-bold uppercase tracking-widest text-[10px]"
                      >
                        {sending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        <span className="ml-1.5 hidden sm:inline">Send</span>
                      </Button>
                    </div>
                  </div>
                  {draftReasoning && (
                    <p className="text-[10px] text-muted-foreground italic">
                      <Sparkles className="inline h-3 w-3 mr-1 text-primary" />
                      {draftReasoning}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    Cmd/Ctrl + Enter to send. Channel auto-detected from the
                    thread (
                    <span className="font-mono">
                      {selected.lastMessageType?.replace("TYPE_", "") || "SMS"}
                    </span>
                    ).
                  </p>
                </div>
              </>
            )}
          </Card>

          {/* CONTACT DETAILS */}
          <Card className="glass-card border-white/5 hidden lg:flex col-span-3 flex-col overflow-hidden p-0">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
                Contact details will appear here.
              </div>
            ) : (
              <div className="p-5 space-y-4 overflow-y-auto">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                    Contact Details
                  </p>
                  <p className="text-lg font-bold mt-1">
                    {selected.fullName || selected.contactName || "Unknown"}
                  </p>
                </div>
                <Separator className="bg-white/5" />
                <DetailRow
                  icon={<Phone className="h-3.5 w-3.5" />}
                  label="Phone"
                  value={selected.phone}
                />
                <DetailRow
                  icon={<Mail className="h-3.5 w-3.5" />}
                  label="Email"
                  value={selected.email}
                />
                <DetailRow
                  icon={<MessageSquare className="h-3.5 w-3.5" />}
                  label="Channel"
                  value={selected.lastMessageType?.replace("TYPE_", "")}
                />
                <Separator className="bg-white/5" />
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                    Contact ID
                  </p>
                  <p className="text-xs font-mono mt-1 break-all">
                    {selected.contactId}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                    Conversation ID
                  </p>
                  <p className="text-xs font-mono mt-1 break-all">
                    {selected.id}
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </SideBar>
  );
}

function MessageList({ messages }: { messages: ConversationMessage[] }) {
  const groups: { date: string; items: ConversationMessage[] }[] = [];
  let currentDate = "";
  for (const m of messages) {
    const dateKey = formatDateGroup(m.dateAdded);
    if (dateKey !== currentDate) {
      currentDate = dateKey;
      groups.push({ date: dateKey, items: [m] });
    } else {
      groups[groups.length - 1].items.push(m);
    }
  }

  return (
    <>
      {groups.map((g) => (
        <div key={g.date} className="space-y-3">
          <div className="flex items-center justify-center">
            <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground bg-white/5 rounded-full px-3 py-1">
              {g.date}
            </span>
          </div>
          {g.items.map((m) => {
            const isOutbound = m.direction === "outbound";
            return (
              <div
                key={m.id}
                className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap text-white ${
                    isOutbound
                      ? "bg-primary/15 border border-primary/20"
                      : "bg-white/5 border border-white/5"
                  }`}
                >
                  <p>{m.body || <span className="italic opacity-60">(no body)</span>}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 text-right">
                    {formatTime(m.dateAdded)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className="text-sm mt-1 break-all">{value || "—"}</p>
    </div>
  );
}
