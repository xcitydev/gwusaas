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
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

interface OutreachOnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const steps = [
  { id: "credentials", title: "Instagram Credentials", required: true },
  { id: "client", title: "Ideal Client", required: true },
  { id: "targets", title: "Target Accounts", required: true },
  { id: "script", title: "Outreach Script", required: true },
  { id: "settings", title: "Campaign Settings", required: false },
];

export function OutreachOnboardingDialog({
  open,
  onOpenChange,
  onSuccess,
}: OutreachOnboardingDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    instagramUsername: "",
    instagramPassword: "",
    backupCodes: "",
    idealClient: "",
    targetAccounts: "",
    outreachScript: "",
    allowFollow: true,
    enableEngagement: false,
  });

  const createOutreachCampaign = useMutation(api.outreachCampaigns.create);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = async () => {
    const currentStepData = steps[currentStep];
    
    // Validate required fields
    if (currentStepData.id === "credentials") {
      if (!formData.instagramUsername.trim()) {
        toast.error("Please enter your Instagram username");
        return;
      }
    } else if (currentStepData.id === "client") {
      if (!formData.idealClient.trim()) {
        toast.error("Please describe your ideal client");
        return;
      }
    } else if (currentStepData.id === "targets") {
      if (!formData.targetAccounts.trim()) {
        toast.error("Please list at least one target account");
        return;
      }
    } else if (currentStepData.id === "script") {
      if (!formData.outreachScript.trim()) {
        toast.error("Please provide your outreach script");
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
      // Parse target accounts (split by comma or newline, add @ if missing)
      const accounts = formData.targetAccounts
        .split(/[,\n]/)
        .map((acc) => acc.trim())
        .filter((acc) => acc.length > 0)
        .map((acc) => (acc.startsWith("@") ? acc : `@${acc}`));

      await createOutreachCampaign({
        instagramUsername: formData.instagramUsername,
        instagramPassword: formData.instagramPassword || undefined,
        backupCodes: formData.backupCodes || undefined,
        idealClient: formData.idealClient,
        targetAccounts: accounts,
        outreachScript: formData.outreachScript,
        allowFollow: formData.allowFollow,
        enableEngagement: formData.enableEngagement,
      });

      toast.success("Outreach campaign created successfully!");
      onOpenChange(false);
      setCurrentStep(0);
      setFormData({
        instagramUsername: "",
        instagramPassword: "",
        backupCodes: "",
        idealClient: "",
        targetAccounts: "",
        outreachScript: "",
        allowFollow: true,
        enableEngagement: false,
      });
      onSuccess?.();
    } catch (error: any) {
      toast.error(`Failed to create campaign: ${error.message}`);
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
          <DialogTitle>New Outreach Campaign</DialogTitle>
          <DialogDescription>
            Set up your Instagram outreach campaign
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
                <Label htmlFor="username">What is your username? *</Label>
                <Input
                  id="username"
                  value={formData.instagramUsername}
                  onChange={(e) => handleInputChange("instagramUsername", e.target.value)}
                  placeholder="@yourusername"
                />
              </div>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="password" className="text-base font-medium leading-6">
                    What is your password? *
                  </Label>
                  <p className="text-sm text-muted-foreground leading-5 tracking-wide">
                    Your password is only used to send out the messages & remains 100% confidential.
                  </p>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={formData.instagramPassword}
                  onChange={(e) => handleInputChange("instagramPassword", e.target.value)}
                  placeholder="Enter your Instagram password"
                />
              </div>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="backupCodes" className="text-base font-medium leading-6">
                    Please input your backup codes for us to login. *
                  </Label>
                  <p className="text-sm text-muted-foreground leading-5 tracking-wide">
                    Your backup codes remain 100% confidential.
                  </p>
                </div>
                <Textarea
                  id="backupCodes"
                  value={formData.backupCodes}
                  onChange={(e) => handleInputChange("backupCodes", e.target.value)}
                  placeholder="Enter your backup codes (one per line or comma-separated)"
                  rows={4}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  To find backup codes: Settings → Accounts Center → Password and security → Two-factor authentication → Additional methods → Backup Codes
                </p>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="idealClient">
                  Describe your ideal avatar client (Consider factors like location, age group, interests, profession and any other key characteristics) *
                </Label>
                <Textarea
                  id="idealClient"
                  value={formData.idealClient}
                  onChange={(e) => handleInputChange("idealClient", e.target.value)}
                  placeholder="Describe your ideal client in detail..."
                  rows={8}
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetAccounts">
                  Can you list 10 accounts you believe would be ideal customers or people you'd like to reach out to? *
                </Label>
                <Textarea
                  id="targetAccounts"
                  value={formData.targetAccounts}
                  onChange={(e) => handleInputChange("targetAccounts", e.target.value)}
                  placeholder="@account1, @account2, @account3..."
                  rows={6}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Please put the @ symbol before each name. You can list them separated by commas or one per line.
                </p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="outreachScript">
                  What is your ideal script for reaching out to these people, what do you look to get across? We will touch it up for the best results, but it's important you share your ideal script so we know your goals & direction. *
                </Label>
                <Textarea
                  id="outreachScript"
                  value={formData.outreachScript}
                  onChange={(e) => handleInputChange("outreachScript", e.target.value)}
                  placeholder="Write your ideal outreach message..."
                  rows={8}
                />
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="allowFollow">
                    Do you allow us to follow people in your target market we are messaging for best response rate?
                  </Label>
                </div>
                <Switch
                  id="allowFollow"
                  checked={formData.allowFollow}
                  onCheckedChange={(checked) => handleInputChange("allowFollow", checked)}
                />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg space-y-2">
                <div className="space-y-0.5">
                  <Label htmlFor="enableEngagement">
                    As an additional free service would you like us to engage with other community members to enhance your overall activity on IG, and boost your exposure because your profile is actively seen on other pages? This is FREE and has helped our clients get thousands of likes on one single comment driving massive exposure.
                  </Label>
                </div>
                <Switch
                  id="enableEngagement"
                  checked={formData.enableEngagement}
                  onCheckedChange={(checked) => handleInputChange("enableEngagement", checked)}
                />
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


