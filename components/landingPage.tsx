"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  Linkedin,
  TicketIcon as TikTok,
} from "lucide-react";
import { useEffect, useState } from "react";
import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";

const FloatingProfile = ({
  src,
  className,
  delay = 0,
}: {
  src: string;
  className: string;
  delay?: number;
}) => (
  <motion.div
    className={`absolute w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden ${className}`}
    initial={{ opacity: 0, scale: 0, rotate: -180 }}
    animate={{
      opacity: 1,
      scale: 1,
      rotate: 0,
      y: [0, -10, 0],
      x: [0, 5, 0],
    }}
    transition={{
      delay,
      duration: 0.8,
      ease: "easeOut",
      y: { repeat: Number.POSITIVE_INFINITY, duration: 4, ease: "easeInOut" },
      x: { repeat: Number.POSITIVE_INFINITY, duration: 6, ease: "easeInOut" },
    }}
    whileHover={{
      scale: 1.2,
      rotate: 10,
      transition: { duration: 0.2 },
    }}
  >
    <img
      src={src || "/placeholder.svg"}
      alt="Team member"
      className="w-full h-full object-cover"
    />
  </motion.div>
);

const FloatingIcon = ({
  icon: Icon,
  className,
  delay = 0,
}: {
  icon: any;
  className: string;
  delay?: number;
}) => (
  <motion.div
    className={`absolute w-10 h-10 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center ${className}`}
    initial={{ opacity: 0, scale: 0, rotate: 90 }}
    animate={{
      opacity: 1,
      scale: 1,
      rotate: 0,
      y: [0, -15, 0],
    }}
    transition={{
      delay,
      duration: 0.8,
      ease: "easeOut",
      y: { repeat: Number.POSITIVE_INFINITY, duration: 5, ease: "easeInOut" },
    }}
    whileHover={{
      scale: 1.3,
      rotate: 15,
      backgroundColor: "rgba(255, 111, 97, 0.2)",
      transition: { duration: 0.2 },
    }}
  >
    <Icon className="w-5 h-5 text-white" />
  </motion.div>
);

const FloatingSocialIcon = ({
  icon: Icon,
  className,
  delay = 0,
  connectTo,
}: {
  icon: any;
  className: string;
  delay?: number;
  connectTo?: string;
}) => (
  <motion.div
    className={`absolute w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center ${className}`}
    initial={{ opacity: 0, scale: 0, rotate: -180 }}
    animate={{
      opacity: 1,
      scale: 1,
      rotate: 0,
      y: [0, -10, 0],
      x: [0, 5, 0],
    }}
    transition={{
      delay,
      duration: 0.8,
      ease: "easeOut",
      y: { repeat: Number.POSITIVE_INFINITY, duration: 4, ease: "easeInOut" },
      x: { repeat: Number.POSITIVE_INFINITY, duration: 6, ease: "easeInOut" },
    }}
    whileHover={{
      scale: 1.3,
      rotate: 10,
      backgroundColor: "rgba(255, 215, 0, 0.2)",
      borderColor: "rgba(255, 215, 0, 0.5)",
      transition: { duration: 0.2 },
    }}
  >
    <Icon className="w-7 h-7 text-white" />
    {connectTo && (
      <motion.div
        className="connecting-line"
        style={{
          width: "60px",
          top: "50%",
          left: "100%",
          transformOrigin: "left center",
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: delay + 0.5, duration: 1 }}
      />
    )}
  </motion.div>
);

