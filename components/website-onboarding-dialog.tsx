"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

interface WebsiteOnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const steps = [
  { id: "features", title: "Website Features", required: true },
  { id: "brand", title: "Brand Elements", required: false },
  { id: "about", title: "About Us Summary", required: false },
  { id: "assets", title: "Assets & Resources", required: false },
];

export function WebsiteOnboardingDialog({
  open,
  onOpenChange,
  onSuccess,
}: WebsiteOnboardingDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    title: "",
    features: "",
    brandElements: "",
    aboutUsSummary: "",
    googleDriveLink: "",
  });

  const createWebsiteProject = useMutation(api.websiteProjects.create);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = async () => {
    const currentStepData = steps[currentStep];
    
    // Validate required fields
    if (currentStepData.id === "features") {
      if (!formData.title.trim() || !formData.features.trim()) {
        toast.error("Please fill in the project title and required features");
        return;
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Submit
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    try {
      await createWebsiteProject({
        title: formData.title,
        features: formData.features,
        brandElements: formData.brandElements || undefined,
        aboutUsSummary: formData.aboutUsSummary || undefined,
        googleDriveLink: formData.googleDriveLink || undefined,
      });

      toast.success("Website project created successfully!");
      onOpenChange(false);
      setCurrentStep(0);
      setFormData({
        title: "",
        features: "",
        brandElements: "",
        aboutUsSummary: "",
        googleDriveLink: "",
      });
      onSuccess?.();
    } catch (error: any) {
      toast.error(`Failed to create project: ${error.message}`);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Website Project</DialogTitle>
          <DialogDescription>
            Let's gather the information needed to start your website project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm font-medium">{steps[currentStep].title}</span>
          </div>
          <Progress value={progress} className="w-full" />

          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="e.g., Company Website Redesign"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="features">What features must your website include? *</Label>
                <Textarea
                  id="features"
                  value={formData.features}
                  onChange={(e) => handleInputChange("features", e.target.value)}
                  placeholder="List all required features (e.g., contact form, blog, e-commerce, etc.)"
                  rows={6}
                />
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brandElements">Do you have any brand elements you need on your website?</Label>
                <Textarea
                  id="brandElements"
                  value={formData.brandElements}
                  onChange={(e) => handleInputChange("brandElements", e.target.value)}
                  placeholder="Describe brand colors, logos, fonts, style guidelines, etc."
                  rows={6}
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="aboutUsSummary">Please submit a summary that we can place on the 'About Us/Team' Page</Label>
                <Textarea
                  id="aboutUsSummary"
                  value={formData.aboutUsSummary}
                  onChange={(e) => handleInputChange("aboutUsSummary", e.target.value)}
                  placeholder="Tell us about your company, team, mission, values, etc."
                  rows={8}
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="googleDriveLink">Google Drive Folder Link</Label>
                <Input
                  id="googleDriveLink"
                  value={formData.googleDriveLink}
                  onChange={(e) => handleInputChange("googleDriveLink", e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Please include:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside mt-1 space-y-1">
                  <li>PNG Logo of Company</li>
                  <li>Pictures you want shown on the website</li>
                  <li>Google Document with different packages broken down (make very specific)</li>
                  <li>A list of all services in those packages broke down (make very specific)</li>
                </ul>
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
                  Submit <CheckCircle className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  Next <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


