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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, CheckCircle, Upload, Image, FileText, Mail } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

interface ContentCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type ContentType = "social_media_design" | "blog_post" | "newsletter" | null;

export function ContentCreationDialog({
  open,
  onOpenChange,
  onSuccess,
}: ContentCreationDialogProps) {
  const [contentType, setContentType] = useState<ContentType>(null);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Social Media Design form data
  const [socialMediaData, setSocialMediaData] = useState({
    designTexts: [""],
    logoUrl: "",
    designExamples: "",
    colors: "",
    googleDriveLink: "",
  });

  // Blog Post form data
  const [blogPostData, setBlogPostData] = useState({
    topic: "",
    targetAudience: "",
    tone: "",
    referenceArticles: "",
    keywords: "",
  });

  // Newsletter form data
  const [newsletterData, setNewsletterData] = useState({
    mainTopic: "",
    goal: "",
    emailListSegment: "",
    exampleNewsletters: "",
    graphicsLink: "",
  });

  const createContentDraft = useMutation(api.contentDrafts.create);

  const socialMediaSteps = [
    { id: "texts", title: "Design Texts", required: true },
    { id: "logo", title: "Logo", required: true },
    { id: "examples", title: "Design Examples", required: false },
    { id: "colors", title: "Colors", required: false },
    { id: "drive", title: "Google Drive", required: true },
  ];

  const blogPostSteps = [
    { id: "topic", title: "Topic", required: true },
    { id: "audience", title: "Target Audience", required: true },
    { id: "tone", title: "Tone & Style", required: true },
    { id: "references", title: "References", required: false },
    { id: "keywords", title: "Keywords", required: false },
  ];

  const newsletterSteps = [
    { id: "topic", title: "Main Topic", required: true },
    { id: "goal", title: "Goal", required: true },
    { id: "audience", title: "Target Audience", required: true },
    { id: "examples", title: "Examples", required: false },
    { id: "graphics", title: "Graphics", required: false },
  ];

  const getCurrentSteps = () => {
    if (contentType === "social_media_design") return socialMediaSteps;
    if (contentType === "blog_post") return blogPostSteps;
    if (contentType === "newsletter") return newsletterSteps;
    return [];
  };

  const steps = getCurrentSteps();
  const progress = contentType ? ((currentStep + 1) / steps.length) * 100 : 0;

  const handleSocialMediaChange = (field: string, value: string | string[]) => {
    setSocialMediaData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBlogPostChange = (field: string, value: string) => {
    setBlogPostData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNewsletterChange = (field: string, value: string) => {
    setNewsletterData((prev) => ({ ...prev, [field]: value }));
  };

  const addDesignText = () => {
    setSocialMediaData((prev) => ({
      ...prev,
      designTexts: [...prev.designTexts, ""],
    }));
  };

  const updateDesignText = (index: number, value: string) => {
    setSocialMediaData((prev) => {
      const newTexts = [...prev.designTexts];
      newTexts[index] = value;
      return { ...prev, designTexts: newTexts };
    });
  };

  const handleNext = async () => {
    const currentStepData = steps[currentStep];
    
    // Validate required fields
    if (currentStepData.required) {
      if (contentType === "social_media_design") {
        if (currentStepData.id === "texts" && socialMediaData.designTexts.every(t => !t.trim())) {
          toast.error("Please add at least one design text");
          return;
        }
        if (currentStepData.id === "logo" && !socialMediaData.logoUrl.trim()) {
          toast.error("Please upload a logo");
          return;
        }
        if (currentStepData.id === "drive" && !socialMediaData.googleDriveLink.trim()) {
          toast.error("Please provide a Google Drive link");
          return;
        }
      } else if (contentType === "blog_post") {
        if (currentStepData.id === "topic" && !blogPostData.topic.trim()) {
          toast.error("Please enter a topic");
          return;
        }
        if (currentStepData.id === "audience" && !blogPostData.targetAudience.trim()) {
          toast.error("Please describe the target audience");
          return;
        }
        if (currentStepData.id === "tone" && !blogPostData.tone.trim()) {
          toast.error("Please select a tone");
          return;
        }
      } else if (contentType === "newsletter") {
        if (currentStepData.id === "topic" && !newsletterData.mainTopic.trim()) {
          toast.error("Please enter the main topic");
          return;
        }
        if (currentStepData.id === "goal" && !newsletterData.goal.trim()) {
          toast.error("Please select a goal");
          return;
        }
        if (currentStepData.id === "audience" && !newsletterData.emailListSegment.trim()) {
          toast.error("Please describe the target audience");
          return;
        }
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    try {
      if (contentType === "social_media_design") {
        await createContentDraft({
          contentType: "social_media_design",
          designTexts: socialMediaData.designTexts.filter(t => t.trim()),
          logoUrl: socialMediaData.logoUrl || undefined,
          designExamples: socialMediaData.designExamples || undefined,
          colors: socialMediaData.colors || undefined,
          googleDriveLink: socialMediaData.googleDriveLink || undefined,
        });
      } else if (contentType === "blog_post") {
        await createContentDraft({
          contentType: "blog_post",
          topic: blogPostData.topic,
          targetAudience: blogPostData.targetAudience,
          tone: blogPostData.tone,
          referenceArticles: blogPostData.referenceArticles || undefined,
          keywords: blogPostData.keywords || undefined,
        });
      } else if (contentType === "newsletter") {
        await createContentDraft({
          contentType: "newsletter",
          mainTopic: newsletterData.mainTopic,
          goal: newsletterData.goal,
          emailListSegment: newsletterData.emailListSegment,
          exampleNewsletters: newsletterData.exampleNewsletters || undefined,
          graphicsLink: newsletterData.graphicsLink || undefined,
        });
      }

      toast.success("Content draft created successfully!");
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (error: any) {
      toast.error(`Failed to create draft: ${error.message}`);
    }
  };

  const resetForm = () => {
    setContentType(null);
    setCurrentStep(0);
    setSocialMediaData({
      designTexts: [""],
      logoUrl: "",
      designExamples: "",
      colors: "",
      googleDriveLink: "",
    });
    setBlogPostData({
      topic: "",
      targetAudience: "",
      tone: "",
      referenceArticles: "",
      keywords: "",
    });
    setNewsletterData({
      mainTopic: "",
      goal: "",
      emailListSegment: "",
      exampleNewsletters: "",
      graphicsLink: "",
    });
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else if (contentType) {
      setContentType(null);
    }
  };

  const handleContentTypeSelect = (type: ContentType) => {
    setContentType(type);
    setCurrentStep(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contentType ? `New ${contentType === "social_media_design" ? "Social Media Design" : contentType === "blog_post" ? "Blog Post" : "Newsletter"}` : "New Content"}
          </DialogTitle>
          <DialogDescription>
            {contentType 
              ? `Step ${currentStep + 1} of ${steps.length}: ${steps[currentStep].title}`
              : "What kind of content do you want to create?"}
          </DialogDescription>
        </DialogHeader>

        {!contentType ? (
          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-3">
              <button
                onClick={() => handleContentTypeSelect("social_media_design")}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Image className="h-12 w-12 mb-3 text-muted-foreground" />
                <span className="font-medium">Social Media Design</span>
              </button>
              <button
                onClick={() => handleContentTypeSelect("blog_post")}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <FileText className="h-12 w-12 mb-3 text-muted-foreground" />
                <span className="font-medium">Blog Post</span>
              </button>
              <button
                onClick={() => handleContentTypeSelect("newsletter")}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Mail className="h-12 w-12 mb-3 text-muted-foreground" />
                <span className="font-medium">Newsletter</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Progress value={progress} className="w-full" />

            {/* Social Media Design Flow */}
            {contentType === "social_media_design" && (
              <>
                {currentStep === 0 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label htmlFor="designTexts" className="text-base font-medium leading-6">
                          Please share the text you want for each design. *
                        </Label>
                        <p className="text-sm text-muted-foreground leading-5 tracking-wide">
                          List it like this so it's easily identifiable for each individual post.
                        </p>
                      </div>
                      {socialMediaData.designTexts.map((text, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <span className="text-sm font-medium w-8">{index + 1}.</span>
                          <Textarea
                            value={text}
                            onChange={(e) => updateDesignText(index, e.target.value)}
                            placeholder={`Design ${index + 1} text...`}
                            rows={2}
                            className="flex-1"
                          />
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addDesignText}
                        className="w-full hover:text-amber-400"
                      >
                        + Add Another Design
                      </Button>
                    </div>
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="logo">
                        Please include a clear logo (PNG or source file). *
                      </Label>
                      <div className="border-2 border-dashed rounded-lg p-8 text-center">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-2">
                          Upload logo (limit 10MB)
                        </p>
                        <Input
                          id="logo"
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              // In production, upload to storage and get URL
                              handleSocialMediaChange("logoUrl", URL.createObjectURL(file));
                            }
                          }}
                          className="max-w-xs mx-auto"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="designExamples">
                        Do you have any design examples you want yours to look similar to?
                      </Label>
                      <Textarea
                        id="designExamples"
                        value={socialMediaData.designExamples}
                        onChange={(e) => handleSocialMediaChange("designExamples", e.target.value)}
                        placeholder="Paste text or link to design examples..."
                        rows={4}
                      />
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="colors">What colors do you want to use?</Label>
                      <Input
                        id="colors"
                        value={socialMediaData.colors}
                        onChange={(e) => handleSocialMediaChange("colors", e.target.value)}
                        placeholder="e.g., Blue, white, gold or #1E40AF, #FFFFFF, #F59E0B"
                      />
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label htmlFor="googleDriveLink" className="text-base font-medium leading-6">
                          Please attach a Google Drive link of all pictures you want to use. *
                        </Label>
                        <p className="text-sm text-muted-foreground leading-5 tracking-wide">
                          Label them by numbers for each design (1, 2, 3, etc).
                        </p>
                      </div>
                      <Input
                        id="googleDriveLink"
                        value={socialMediaData.googleDriveLink}
                        onChange={(e) => handleSocialMediaChange("googleDriveLink", e.target.value)}
                        placeholder="https://drive.google.com/drive/folders/..."
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Blog Post Flow */}
            {contentType === "blog_post" && (
              <>
                {currentStep === 0 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="topic">What's the topic or headline idea for this blog post? *</Label>
                      <Input
                        id="topic"
                        value={blogPostData.topic}
                        onChange={(e) => handleBlogPostChange("topic", e.target.value)}
                        placeholder="Enter topic or headline..."
                      />
                    </div>
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="targetAudience">Who is this blog for (target audience)? *</Label>
                      <Textarea
                        id="targetAudience"
                        value={blogPostData.targetAudience}
                        onChange={(e) => handleBlogPostChange("targetAudience", e.target.value)}
                        placeholder="Describe your target audience..."
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="tone">What tone or style do you prefer? *</Label>
                      <Select value={blogPostData.tone} onValueChange={(value) => handleBlogPostChange("tone", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tone or style..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="educational">Educational</SelectItem>
                          <SelectItem value="storytelling">Storytelling</SelectItem>
                          <SelectItem value="corporate">Corporate</SelectItem>
                          <SelectItem value="conversational">Conversational</SelectItem>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="referenceArticles">Do you have reference articles or brands whose blogs you like?</Label>
                      <Textarea
                        id="referenceArticles"
                        value={blogPostData.referenceArticles}
                        onChange={(e) => handleBlogPostChange("referenceArticles", e.target.value)}
                        placeholder="Paste links or mention brands..."
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="keywords">Any specific keywords or phrases to include?</Label>
                      <Input
                        id="keywords"
                        value={blogPostData.keywords}
                        onChange={(e) => handleBlogPostChange("keywords", e.target.value)}
                        placeholder="e.g., SEO, marketing, growth..."
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Newsletter Flow */}
            {contentType === "newsletter" && (
              <>
                {currentStep === 0 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="mainTopic">What is the main topic or announcement for this newsletter? *</Label>
                      <Input
                        id="mainTopic"
                        value={newsletterData.mainTopic}
                        onChange={(e) => handleNewsletterChange("mainTopic", e.target.value)}
                        placeholder="Enter main topic or announcement..."
                      />
                    </div>
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="goal">What's the goal? *</Label>
                      <Select value={newsletterData.goal} onValueChange={(value) => handleNewsletterChange("goal", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select goal..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="promote_service">Promote a service</SelectItem>
                          <SelectItem value="educate">Educate</SelectItem>
                          <SelectItem value="share_updates">Share updates</SelectItem>
                          <SelectItem value="event_reminder">Event reminder</SelectItem>
                          <SelectItem value="product_launch">Product launch</SelectItem>
                          <SelectItem value="newsletter">General newsletter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="emailListSegment">Who is your target audience or email list segment? *</Label>
                      <Textarea
                        id="emailListSegment"
                        value={newsletterData.emailListSegment}
                        onChange={(e) => handleNewsletterChange("emailListSegment", e.target.value)}
                        placeholder="Describe your target audience or segment..."
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="exampleNewsletters">Any example newsletters or layouts you like?</Label>
                      <Textarea
                        id="exampleNewsletters"
                        value={newsletterData.exampleNewsletters}
                        onChange={(e) => handleNewsletterChange("exampleNewsletters", e.target.value)}
                        placeholder="Paste links or describe layouts..."
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="graphicsLink">Do you want us to include any graphics or images?</Label>
                      <Input
                        id="graphicsLink"
                        value={newsletterData.graphicsLink}
                        onChange={(e) => handleNewsletterChange("graphicsLink", e.target.value)}
                        placeholder="Google Drive link or file upload..."
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
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
        )}
      </DialogContent>
    </Dialog>
  );
}

