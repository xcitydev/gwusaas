import { DM_Sans, JetBrains_Mono, Syne } from "next/font/google";
import SideBar from "@/components/SideBar";
import { HeroSection } from "@/components/ai-studio/HeroSection";
import { PersonaCards } from "@/components/ai-studio/PersonaCards";
import { DemoChat } from "@/components/ai-studio/DemoChat";
import { FeatureGrid } from "@/components/ai-studio/FeatureGrid";
import { OpenClawSection } from "@/components/ai-studio/OpenClawSection";
import { WaitlistForm } from "@/components/ai-studio/WaitlistForm";
import { FaqAccordion } from "@/components/ai-studio/FaqAccordion";

const syne = Syne({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-syne" });
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-sans",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
});

export default function AiStudioPage() {
  return (
    <SideBar>
      <div
        className={`${syne.variable} ${dmSans.variable} ${jetbrains.variable} min-h-screen bg-[#0A0A0B] text-[#F0F0F5]`}
      >
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 py-8 md:px-8 md:py-10">
          <HeroSection />
          <PersonaCards />
          <DemoChat />
          <FeatureGrid />
          <OpenClawSection />
          <WaitlistForm />
          <FaqAccordion />
        </div>
      </div>

      <style>{`
        .font-syne {
          font-family: var(--font-syne), system-ui, sans-serif;
        }
        .ai-reveal {
          opacity: 0;
          transform: translateY(16px);
          animation: ai-fade-up 0.7s ease forwards;
        }
        .ai-hero {
          position: relative;
          background-image: radial-gradient(circle, rgba(245, 166, 35, 0.1) 1px, transparent 1px);
          background-size: 32px 32px;
          animation: drift 20s linear infinite;
        }
        .hero-orb {
          background: rgba(245, 166, 35, 0.15);
          filter: blur(48px);
          animation: pulse-orb 5s ease-in-out infinite;
        }
        .ai-card-lift {
          transition: transform 240ms ease, box-shadow 240ms ease, border-color 240ms ease;
        }
        .ai-card-lift:hover {
          transform: translateY(-4px);
          border-color: rgba(245, 166, 35, 0.8);
          box-shadow: 0 0 0 1px rgba(245, 166, 35, 0.4), 0 20px 50px rgba(245, 166, 35, 0.12);
        }
        .bot-avatar-glow-agency {
          filter: drop-shadow(0 0 12px rgba(245, 166, 35, 0.42));
          animation: pulse-glow-agency 3.2s ease-in-out infinite;
        }
        .bot-avatar-glow-client {
          filter: drop-shadow(0 0 12px rgba(79, 209, 197, 0.42));
          animation: pulse-glow-client 3.2s ease-in-out infinite;
        }
        .typing-cursor {
          margin-left: 2px;
          animation: blink 1s steps(2, start) infinite;
        }
        .flow-line {
          stroke-dasharray: 8 4;
          animation: flow 2s linear infinite;
        }
        @keyframes ai-fade-up {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes drift {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 32px 32px;
          }
        }
        @keyframes pulse-orb {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.72;
          }
          50% {
            transform: scale(1.08);
            opacity: 1;
          }
        }
        @keyframes pulse-glow-agency {
          0%,
          100% {
            filter: drop-shadow(0 0 8px rgba(245, 166, 35, 0.3));
          }
          50% {
            filter: drop-shadow(0 0 22px rgba(245, 166, 35, 0.75));
          }
        }
        @keyframes pulse-glow-client {
          0%,
          100% {
            filter: drop-shadow(0 0 8px rgba(79, 209, 197, 0.3));
          }
          50% {
            filter: drop-shadow(0 0 22px rgba(79, 209, 197, 0.75));
          }
        }
        @keyframes blink {
          50% {
            opacity: 0;
          }
        }
        @keyframes flow {
          to {
            stroke-dashoffset: -24;
          }
        }
      `}</style>
    </SideBar>
  );
}
