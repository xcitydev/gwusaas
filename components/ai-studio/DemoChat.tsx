"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BotAvatar } from "./BotAvatar";

type Message = { role: "user" | "bot"; text: string };

const agencyMessages: Message[] = [
  { role: "user", text: "Give me a morning briefing" },
  {
    role: "bot",
    text:
      "Good morning. Here's your agency snapshot for today:\n\n📊 Active clients: 7\n🟢 On track: 5 clients\n🟡 Needs attention: Bishop AI — DM campaign reply rate dropped to 4%\n🔴 At risk: FitLife Brand — no content posted in 9 days\n\n💰 Pipeline: $14,500 in open deals\n🗓 Calls booked today: 3\n\nRecommended action: Review Bishop AI's DM script — I've drafted an updated version for you.",
  },
  { role: "user", text: "What's wrong with Bishop AI's campaign?" },
  {
    role: "bot",
    text:
      "Their current script is 47 words — too long for cold DMs.\nAverage reply rate for scripts over 40 words is 2.1%.\nUnder 25 words: 8.4%.\n\nI've drafted a shorter version. Want me to show you?",
  },
];

const clientMessages: Message[] = [
  { role: "user", text: "How are my campaigns doing this week?" },
  {
    role: "bot",
    text:
      "Here's your week at a glance:\n\n✉️ DMs sent: 312\n💬 Replies received: 28 (9% rate — up from 6% last week)\n📞 Calls booked: 4\n💰 New deals: 1 closed ($1,200/mo)\n\nYour best performing message this week was the one starting\nwith 'Quick question about your content strategy...'\n\nWant me to use that as your new default script?",
  },
  { role: "user", text: "Yes, update the script" },
  {
    role: "bot",
    text:
      "Done. Your campaign script has been updated.\nI've also scheduled a follow-up sequence for the 28 people\nwho replied but haven't booked a call yet.\n\nAnything else you need?",
  },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function TypewriterChat({
  title,
  variant,
  messages,
}: {
  title: string;
  variant: "agency" | "client";
  messages: Message[];
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [started, setStarted] = useState(false);
  const [visible, setVisible] = useState<Message[]>([]);
  const [typingIndex, setTypingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!ref.current || started) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setStarted(true);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let canceled = false;
    const run = async () => {
      for (let i = 0; i < messages.length; i += 1) {
        if (canceled) return;
        const msg = messages[i];
        if (msg.role === "user") {
          setVisible((prev) => [...prev, msg]);
          await sleep(500);
          continue;
        }
        setVisible((prev) => [...prev, { role: "bot", text: "" }]);
        setTypingIndex(i);
        for (let ch = 0; ch < msg.text.length; ch += 1) {
          if (canceled) return;
          const part = msg.text.slice(0, ch + 1);
          setVisible((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "bot", text: part };
            return next;
          });
          await sleep(12);
        }
        setTypingIndex(null);
        await sleep(500);
      }
    };
    void run();
    return () => {
      canceled = true;
    };
  }, [messages, started]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [visible, typingIndex]);

  return (
    <Card ref={ref} className="border-[#2B2B30] bg-[#17171C]">
      <CardHeader className="border-b border-[#2B2B30]">
        <CardTitle className="flex items-center gap-2 text-sm text-[#F0F0F5]">
          <BotAvatar variant={variant} className="h-7 w-7" />
          {title}
          <span className="ml-auto text-xs text-[#8EA58A]">● Online</span>
        </CardTitle>
      </CardHeader>
      <CardContent ref={scrollerRef} className="max-h-[390px] space-y-3 overflow-y-auto border-l-4 border-l-[#F5A623] p-4">
        {visible.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={message.role === "user" ? "ml-auto max-w-[85%] rounded-lg bg-[#111114] px-3 py-2 text-sm text-[#DFDFE8]" : "max-w-[90%] rounded-lg bg-[#1D1D24] px-3 py-2 text-sm text-[#ECECF7]"}
          >
            <p className={message.role === "bot" ? "font-mono whitespace-pre-wrap text-[12.5px]" : "whitespace-pre-wrap"}>
              {message.text}
              {message.role === "bot" && typingIndex === index ? <span className="typing-cursor">|</span> : null}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function DemoChat() {
  const chatDefs = useMemo(
    () => [
      {
        key: "agency",
        title: "Agency Chief of Staff",
        variant: "agency" as const,
        messages: agencyMessages,
      },
      {
        key: "client",
        title: "Your AI Assistant",
        variant: "client" as const,
        messages: clientMessages,
      },
    ],
    [],
  );

  return (
    <section id="demo" className="space-y-5">
      <div className="ai-reveal" style={{ animationDelay: "140ms" }}>
        <h2 className="font-syne text-3xl font-bold text-[#F0F0F5] md:text-4xl">
          Ask anything. Get answers instantly.
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {chatDefs.map((chat, index) => (
          <div key={chat.key} className="ai-reveal" style={{ animationDelay: `${260 + index * 150}ms` }}>
            <TypewriterChat title={chat.title} variant={chat.variant} messages={chat.messages} />
          </div>
        ))}
      </div>
    </section>
  );
}
