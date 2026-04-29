"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Upload, 
  Instagram, 
  Globe, 
  MessageSquare, 
  Sparkles,
  ShieldCheck,
  Target,
  ListTodo
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import SideBar from "@/components/SideBar";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type OnboardingType = "real-estate" | "general" | "mass-dm" | "website" | "content";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [onboardingType, setOnboardingType] = useState<OnboardingType | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [outreachData, setOutreachData] = useState({
    username: "",
    password: "",
    backupCodes: "",
    idealClient: "",
    targetLocations: "", // Specific to Real Estate
    targetAccounts: "", // Specific to General (as string, will split)
    allowFollow: "yes",
    enableEngagement: "yes",
  });

  const [massDmData, setMassDmData] = useState({
    targetAccounts: "",
    outreachMessage: "",
    trafficDestination: "",
    dmCount: "",
    email: "",
    phone: "",
    comments: "",
  });

  const [websiteData, setWebsiteData] = useState({
    title: "",
    googleDriveLink: "",
    aboutUsSummary: "",
    features: "",
    brandElements: "",
    logoUrl: "",
  });

  const [contentData, setContentData] = useState({
    designTexts: "",
    logoUrl: "", // In a real app, this would be an upload
    designExamples: "",
    colors: "",
    googleDriveLink: "",
  });

  // Mutations
  const createOutreach = useMutation(api.outreachCampaigns.create);
  const createWebsite = useMutation(api.websiteProjects.create);
  const createContentDraft = useMutation(api.contentDrafts.create);
  const completeOnboarding = useMutation(api.profile.completeOnboarding);
  const resetOnboarding = useMutation(api.profile.resetOnboarding);

  const profile = useQuery(api.profile.getByClerkId, isLoaded && user?.id ? { clerkUserId: user.id } : "skip");

  const getSteps = () => {
    switch (onboardingType) {
      case "real-estate":
        return [
          { title: "Account Info", fields: ["username", "password", "backupCodes"] },
          { title: "Targeting", fields: ["idealClient", "targetLocations"] },
          { title: "Preferences", fields: ["allowFollow", "enableEngagement"] },
        ];
      case "general":
        return [
          { title: "Account Info", fields: ["username", "password", "backupCodes"] },
          { title: "Targeting", fields: ["idealClient", "targetAccounts"] },
          { title: "Preferences", fields: ["allowFollow", "enableEngagement"] },
        ];
      case "mass-dm":
        return [
          { title: "Campaign Info", fields: ["trafficDestination", "dmCount", "email", "phone"] },
          { title: "Targets", fields: ["targetAccounts"] },
          { title: "Message", fields: ["outreachMessage"] },
          { title: "Final Notes", fields: ["comments"] },
        ];
      case "website":
        return [
          { title: "Project Info", fields: ["title"] },
          { title: "Assets", fields: ["googleDriveLink"] },
          { title: "Content", fields: ["aboutUsSummary"] },
          { title: "Requirements", fields: ["features", "brandElements"] },
        ];
      case "content":
        return [
          { title: "Design Info", fields: ["designTexts", "designExamples", "colors"] },
          { title: "Assets", fields: ["googleDriveLink", "logoUrl"] },
        ];
      default:
        return [];
    }
  };

  const steps = getSteps();
  const progress = steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0;

  // Sync common information across forms for better UX
  useEffect(() => {
    // If they filled out outreach data, pre-fill the Mass DM traffic destination
    if (outreachData.username && !massDmData.trafficDestination) {
      setMassDmData(prev => ({ ...prev, trafficDestination: outreachData.username }));
    }
    // Pre-fill email from Clerk if available
    if (!massDmData.email && user?.primaryEmailAddress?.emailAddress) {
      setMassDmData(prev => ({ ...prev, email: user.primaryEmailAddress.emailAddress }));
    }
    if (!massDmData.phone && user?.primaryPhoneNumber?.phoneNumber) {
      setMassDmData(prev => ({ ...prev, phone: user.primaryPhoneNumber.phoneNumber }));
    }
  }, [outreachData.username, user, massDmData.email, massDmData.phone]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "website" | "content") => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        toast.error("File size must be less than 1MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (type === "website") {
          setWebsiteData({ ...websiteData, logoUrl: base64String });
        } else {
          setContentData({ ...contentData, logoUrl: base64String });
        }
        toast.success("Image uploaded successfully");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      setOnboardingType(null);
      setCurrentStep(0);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (onboardingType === "real-estate") {
        await createOutreach({
          campaignType: "real-estate",
          instagramUsername: outreachData.username,
          instagramPassword: outreachData.password,
          backupCodes: outreachData.backupCodes,
          idealClient: outreachData.idealClient,
          targetLocations: outreachData.targetLocations,
          allowFollow: outreachData.allowFollow === "yes",
          enableEngagement: outreachData.enableEngagement === "yes",
        });
      } else if (onboardingType === "general") {
        await createOutreach({
          campaignType: "general",
          instagramUsername: outreachData.username,
          instagramPassword: outreachData.password,
          backupCodes: outreachData.backupCodes,
          idealClient: outreachData.idealClient,
          targetAccounts: outreachData.targetAccounts.split("\n").filter(a => a.trim()),
          allowFollow: outreachData.allowFollow === "yes",
          enableEngagement: outreachData.enableEngagement === "yes",
        });
      } else if (onboardingType === "mass-dm") {
        await createOutreach({
          campaignType: "mass-dm",
          instagramUsername: massDmData.trafficDestination,
          targetAccounts: massDmData.targetAccounts.split("\n").filter(a => a.trim()),
          outreachScript: massDmData.outreachMessage,
          dmCount: massDmData.dmCount,
          contactEmail: massDmData.email,
          contactPhone: massDmData.phone,
          comments: massDmData.comments,
          allowFollow: false,
          enableEngagement: false,
        });
      } else if (onboardingType === "website") {
        await createWebsite({
          title: websiteData.title,
          features: websiteData.features,
          brandElements: websiteData.brandElements,
          aboutUsSummary: websiteData.aboutUsSummary,
          googleDriveLink: websiteData.googleDriveLink,
          logoUrl: websiteData.logoUrl,
        });
      } else if (onboardingType === "content") {
        await createContentDraft({
          contentType: "social_media_design",
          designTexts: contentData.designTexts.split("\n").filter(t => t.trim()),
          designExamples: contentData.designExamples,
          colors: contentData.colors,
          googleDriveLink: contentData.googleDriveLink,
          logoUrl: contentData.logoUrl,
        });
      }

      await completeOnboarding({ clerkUserId: user?.id as string });
      toast.success("Onboarding completed successfully!");
      router.push("/dashboard");
    } catch (error) {
      toast.error("Failed to complete onboarding. Please try again.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded || profile === undefined) {
    return (
      <div className="min-h-screen gradient-bg text-foreground flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
          <div className="absolute inset-0 animate-pulse bg-primary/10 rounded-full blur-xl"></div>
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Initializing protocols...</p>
      </div>
    );
  }

  // If onboarding is completed, show a reset option for testing
  if (profile?.onboardingCompleted && !onboardingType) {
    return (
      <SideBar>
        <div className="mx-auto w-full max-w-2xl p-6 md:p-8 space-y-8 text-center">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight text-white/90">Initialization Complete</h1>
            <p className="text-muted-foreground font-medium">
              You have already finished the onboarding process.
            </p>
          </div>
          <div className="flex flex-col gap-4 mt-8">
            <Button 
              className="h-14 rounded-2xl bg-primary text-black font-black uppercase tracking-widest amber-glow"
              onClick={() => router.push("/dashboard")}
            >
              Return to Dashboard
            </Button>
            <Button 
              variant="outline"
              className="h-14 rounded-2xl border-white/10 hover:bg-white/5 font-bold text-muted-foreground"
              onClick={async () => {
                await resetOnboarding({ clerkUserId: user?.id as string });
                toast.success("Onboarding status reset. You can now test the flow.");
                window.location.reload();
              }}
            >
              Reset Status & Test New Forms
            </Button>
          </div>
        </div>
      </SideBar>
    );
  }

  // Selection Screen
  if (!onboardingType) {
    return (
      <SideBar>
        <div className="mx-auto w-full max-w-5xl p-6 md:p-8 space-y-8">
          <div className="space-y-2 text-center">
            <div className="flex items-center justify-center gap-2 text-primary font-bold text-sm uppercase tracking-widest mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Phase One: Initialization</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white/90">Select Your Mission</h1>
            <p className="text-muted-foreground font-medium max-w-2xl mx-auto">
              Choose the service you're onboarding for. We'll collect the specific intelligence needed to deploy your campaign.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
            {[
              { id: "real-estate", title: "Real Estate Outreach", icon: Target, desc: "Targeted outreach for real estate professionals." },
              { id: "general", title: "General Outreach", icon: Instagram, desc: "Standard account growth and networking." },
              { id: "mass-dm", title: "Mass DM Blast", icon: MessageSquare, desc: "High-volume DM campaigns for maximum exposure." },
              { id: "website", title: "Website Project", icon: Globe, desc: "Custom web development and landing pages." },
              { id: "content", title: "Content Creation", icon: ListTodo, desc: "Professional design and social media content." },
            ].map((service) => (
              <motion.div
                key={service.id}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setOnboardingType(service.id as OnboardingType);
                  setCurrentStep(0);
                }}
                className="glass-card cursor-pointer group rounded-[2rem] p-6 space-y-4 border-white/5 hover:border-primary/20 hover:bg-white/10 transition-all shadow-card"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center transition-colors group-hover:bg-primary/20">
                  <service.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{service.title}</h3>
                  <p className="text-sm text-muted-foreground">{service.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </SideBar>
    );
  }

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-3xl p-6 md:p-8 space-y-8">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => {
            setOnboardingType(null);
            setCurrentStep(0);
          }} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Change Service
          </Button>
          <div className="text-sm font-bold text-primary uppercase tracking-widest">
            {onboardingType.replace("-", " ")}
          </div>
        </div>

        <Card className="glass-card border-white/5 rounded-[2rem] overflow-hidden shadow-card">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-black">{steps[currentStep].title}</CardTitle>
                <CardDescription className="font-medium">Step {currentStep + 1} of {steps.length}</CardDescription>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center amber-glow border border-primary/20">
                <CheckCircle className={cn("w-6 h-6 text-primary transition-opacity", currentStep === steps.length - 1 ? "opacity-100" : "opacity-20")} />
              </div>
            </div>
            <Progress value={progress} className="h-2 bg-white/5" />
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${onboardingType}-${currentStep}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Form Content Based on Service and Step */}
                {(onboardingType === "real-estate" || onboardingType === "general") && (
                  <>
                    {currentStep === 0 && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Instagram Username</Label>
                          <Input 
                            className="h-12 bg-white/5 border-white/5 rounded-xl px-4 font-medium focus:ring-primary/20" 
                            value={outreachData.username} 
                            onChange={e => setOutreachData({...outreachData, username: e.target.value})}
                            placeholder="@username"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Instagram Password</Label>
                          <Input 
                            type="password"
                            className="h-12 bg-white/5 border-white/5 rounded-xl px-4 font-medium focus:ring-primary/20" 
                            value={outreachData.password} 
                            onChange={e => setOutreachData({...outreachData, password: e.target.value})}
                            placeholder="••••••••"
                          />
                          <p className="text-[10px] text-muted-foreground italic px-1">Confidential: Only used for automated messaging.</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Backup Codes</Label>
                          <Textarea 
                            className="bg-white/5 border-white/5 rounded-2xl p-4 font-medium focus:ring-primary/20 min-h-[100px]" 
                            value={outreachData.backupCodes} 
                            onChange={e => setOutreachData({...outreachData, backupCodes: e.target.value})}
                            placeholder="Enter 8-digit codes (comma separated)"
                          />
                          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                              <ShieldCheck className="w-3 h-3" /> How to find backup codes
                            </p>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                              Settings & Privacy → Accounts Center → Password & Security → 2FA → Instagram → Additional Methods → Backup Codes
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {currentStep === 1 && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Ideal Client Description</Label>
                          <Textarea 
                            className="bg-white/5 border-white/5 rounded-2xl p-4 font-medium focus:ring-primary/20 min-h-[120px]" 
                            value={outreachData.idealClient} 
                            onChange={e => setOutreachData({...outreachData, idealClient: e.target.value})}
                            placeholder="Age range, profession, income, buying motivations..."
                          />
                        </div>
                        {onboardingType === "real-estate" ? (
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Target Locations (Cities/ZIPs)</Label>
                            <Textarea 
                              className="bg-white/5 border-white/5 rounded-2xl p-4 font-medium focus:ring-primary/20 min-h-[100px]" 
                              value={outreachData.targetLocations} 
                              onChange={e => setOutreachData({...outreachData, targetLocations: e.target.value})}
                              placeholder="New York, 90210, Beverly Hills..."
                            />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">10 Target Accounts (@handles)</Label>
                            <Textarea 
                              className="bg-white/5 border-white/5 rounded-2xl p-4 font-medium focus:ring-primary/20 min-h-[120px]" 
                              value={outreachData.targetAccounts} 
                              onChange={e => setOutreachData({...outreachData, targetAccounts: e.target.value})}
                              placeholder="@competitor1\n@competitor2..."
                            />
                          </div>
                        )}
                      </div>
                    )}
                    {currentStep === 2 && (
                      <div className="space-y-8">
                        <div className="space-y-4">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Allow following for better response rate?</Label>
                          <div className="flex gap-4">
                            {["yes", "no"].map(opt => (
                              <button
                                key={opt}
                                onClick={() => setOutreachData({...outreachData, allowFollow: opt})}
                                className={cn(
                                  "flex-1 h-14 rounded-2xl font-black uppercase tracking-wider transition-all border",
                                  outreachData.allowFollow === opt ? "bg-primary text-primary-foreground border-primary amber-glow" : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                                )}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Enable Free Community Engagement Service?</Label>
                          <div className="flex gap-4">
                            {["yes", "no"].map(opt => (
                              <button
                                key={opt}
                                onClick={() => setOutreachData({...outreachData, enableEngagement: opt})}
                                className={cn(
                                  "flex-1 h-14 rounded-2xl font-black uppercase tracking-wider transition-all border",
                                  outreachData.enableEngagement === opt ? "bg-primary text-primary-foreground border-primary amber-glow" : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                                )}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                          <p className="text-[10px] text-muted-foreground italic text-center px-4">This helps boost your exposure and activity on Instagram by engaging with community members.</p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {onboardingType === "mass-dm" && (
                  <>
                    {currentStep === 0 && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Instagram Username (Destination)</Label>
                          <Input className="h-12 bg-white/5 border-white/5 rounded-xl px-4 font-medium" value={massDmData.trafficDestination} onChange={e => setMassDmData({...massDmData, trafficDestination: e.target.value})} placeholder="@yourhandle" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">How many DMs?</Label>
                            <Input className="h-12 bg-white/5 border-white/5 rounded-xl px-4 font-medium" value={massDmData.dmCount} onChange={e => setMassDmData({...massDmData, dmCount: e.target.value})} placeholder="10,000" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number</Label>
                            <Input className="h-12 bg-white/5 border-white/5 rounded-xl px-4 font-medium" value={massDmData.phone} onChange={e => setMassDmData({...massDmData, phone: e.target.value})} placeholder="+1..." />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Email</Label>
                          <Input className="h-12 bg-white/5 border-white/5 rounded-xl px-4 font-medium" value={massDmData.email} onChange={e => setMassDmData({...massDmData, email: e.target.value})} placeholder="your@email.com" />
                        </div>
                      </div>
                    )}
                    {currentStep === 1 && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Ideal Target Accounts (Vertical List)</Label>
                          <Textarea 
                            className="bg-white/5 border-white/5 rounded-2xl p-4 font-medium focus:ring-primary/20 min-h-[200px]" 
                            value={massDmData.targetAccounts} 
                            onChange={e => setMassDmData({...massDmData, targetAccounts: e.target.value})}
                            placeholder="@handle1\n@handle2\n@handle3..."
                          />
                          <p className="text-[10px] text-muted-foreground italic px-1">Note: Please select accounts with &lt;10k followers for best results.</p>
                        </div>
                      </div>
                    )}
                    {currentStep === 2 && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Ideal Outreach Message</Label>
                          <Textarea 
                            className="bg-white/5 border-white/5 rounded-2xl p-4 font-medium focus:ring-primary/20 min-h-[200px]" 
                            value={massDmData.outreachMessage} 
                            onChange={e => setMassDmData({...massDmData, outreachMessage: e.target.value})}
                            placeholder="Write your draft here. We will touch it up for best conversion."
                          />
                        </div>
                      </div>
                    )}
                    {currentStep === 3 && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Questions and Comments</Label>
                          <Textarea 
                            className="bg-white/5 border-white/5 rounded-2xl p-4 font-medium focus:ring-primary/20 min-h-[200px]" 
                            value={massDmData.comments} 
                            onChange={e => setMassDmData({...massDmData, comments: e.target.value})}
                            placeholder="Any specific instructions or questions for the team?"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {onboardingType === "website" && (
                  <>
                    {currentStep === 0 && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Project Title</Label>
                          <Input className="h-12 bg-white/5 border-white/5 rounded-xl px-4 font-medium" value={websiteData.title} onChange={e => setWebsiteData({...websiteData, title: e.target.value})} placeholder="My New Business Website" />
                        </div>
                      </div>
                    )}
                    {currentStep === 1 && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Google Drive Folder Link</Label>
                          <Input className="h-12 bg-white/5 border-white/5 rounded-xl px-4 font-medium" value={websiteData.googleDriveLink} onChange={e => setWebsiteData({...websiteData, googleDriveLink: e.target.value})} placeholder="https://drive.google.com/..." />
                          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary">Upload Company Logo (PNG/JPG)</p>
                            <div className="space-y-2">
                              <Input 
                                type="file" 
                                accept="image/*"
                                className="h-12 bg-white/5 border-white/5 rounded-xl px-4 font-medium cursor-pointer" 
                                onChange={(e) => handleFileUpload(e, "website")}
                              />
                              {websiteData.logoUrl && (
                                <div className="mt-2 flex items-center gap-2">
                                  <img src={websiteData.logoUrl} alt="Logo preview" className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                                  <span className="text-[10px] text-green-400 font-bold">Logo loaded</span>
                                </div>
                              )}
                            </div>
                            <div className="pt-2 border-t border-white/5">
                              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Include the following in Drive:</p>
                              <ul className="text-[10px] text-muted-foreground list-disc list-inside space-y-1">
                                <li>Pictures for the website</li>
                                <li>Google Doc with specific packages</li>
                                <li>List of services in those packages</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {currentStep === 2 && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">About Us / Team Summary</Label>
                          <Textarea className="bg-white/5 border-white/5 rounded-2xl p-4 font-medium min-h-[200px]" value={websiteData.aboutUsSummary} onChange={e => setWebsiteData({...websiteData, aboutUsSummary: e.target.value})} placeholder="A summary we can place on the About Us page." />
                        </div>
                      </div>
                    )}
                    {currentStep === 3 && (
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Must-Have Features</Label>
                            <Textarea className="bg-white/5 border-white/5 rounded-2xl p-4 font-medium min-h-[100px]" value={websiteData.features} onChange={e => setWebsiteData({...websiteData, features: e.target.value})} placeholder="Contact form, booking system, e-commerce, etc." />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Brand Elements</Label>
                            <Textarea className="bg-white/5 border-white/5 rounded-2xl p-4 font-medium min-h-[100px]" value={websiteData.brandElements} onChange={e => setWebsiteData({...websiteData, brandElements: e.target.value})} placeholder="Colors, specific fonts, imagery style, etc." />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {onboardingType === "content" && (
                  <>
                    {currentStep === 0 && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Text for Each Design (Numbered List)</Label>
                          <Textarea className="bg-white/5 border-white/5 rounded-2xl p-4 font-medium min-h-[120px]" value={contentData.designTexts} onChange={e => setContentData({...contentData, designTexts: e.target.value})} placeholder="1. Text for first post\n2. Text for second post..." />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Design Examples / Similar Styles</Label>
                          <Textarea className="bg-white/5 border-white/5 rounded-2xl p-4 font-medium min-h-[100px]" value={contentData.designExamples} onChange={e => setContentData({...contentData, designExamples: e.target.value})} placeholder="Describe styles or link to examples you like." />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Brand Colors</Label>
                          <Input className="h-12 bg-white/5 border-white/5 rounded-xl px-4 font-medium" value={contentData.colors} onChange={e => setContentData({...contentData, colors: e.target.value})} placeholder="Primary colors to use." />
                        </div>
                      </div>
                    )}
                    {currentStep === 1 && (
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Google Drive Link (Labeled Pictures)</Label>
                            <Input className="h-12 bg-white/5 border-white/5 rounded-xl px-4 font-medium" value={contentData.googleDriveLink} onChange={e => setContentData({...contentData, googleDriveLink: e.target.value})} placeholder="https://drive.google.com/..." />
                            <p className="text-[10px] text-muted-foreground italic px-1">Label pictures by numbers for each individual design (1, 2, 3 etc).</p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Upload Company Logo (PNG/JPG)</Label>
                            <Input 
                              type="file" 
                              accept="image/*"
                              className="h-12 bg-white/5 border-white/5 rounded-xl px-4 font-medium cursor-pointer" 
                              onChange={(e) => handleFileUpload(e, "content")}
                            />
                            {contentData.logoUrl && (
                              <div className="mt-2 flex items-center gap-2">
                                <img src={contentData.logoUrl} alt="Logo preview" className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                                <span className="text-[10px] text-green-400 font-bold">Logo loaded</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

              </motion.div>
            </AnimatePresence>

            <div className="flex justify-between pt-8">
              <Button 
                variant="outline" 
                onClick={handleBack} 
                className="h-12 px-6 rounded-xl border-white/10 hover:bg-white/5 font-bold"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {currentStep === 0 ? "Change Service" : "Back"}
              </Button>
              <Button 
                onClick={handleNext} 
                disabled={isLoading}
                className="h-12 px-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-lg amber-glow"
              >
                {isLoading ? (
                  "Deploying..."
                ) : currentStep === steps.length - 1 ? (
                  <span className="flex items-center gap-2">Finalize & Launch <ArrowRight className="h-4 w-4" /></span>
                ) : (
                  <span className="flex items-center gap-2">Next Step <ArrowRight className="h-4 w-4" /></span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SideBar>
  );
}
