"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle, Upload } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import SideBar from "@/components/SideBar";

const steps = [
  { id: "project", title: "Project Setup", fields: ["name", "instagramHandle", "websiteUrl"] },
  { id: "brand", title: "Brand Identity", fields: ["brandTone", "colorPalette", "designStyle"] },
  { id: "goals", title: "Goals & Audience", fields: ["goals", "targetAudience", "competitors"] },
  { id: "uploads", title: "Assets", fields: ["uploads"] },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    instagramHandle: "",
    websiteUrl: "",
    brandTone: "",
    colorPalette: "",
    designStyle: "",
    goals: "",
    targetAudience: "",
    competitors: "",
    uploads: [] as { name: string; url: string }[],
  });
  const [projectId, setProjectId] = useState<string | null>(null);

  // User profile is created automatically if it doesn't exist (see useEffect below)

  // Get existing onboarding if project exists
  const existingOnboarding = useQuery(
    api.onboarding.get,
    projectId ? { projectId: projectId as any } : "skip"
  );

  const saveStep = useMutation(api.onboarding.saveStep);
  const completeOnboarding = useMutation(api.onboarding.complete);
  const profile = useMutation(api.profile.completeOnboarding);
  const createProject = useMutation(api.projects.create);
  const createOrUpdateProfile = useMutation(api.profile.createOrUpdate);

  // Get user profile
  const userProfile = useQuery(
    api.profile.getByClerkId,
    user?.id ? { clerkUserId: user.id } : "skip"
  );

  // Create user profile if it doesn't exist
  useEffect(() => {
    if (user && !userProfile) {
      createOrUpdateProfile({
        clerkUserId: user.id,
        fullName: user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User",
        email: user.primaryEmailAddress?.emailAddress || "",
        role: "client",
      }).catch((error) => {
        console.error("Failed to create profile:", error);
      });
    }
  }, [user, userProfile, createOrUpdateProfile]);

  useEffect(() => {
    if (existingOnboarding) {
      setFormData({
        name: "",
        instagramHandle: "",
        websiteUrl: "",
        brandTone: existingOnboarding.brandTone || "",
        colorPalette: existingOnboarding.colorPalette || "",
        designStyle: existingOnboarding.designStyle || "",
        goals: existingOnboarding.goals || "",
        targetAudience: existingOnboarding.targetAudience || "",
        competitors: existingOnboarding.competitors || "",
        uploads: existingOnboarding.uploads || [],
      });
      setProjectId(existingOnboarding.projectId);
    }
  }, [existingOnboarding]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveStep = async () => {
    try {
      // Create project if not exists
      let currentProjectId = projectId;
      if (!currentProjectId && currentStep === 0) {
        const result = await createProject({
          name: formData.name,
          instagramHandle: formData.instagramHandle,
          websiteUrl: formData.websiteUrl,
        });
        currentProjectId = result.projectId;
        setProjectId(currentProjectId);
      }

      if (!currentProjectId) {
        toast.error("Please create a project first");
        return;
      }

      // Save step data
      await saveStep({
        projectId: currentProjectId as any,
        stepData: {
          brandTone: formData.brandTone,
          colorPalette: formData.colorPalette,
          designStyle: formData.designStyle,
          goals: formData.goals,
          targetAudience: formData.targetAudience,
          competitors: formData.competitors,
          uploads: formData.uploads,
        },
      });

      toast.success("Progress saved!");
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    }
  };

  const handleNext = async () => {
    // Validate current step
    const currentStepData = steps[currentStep];
    const requiredFields = currentStepData.fields.filter((f) => f !== "uploads" && f !== "websiteUrl");
    const missingFields = requiredFields.filter((f) => !formData[f as keyof typeof formData]);

    if (missingFields.length > 0) {
      toast.error(`Please fill in: ${missingFields.join(", ")}`);
      return;
    }

    // Save progress
    await handleSaveStep();

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      if (projectId) {
        try {
          await completeOnboarding({ projectId: projectId as any });
          await profile({ clerkUserId: user?.id as string });
          toast.success("Onboarding completed!");
          router.push("/dashboard");
        } catch (error: any) {
          toast.error(`Failed to complete: ${error.message}`);
        }
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c79b09]"></div>
      </div>
    );
  }

  return (
    <SideBar>
      <div className="flex-1 space-y-4 p-8 pt-6 max-w-4xl mx-auto">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Onboarding</h2>
          <p className="text-muted-foreground">
            Let's set up your project and brand identity
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>{steps[currentStep].title}</CardTitle>
              <div className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {steps.length}
              </div>
            </div>
            <Progress value={progress} className="w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            {currentStep === 0 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="My Instagram Project"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagramHandle">Instagram Handle</Label>
                  <Input
                    id="instagramHandle"
                    value={formData.instagramHandle}
                    onChange={(e) => handleInputChange("instagramHandle", e.target.value)}
                    placeholder="@yourhandle"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website URL (Optional)</Label>
                  <Input
                    id="websiteUrl"
                    value={formData.websiteUrl}
                    onChange={(e) => handleInputChange("websiteUrl", e.target.value)}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </>
            )}

            {currentStep === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="brandTone">Brand Tone</Label>
                  <Textarea
                    id="brandTone"
                    value={formData.brandTone}
                    onChange={(e) => handleInputChange("brandTone", e.target.value)}
                    placeholder="Professional, friendly, modern..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="colorPalette">Color Palette</Label>
                  <Input
                    id="colorPalette"
                    value={formData.colorPalette}
                    onChange={(e) => handleInputChange("colorPalette", e.target.value)}
                    placeholder="Blue, white, gold..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="designStyle">Design Style</Label>
                  <Input
                    id="designStyle"
                    value={formData.designStyle}
                    onChange={(e) => handleInputChange("designStyle", e.target.value)}
                    placeholder="Minimalist, bold, elegant..."
                  />
                </div>
              </>
            )}

            {currentStep === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="goals">Goals</Label>
                  <Textarea
                    id="goals"
                    value={formData.goals}
                    onChange={(e) => handleInputChange("goals", e.target.value)}
                    placeholder="What are your main goals for this project?"
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetAudience">Target Audience</Label>
                  <Textarea
                    id="targetAudience"
                    value={formData.targetAudience}
                    onChange={(e) => handleInputChange("targetAudience", e.target.value)}
                    placeholder="Describe your target audience..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="competitors">Competitors</Label>
                  <Input
                    id="competitors"
                    value={formData.competitors}
                    onChange={(e) => handleInputChange("competitors", e.target.value)}
                    placeholder="@competitor1, @competitor2..."
                  />
                </div>
              </>
            )}

            {currentStep === 3 && (
              <div className="space-y-2">
                <Label>Upload Assets (Optional)</Label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    File upload feature coming soon
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleNext}>
                {currentStep === steps.length - 1 ? (
                  <>
                    Complete <CheckCircle className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  <>
                    Next <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SideBar>
  );
}
