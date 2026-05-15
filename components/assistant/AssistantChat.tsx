"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavigateOutput = {
  found: boolean;
  id?: string;
  label?: string;
  href?: string;
  howTo?: string;
  requiredPlan?: string;
  message?: string;
};

export function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/assistant/chat" }),
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open, busy]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || busy) return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <>
      {/* Floating trigger */}
      <button
        type="button"
        aria-label={open ? "Close assistant" : "Open assistant"}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl amber-glow flex items-center justify-center hover:scale-105 transition-transform",
          open && "scale-90",
        )}
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageCircle className="h-5 w-5" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-24 right-6 z-40 w-[min(380px,calc(100vw-3rem))] h-[min(600px,calc(100vh-8rem))] rounded-2xl glass-card border border-white/10 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">Assistant</p>
                <p className="text-[10px] text-muted-foreground">
                  Ask where to go or how to do something
                </p>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
            >
              {messages.length === 0 && (
                <EmptyState
                  onPick={(prompt) => {
                    sendMessage({ text: prompt });
                  }}
                />
              )}

              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  role={m.role}
                  parts={m.parts}
                  onNavigate={(href) => {
                    router.push(href);
                    setOpen(false);
                  }}
                />
              ))}

              {busy && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Thinking...
                </div>
              )}

              {error && (
                <div className="text-xs text-red-400 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20">
                  Something went wrong: {error.message}
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="border-t border-white/5 p-3 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. I want to find new customers"
                disabled={busy}
                className="flex-1 h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  const suggestions = [
    "I want to find new customers",
    "How do I clone my voice?",
    "Make me a content plan",
    "Show me the AI phone agent",
  ];
  return (
    <div className="space-y-3 pt-2">
      <p className="text-xs text-muted-foreground px-1">
        Hey! Try one of these or type your own:
      </p>
      <div className="space-y-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="w-full text-left text-xs px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-primary/30 hover:bg-white/10 transition"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  role,
  parts,
  onNavigate,
}: {
  role: string;
  parts: Array<{ type: string; [k: string]: unknown }>;
  onNavigate: (href: string) => void;
}) {
  const isUser = role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] space-y-2",
          isUser ? "items-end" : "items-start",
        )}
      >
        {parts.map((part, i) => {
          if (part.type === "text") {
            const text = (part as { text?: string }).text ?? "";
            if (!text.trim()) return null;
            return (
              <div
                key={i}
                className={cn(
                  "rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                  isUser
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/5 border border-white/10 text-white/90",
                )}
              >
                {text}
              </div>
            );
          }

          if (part.type === "tool-navigateTo") {
            const p = part as unknown as {
              state: string;
              output?: NavigateOutput;
            };
            if (p.state !== "output-available" || !p.output) return null;
            const out = p.output;
            if (!out.found || !out.href || !out.label) return null;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onNavigate(out.href!)}
                className="w-full text-left rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition p-3 group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                      Open feature
                    </p>
                    <p className="font-bold text-sm truncate">{out.label}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
