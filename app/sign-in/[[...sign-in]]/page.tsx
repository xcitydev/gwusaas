"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 font-medium text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition";
const labelCls =
  "text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1";
const primaryBtnCls =
  "w-full h-12 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest amber-glow hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed";
const secondaryBtnCls =
  "w-full h-12 rounded-xl border border-white/10 hover:bg-white/5 font-bold text-foreground transition flex items-center justify-center gap-3";
const errorCls = "text-xs text-red-400 font-medium";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 gradient-bg">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Welcome Back</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white/90">
            Sign in to keep growing
          </h1>
        </div>

        <div className="glass-card rounded-3xl border border-white/5 p-8 shadow-card backdrop-blur-md space-y-6">
          <SignIn.Root>
            {/* ───────── Step 1: choose method ───────── */}
            <SignIn.Step name="start" className="space-y-5">
              <Clerk.GlobalError className={errorCls} />

              <Clerk.Connection name="google" asChild>
                <button type="button" className={secondaryBtnCls}>
                  <Clerk.Loading scope="provider:google">
                    {(isLoading) =>
                      isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <GoogleIcon />
                          <span>Continue with Google</span>
                        </>
                      )
                    }
                  </Clerk.Loading>
                </button>
              </Clerk.Connection>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  or
                </span>
                <div className="flex-1 h-px bg-white/5" />
              </div>

              <Clerk.Field name="identifier" className="space-y-2">
                <Clerk.Label className={labelCls}>Email</Clerk.Label>
                <Clerk.Input className={inputCls} placeholder="you@email.com" />
                <Clerk.FieldError className={errorCls} />
              </Clerk.Field>

              <SignIn.Action submit asChild>
                <button type="submit" className={primaryBtnCls}>
                  <Clerk.Loading>
                    {(isLoading) =>
                      isLoading ? (
                        <span className="inline-flex items-center gap-2 justify-center">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Signing in...
                        </span>
                      ) : (
                        "Continue"
                      )
                    }
                  </Clerk.Loading>
                </button>
              </SignIn.Action>
            </SignIn.Step>

            {/* ───────── Step 2: choose strategy (e.g. password vs email code) ───────── */}
            <SignIn.Step name="choose-strategy" className="space-y-4">
              <Clerk.GlobalError className={errorCls} />
              <p className="text-sm text-muted-foreground text-center">
                How would you like to sign in?
              </p>
              <SignIn.SupportedStrategy name="email_code" asChild>
                <button type="button" className={secondaryBtnCls}>
                  Email me a code
                </button>
              </SignIn.SupportedStrategy>
              <SignIn.SupportedStrategy name="password" asChild>
                <button type="button" className={secondaryBtnCls}>
                  Use my password
                </button>
              </SignIn.SupportedStrategy>
            </SignIn.Step>

            {/* ───────── Step 3: verifications ───────── */}
            <SignIn.Step name="verifications" className="space-y-5">
              <Clerk.GlobalError className={errorCls} />

              <SignIn.Strategy name="password">
                <Clerk.Field name="password" className="space-y-2">
                  <Clerk.Label className={labelCls}>Password</Clerk.Label>
                  <Clerk.Input
                    className={inputCls}
                    type="password"
                    placeholder="••••••••"
                  />
                  <Clerk.FieldError className={errorCls} />
                </Clerk.Field>
                <SignIn.Action submit asChild>
                  <button type="submit" className={cn(primaryBtnCls, "mt-2")}>
                    <Clerk.Loading>
                      {(isLoading) =>
                        isLoading ? (
                          <span className="inline-flex items-center gap-2 justify-center">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Signing in...
                          </span>
                        ) : (
                          "Sign In"
                        )
                      }
                    </Clerk.Loading>
                  </button>
                </SignIn.Action>
                <SignIn.Action navigate="forgot-password" asChild>
                  <button
                    type="button"
                    className="w-full text-xs text-muted-foreground hover:text-primary transition"
                  >
                    Forgot password?
                  </button>
                </SignIn.Action>
              </SignIn.Strategy>

              <SignIn.Strategy name="email_code">
                <p className="text-sm text-muted-foreground">
                  We sent a code to your email. Enter it below.
                </p>
                <Clerk.Field name="code" className="space-y-2">
                  <Clerk.Label className={labelCls}>Verification Code</Clerk.Label>
                  <Clerk.Input
                    className={inputCls}
                    placeholder="000000"
                  />
                  <Clerk.FieldError className={errorCls} />
                </Clerk.Field>
                <SignIn.Action submit asChild>
                  <button type="submit" className={cn(primaryBtnCls, "mt-2")}>
                    <Clerk.Loading>
                      {(isLoading) =>
                        isLoading ? (
                          <span className="inline-flex items-center gap-2 justify-center">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Verifying...
                          </span>
                        ) : (
                          "Verify"
                        )
                      }
                    </Clerk.Loading>
                  </button>
                </SignIn.Action>
              </SignIn.Strategy>
            </SignIn.Step>

            {/* ───────── Forgot password flow ───────── */}
            <SignIn.Step name="forgot-password" className="space-y-5">
              <Clerk.GlobalError className={errorCls} />
              <p className="text-sm text-muted-foreground">
                We&apos;ll send a reset code to your email.
              </p>
              <SignIn.SupportedStrategy name="reset_password_email_code" asChild>
                <button type="button" className={primaryBtnCls}>
                  Send Reset Code
                </button>
              </SignIn.SupportedStrategy>
              <SignIn.Action navigate="previous" asChild>
                <button
                  type="button"
                  className="w-full text-xs text-muted-foreground hover:text-primary transition"
                >
                  ← Go back
                </button>
              </SignIn.Action>
            </SignIn.Step>

            {/* ───────── Reset password ───────── */}
            <SignIn.Step name="reset-password" className="space-y-5">
              <Clerk.GlobalError className={errorCls} />
              <Clerk.Field name="password" className="space-y-2">
                <Clerk.Label className={labelCls}>New Password</Clerk.Label>
                <Clerk.Input
                  className={inputCls}
                  type="password"
                  placeholder="••••••••"
                />
                <Clerk.FieldError className={errorCls} />
              </Clerk.Field>
              <Clerk.Field name="confirmPassword" className="space-y-2">
                <Clerk.Label className={labelCls}>Confirm Password</Clerk.Label>
                <Clerk.Input
                  className={inputCls}
                  type="password"
                  placeholder="••••••••"
                />
                <Clerk.FieldError className={errorCls} />
              </Clerk.Field>
              <SignIn.Action submit asChild>
                <button type="submit" className={primaryBtnCls}>
                  Reset Password
                </button>
              </SignIn.Action>
            </SignIn.Step>
          </SignIn.Root>

          <div className="pt-4 border-t border-white/5 text-center">
            <p className="text-xs text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/sign-up"
                className="text-primary hover:underline font-bold"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground mt-6 font-bold">
          Secured by Clerk
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.95l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