const AnimatedParticles = () => {
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number; delay: number }>
  >([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-1 h-1 bg-white/20 rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

export default function LandingPage() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 300], [0, -50]);
  const y2 = useTransform(scrollY, [0, 300], [0, -100]);

  return (
    <div className="min-h-screen gradient-bg overflow-hidden relative">
      <AnimatedParticles />

      {/* Header */}
      <motion.header
        className="flex items-center justify-between p-6 relative z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ y: y1 }}
      >
        <motion.div
          className="flex items-center space-x-3"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <motion.div
            className="w-10 h-10 bg-gradient-to-br from-primary to-yellow-400 rounded-lg flex items-center justify-center shadow-lg"
            animate={{
              boxShadow: [
                "0 0 0px rgba(255, 215, 0, 0)",
                "0 0 20px rgba(255, 215, 0, 0.5)",
                "0 0 0px rgba(255, 215, 0, 0)",
              ],
            }}
            transition={{
              duration: 3,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          >
            <span className="text-black font-bold text-lg">G</span>
          </motion.div>
          <span className="text-white font-bold text-2xl tracking-wide">
            GWU Agency
          </span>
        </motion.div>

        <nav className="hidden md:flex items-center space-x-8">
          {["Services", "About", "Contact"].map((item, index) => (
            <motion.a
              key={item}
              href="#"
              className="text-white/80 hover:text-primary transition-colors font-medium"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.3 }}
              whileHover={{
                y: -2,
                color: "#ffd700",
                transition: { duration: 0.2 },
              }}
            >
              {item}
            </motion.a>
          ))}
        </nav>

        <div className="flex items-center space-x-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <SignedIn>
              <Link href="/dashboard" className="text-white border-white/20 ">
                Log In
              </Link>
            </SignedIn>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <SignUpButton
              forceRedirectUrl={"/onboarding"}
              fallbackRedirectUrl={"/onboarding"}
              signInFallbackRedirectUrl={"/onboarding"}
              signInForceRedirectUrl={"/onboarding"}
            >
              <Button className="bg-primary text-black hover:bg-primary/90 font-semibold">
                Get Started
              </Button>
            </SignUpButton>
          </motion.div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="flex items-center justify-between px-6 py-12 max-w-7xl mx-auto relative min-h-[70vh]">
        {/* Left Content */}
        <motion.div
          className="flex-1 max-w-2xl"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{ y: y1 }}
        >
          <motion.h1
            className="text-6xl md:text-7xl font-bold text-white leading-tight mb-8 text-balance"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Unlock Elite Marketing Talent That Drives{" "}
            <motion.span
              className="text-primary inline-block"
              animate={{
                textShadow: [
                  "0 0 0px rgba(255, 215, 0, 0)",
                  "0 0 30px rgba(255, 215, 0, 0.8)",
                  "0 0 0px rgba(255, 215, 0, 0)",
                ],
              }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            >
              Real Results!
            </motion.span>
          </motion.h1>

          <motion.div
            className="flex flex-col space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Button className="bg-primary text-black hover:bg-primary/90 px-8 py-6 text-lg rounded-full w-fit group relative overflow-hidden font-semibold shadow-lg">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-primary/20"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.6 }}
                />
                <SignedOut>
                  <SignUpButton
                    forceRedirectUrl={"/onboarding"}
                    fallbackRedirectUrl={"/onboarding"}
                    signInFallbackRedirectUrl={"/onboarding"}
                    signInForceRedirectUrl={"/onboarding"}
                  >
                    <span className="relative z-10 flex items-center cursor-pointer">
                      Start Your Project
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Link href="/dashboard">
                    <span className="relative z-10 flex items-center cursor-pointer">
                      View Dashboard
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Link>
                </SignedIn>
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Right Visual Area */}
        <motion.div
          className="flex-1 relative h-96 md:h-[500px]"
          style={{ y: y2 }}
        >
          {/* Central Ring */}
          <motion.div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border-2 border-white/30 flex flex-col items-center justify-center gold-glow"
            initial={{ opacity: 0, scale: 0, rotate: -180 }}
            animate={{
              opacity: 1,
              scale: 1,
              rotate: 0,
            }}
            transition={{
              duration: 1,
              delay: 0.5,
              type: "spring",
              stiffness: 100,
            }}
            whileHover={{
              scale: 1.1,
              rotate: 5,
              transition: { duration: 0.3 },
            }}
          >
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary/40"
              animate={{ rotate: 360 }}
              transition={{
                duration: 15,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            />

            <motion.span
              className="text-5xl font-bold text-white relative z-10"
              initial={{ opacity: 0, y: 20, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.6,
                delay: 1,
                type: "spring",
                stiffness: 200,
              }}
            >
              500+
            </motion.span>
            <motion.span
              className="text-primary text-lg relative z-10 font-semibold"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.2 }}
            >
              Elite Marketers
            </motion.span>
          </motion.div>

          <FloatingSocialIcon
            icon={Instagram}
            className="top-8 right-12"
            delay={1.5}
            connectTo="next"
          />
          <FloatingSocialIcon
            icon={Twitter}
            className="top-32 left-8"
            delay={1.7}
            connectTo="next"
          />
          <FloatingSocialIcon
            icon={Facebook}
            className="bottom-32 right-4"
            delay={1.9}
            connectTo="next"
          />
          <FloatingSocialIcon
            icon={Youtube}
            className="bottom-8 left-16"
            delay={2.1}
            connectTo="next"
          />
          <FloatingSocialIcon
            icon={Linkedin}
            className="top-1/2 right-2"
            delay={2.3}
            connectTo="next"
          />
          <FloatingSocialIcon
            icon={TikTok}
            className="top-1/2 left-2"
            delay={2.5}
          />

          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 1 }}
          >
            <motion.path
              d="M 100 50 Q 200 100 300 150 Q 400 200 350 300 Q 300 400 200 350 Q 100 300 150 200 Q 200 100 100 50"
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="1"
              fill="none"
              strokeDasharray="5,5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 3, delay: 2 }}
            />
          </svg>
        </motion.div>
      </div>

      {/* Bottom Client Logos */}
      <motion.div
        className="flex items-center justify-center space-x-12 px-6 py-8 opacity-60 "
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 0.6, y: 0 }}
        transition={{ duration: 0.8, delay: 1.5 }}
      >
        {["Meta", "Google", "TikTok", "Shopify", "Slack"].map((logo, index) => (
          <motion.span
            key={logo}
            className="text-white/60 font-medium text-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.6, y: 0 }}
            transition={{ delay: 1.7 + index * 0.1, duration: 0.5 }}
            whileHover={{
              opacity: 1,
              color: "#ffd700",
              y: -2,
              transition: { duration: 0.2 },
            }}
          >
            {logo}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}
