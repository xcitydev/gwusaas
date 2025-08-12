"use client"
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Users, TrendingUp, Shield, Zap, Globe } from "lucide-react";
import { SignedIn, SignedOut, SignUpButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const features = [
  {
    title: "Real-time Analytics",
    description: "Track your business performance with live data and insights",
    icon: BarChart3,
    color: "bg-blue-500",
  },
  {
    title: "Team Collaboration",
    description: "Work seamlessly with your team and clients in one platform",
    icon: Users,
    color: "bg-green-500",
  },
  {
    title: "Growth Tracking",
    description: "Monitor your growth metrics and optimize your strategies",
    icon: TrendingUp,
    color: "bg-purple-500",
  },
  {
    title: "Secure & Reliable",
    description: "Enterprise-grade security with 99.9% uptime guarantee",
    icon: Shield,
    color: "bg-orange-500",
  },
  {
    title: "Lightning Fast",
    description: "Optimized performance for the best user experience",
    icon: Zap,
    color: "bg-yellow-500",
  },
  {
    title: "Global Access",
    description: "Access your dashboard from anywhere in the world",
    icon: Globe,
    color: "bg-pink-500",
  },
];

export default function LandingPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <Badge className="mb-4" variant="secondary">
            Trusted by 1000+ Businesses
          </Badge>
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            GWU Client Dashboard
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            The complete solution for managing your business operations,
            analytics, and client relationships in one powerful platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <SignedOut>
              <SignUpButton
              
                forceRedirectUrl={"/dashboard"}
                fallbackRedirectUrl={"/dashboard"}
                signInFallbackRedirectUrl={"/dashboard"}
                signInForceRedirectUrl={"/dashboard"}
              >
                <Button size="lg" className="text-lg px-8 py-3">
                  Sign Up Now
                </Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Button onClick={() => router.push("/dashboard")} size="lg" className="text-lg px-8 py-3">
                View Dashboard
              </Button>
            </SignedIn>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything you need to grow your business
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="relative hover:shadow-lg transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg ${feature.color}`}>
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="text-center bg-white rounded-2xl p-12 shadow-lg">
          <h2 className="text-3xl font-bold mb-4">
            Ready to transform your business?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of businesses already using GWU Client Dashboard to
            streamline their operations and boost growth.
          </p>
          <Button size="lg" className="text-lg px-12 py-4">
            Get Started Today
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
