"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Instagram,
  Globe,
  MessageSquare,
  Target,
  ListTodo,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ServiceType = "real-estate" | "general" | "mass-dm" | "website" | "content";

const SERVICES: { id: ServiceType; title: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { id: "real-estate", title: "Get Real Estate Clients", icon: Target, desc: "Find buyers, sellers, and investors who actually want to talk." },
  { id: "general", title: "Get More Customers (Instagram)", icon: Instagram, desc: "Grow your following and book more sales calls." },
  { id: "mass-dm", title: "Reach Thousands at Once", icon: MessageSquare, desc: "Send DMs to a huge target list — fast." },
  { id: "website", title: "Build Me a Website", icon: Globe, desc: "Custom site that actually converts visitors." },
  { id: "content", title: "Design My Posts", icon: ListTodo, desc: "On-brand content ready to post." },
];

const emptyOutreach = {
  username: "",
  password: "",
  backupCodes: "",
  idealClient: "",
  targetLocations: "",
  targetAccounts: "",
  allowFollow: "yes",
  enableEngagement: "yes",
};

const emptyMassDm = {
  targetAccounts: "",
  outreachMessage: "",
  trafficDestination: "",
  dmCount: "",
  email: "",
  phone: "",
  comments: "",
};

const emptyWebsite = {
  title: "",
  googleDriveLink: "",
  aboutUsSummary: "",
  features: "",
  brandElements: "",
  logoUrl: "",
};

const emptyContent = {
  designTexts: "",
  logoUrl: "",
  designExamples: "",
  colors: "",
  googleDriveLink: "",
};

const labelCls = "text-xs font-black uppercase tracking-widest text-muted-foreground ml-1";
const inputCls = "h-12 bg-white/5 border-white/5 rounded-xl px-4 font-medium focus:ring-primary/20";
const textareaCls = "bg-white/5 border-white/5 rounded-2xl p-4 font-medium focus:ring-primary/20";
const errorRingCls = "border-red-500/50 focus-visible:ring-red-500/30";

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className={labelCls}>
      {children} <span className="text-red-400">*</span>
    </Label>
  );
}

function FieldError({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="text-[10px] font-bold text-red-400 px-1">
      This field is required.
    </p>
  );
}

function getMissingFields(
  selected: ServiceType,
  outreach: typeof emptyOutreach,
  massDm: typeof emptyMassDm,
  website: typeof emptyWebsite,
  content: typeof emptyContent,
): string[] {
  const missing: string[] = [];
  const need = (value: string, label: string) => {
    if (!value.trim()) missing.push(label);
  };

  if (selected === "real-estate") {
    need(outreach.username, "Instagram Username");
    need(outreach.password, "Instagram Password");
    need(outreach.idealClient, "Ideal Client Description");
    need(outreach.targetLocations, "Target Locations");
  } else if (selected === "general") {
    need(outreach.username, "Instagram Username");
    need(outreach.password, "Instagram Password");
    need(outreach.idealClient, "Ideal Client Description");
    need(outreach.targetAccounts, "Target Accounts");
  } else if (selected === "mass-dm") {
    need(massDm.trafficDestination, "Instagram Username (Destination)");
    need(massDm.dmCount, "How many DMs?");
    need(massDm.email, "Email");
    need(massDm.targetAccounts, "Target Accounts");
    need(massDm.outreachMessage, "Outreach Message");
  } else if (selected === "website") {
    need(website.title, "Project Title");
    need(website.aboutUsSummary, "About Us / Team Summary");
    need(website.features, "Must-Have Features");
  } else if (selected === "content") {
    need(content.designTexts, "Text for Each Design");
    need(content.colors, "Brand Colors");
  }

  return missing;
}

type ServiceFormsSettingsProps = {
  /** Optional whitelist of service types to show. Defaults to all 5. */
  allowedServices?: ServiceType[];
  /** Optional override for the picker card title. */
  title?: string;
  /** Optional override for the picker card description. */
  description?: string;
  /** Fires after a successful submission. */
  onSubmitted?: () => void;
};

export function ServiceFormsSettings({
  allowedServices,
  title,
  description,
  onSubmitted,
}: ServiceFormsSettingsProps = {}) {
  const { user } = useUser();
  const [selected, setSelected] = useState<ServiceType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const visibleServices = allowedServices
    ? SERVICES.filter((s) => allowedServices.includes(s.id))
    : SERVICES;

  const [outreachData, setOutreachData] = useState(emptyOutreach);
  const [massDmData, setMassDmData] = useState(emptyMassDm);
  const [websiteData, setWebsiteData] = useState(emptyWebsite);
  const [contentData, setContentData] = useState(emptyContent);

  const createOutreach = useMutation(api.outreachCampaigns.create);
  const createWebsite = useMutation(api.websiteProjects.create);
  const createContentDraft = useMutation(api.contentDrafts.create);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "website" | "content"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error("File size must be less than 1MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (type === "website") {
        setWebsiteData((prev) => ({ ...prev, logoUrl: base64String }));
      } else {
        setContentData((prev) => ({ ...prev, logoUrl: base64String }));
      }
      toast.success("Image uploaded successfully");
    };
    reader.readAsDataURL(file);
  };

  const resetSelected = () => {
    setSelected(null);
    setOutreachData(emptyOutreach);
    setMassDmData(emptyMassDm);
    setWebsiteData(emptyWebsite);
    setContentData(emptyContent);
    setAttempted(false);
  };

  const handleSubmit = async () => {
    if (!user?.id || !selected) return;

    const missing = getMissingFields(
      selected,
      outreachData,
      massDmData,
      websiteData,
      contentData,
    );
    if (missing.length > 0) {
      setAttempted(true);
      toast.error(
        missing.length === 1
          ? `Please fill in: ${missing[0]}`
          : `Please fill in ${missing.length} required fields.`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (selected === "real-estate") {
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
      } else if (selected === "general") {
        await createOutreach({
          campaignType: "general",
          instagramUsername: outreachData.username,
          instagramPassword: outreachData.password,
          backupCodes: outreachData.backupCodes,
          idealClient: outreachData.idealClient,
          targetAccounts: outreachData.targetAccounts.split("\n").filter((a) => a.trim()),
          allowFollow: outreachData.allowFollow === "yes",
          enableEngagement: outreachData.enableEngagement === "yes",
        });
      } else if (selected === "mass-dm") {
        await createOutreach({
          campaignType: "mass-dm",
          instagramUsername: massDmData.trafficDestination,
          targetAccounts: massDmData.targetAccounts.split("\n").filter((a) => a.trim()),
          outreachScript: massDmData.outreachMessage,
          dmCount: massDmData.dmCount,
          contactEmail: massDmData.email,
          contactPhone: massDmData.phone,
          comments: massDmData.comments,
          allowFollow: false,
          enableEngagement: false,
        });
      } else if (selected === "website") {
        await createWebsite({
          title: websiteData.title,
          features: websiteData.features,
          brandElements: websiteData.brandElements,
          aboutUsSummary: websiteData.aboutUsSummary,
          googleDriveLink: websiteData.googleDriveLink,
          logoUrl: websiteData.logoUrl,
        });
      } else if (selected === "content") {
        await createContentDraft({
          contentType: "social_media_design",
          designTexts: contentData.designTexts.split("\n").filter((t) => t.trim()),
          designExamples: contentData.designExamples,
          colors: contentData.colors,
          googleDriveLink: contentData.googleDriveLink,
          logoUrl: contentData.logoUrl,
        });
      }
      toast.success("Submitted successfully!");
      resetSelected();
      onSubmitted?.();
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selected) {
    return (
      <Card className="glass-card border-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-white/5">
          <CardTitle>{title ?? "Request a Service"}</CardTitle>
          <CardDescription>
            {description ?? "Tell us what you need — we'll handle it."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleServices.map((service) => (
              <motion.div
                key={service.id}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelected(service.id)}
                className="glass-card cursor-pointer group rounded-2xl p-5 space-y-3 border border-white/5 hover:border-primary/20 hover:bg-white/10 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <service.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-base group-hover:text-primary transition-colors">{service.title}</h3>
                  <p className="text-xs text-muted-foreground">{service.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const titleMap: Record<ServiceType, string> = {
    "real-estate": "Get Real Estate Clients",
    "general": "Get More Customers (Instagram)",
    "mass-dm": "Reach Thousands at Once",
    "website": "Build Me a Website",
    "content": "Design My Posts",
  };

  return (
    <Card className="glass-card border-white/5 overflow-hidden">
      <CardHeader className="border-b border-white/5 bg-white/5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>{titleMap[selected]}</CardTitle>
            <CardDescription>Fill out all required fields and submit.</CardDescription>
          </div>
          <Button
            variant="ghost"
            onClick={resetSelected}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Change Service
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 md:p-8 space-y-6">
        {(selected === "real-estate" || selected === "general") && (
          <div className="space-y-6">
            <div className="space-y-2">
              <RequiredLabel>Instagram Username</RequiredLabel>
              <Input
                className={cn(
                  inputCls,
                  attempted && !outreachData.username.trim() && errorRingCls,
                )}
                value={outreachData.username}
                onChange={(e) => setOutreachData({ ...outreachData, username: e.target.value })}
                placeholder="@username"
              />
              <FieldError show={attempted && !outreachData.username.trim()} />
            </div>
            <div className="space-y-2">
              <RequiredLabel>Instagram Password</RequiredLabel>
              <Input
                type="password"
                className={cn(
                  inputCls,
                  attempted && !outreachData.password.trim() && errorRingCls,
                )}
                value={outreachData.password}
                onChange={(e) => setOutreachData({ ...outreachData, password: e.target.value })}
                placeholder="••••••••"
              />
              <FieldError show={attempted && !outreachData.password.trim()} />
              <p className="text-[10px] text-muted-foreground italic px-1">Confidential: Only used for automated messaging.</p>
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Backup Codes</Label>
              <Textarea
                className={cn(textareaCls, "min-h-[100px]")}
                value={outreachData.backupCodes}
                onChange={(e) => setOutreachData({ ...outreachData, backupCodes: e.target.value })}
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
            <div className="space-y-2">
              <RequiredLabel>Ideal Client Description</RequiredLabel>
              <Textarea
                className={cn(
                  textareaCls,
                  "min-h-[120px]",
                  attempted && !outreachData.idealClient.trim() && errorRingCls,
                )}
                value={outreachData.idealClient}
                onChange={(e) => setOutreachData({ ...outreachData, idealClient: e.target.value })}
                placeholder="Age range, profession, income, buying motivations..."
              />
              <FieldError show={attempted && !outreachData.idealClient.trim()} />
            </div>
            {selected === "real-estate" ? (
              <div className="space-y-2">
                <RequiredLabel>Target Locations (Cities/ZIPs)</RequiredLabel>
                <Textarea
                  className={cn(
                    textareaCls,
                    "min-h-[100px]",
                    attempted && !outreachData.targetLocations.trim() && errorRingCls,
                  )}
                  value={outreachData.targetLocations}
                  onChange={(e) => setOutreachData({ ...outreachData, targetLocations: e.target.value })}
                  placeholder="New York, 90210, Beverly Hills..."
                />
                <FieldError show={attempted && !outreachData.targetLocations.trim()} />
              </div>
            ) : (
              <div className="space-y-2">
                <RequiredLabel>10 Target Accounts (@handles)</RequiredLabel>
                <Textarea
                  className={cn(
                    textareaCls,
                    "min-h-[120px]",
                    attempted && !outreachData.targetAccounts.trim() && errorRingCls,
                  )}
                  value={outreachData.targetAccounts}
                  onChange={(e) => setOutreachData({ ...outreachData, targetAccounts: e.target.value })}
                  placeholder={"@competitor1\n@competitor2..."}
                />
                <FieldError show={attempted && !outreachData.targetAccounts.trim()} />
              </div>
            )}
            <div className="space-y-4">
              <Label className={labelCls}>Allow following for better response rate?</Label>
              <div className="flex gap-4">
                {["yes", "no"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setOutreachData({ ...outreachData, allowFollow: opt })}
                    className={cn(
                      "flex-1 h-14 rounded-2xl font-black uppercase tracking-wider transition-all border",
                      outreachData.allowFollow === opt
                        ? "bg-primary text-primary-foreground border-primary amber-glow"
                        : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <Label className={labelCls}>Enable Free Community Engagement Service?</Label>
              <div className="flex gap-4">
                {["yes", "no"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setOutreachData({ ...outreachData, enableEngagement: opt })}
                    className={cn(
                      "flex-1 h-14 rounded-2xl font-black uppercase tracking-wider transition-all border",
                      outreachData.enableEngagement === opt
                        ? "bg-primary text-primary-foreground border-primary amber-glow"
                        : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground italic text-center px-4">
                This helps boost your exposure and activity on Instagram by engaging with community members.
              </p>
            </div>
          </div>
        )}

        {selected === "mass-dm" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <RequiredLabel>Instagram Username (Destination)</RequiredLabel>
              <Input
                className={cn(
                  inputCls,
                  attempted && !massDmData.trafficDestination.trim() && errorRingCls,
                )}
                value={massDmData.trafficDestination}
                onChange={(e) => setMassDmData({ ...massDmData, trafficDestination: e.target.value })}
                placeholder="@yourhandle"
              />
              <FieldError show={attempted && !massDmData.trafficDestination.trim()} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <RequiredLabel>How many DMs?</RequiredLabel>
                <Input
                  className={cn(
                    inputCls,
                    attempted && !massDmData.dmCount.trim() && errorRingCls,
                  )}
                  value={massDmData.dmCount}
                  onChange={(e) => setMassDmData({ ...massDmData, dmCount: e.target.value })}
                  placeholder="10,000"
                />
                <FieldError show={attempted && !massDmData.dmCount.trim()} />
              </div>
              <div className="space-y-2">
                <Label className={labelCls}>Phone Number</Label>
                <Input
                  className={inputCls}
                  value={massDmData.phone}
                  onChange={(e) => setMassDmData({ ...massDmData, phone: e.target.value })}
                  placeholder="+1..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <RequiredLabel>Email</RequiredLabel>
              <Input
                className={cn(
                  inputCls,
                  attempted && !massDmData.email.trim() && errorRingCls,
                )}
                value={massDmData.email}
                onChange={(e) => setMassDmData({ ...massDmData, email: e.target.value })}
                placeholder="your@email.com"
              />
              <FieldError show={attempted && !massDmData.email.trim()} />
            </div>
            <div className="space-y-2">
              <RequiredLabel>Ideal Target Accounts (Vertical List)</RequiredLabel>
              <Textarea
                className={cn(
                  textareaCls,
                  "min-h-[160px]",
                  attempted && !massDmData.targetAccounts.trim() && errorRingCls,
                )}
                value={massDmData.targetAccounts}
                onChange={(e) => setMassDmData({ ...massDmData, targetAccounts: e.target.value })}
                placeholder={"@handle1\n@handle2\n@handle3..."}
              />
              <FieldError show={attempted && !massDmData.targetAccounts.trim()} />
              <p className="text-[10px] text-muted-foreground italic px-1">
                Note: Please select accounts with &lt;10k followers for best results.
              </p>
            </div>
            <div className="space-y-2">
              <RequiredLabel>Ideal Outreach Message</RequiredLabel>
              <Textarea
                className={cn(
                  textareaCls,
                  "min-h-[160px]",
                  attempted && !massDmData.outreachMessage.trim() && errorRingCls,
                )}
                value={massDmData.outreachMessage}
                onChange={(e) => setMassDmData({ ...massDmData, outreachMessage: e.target.value })}
                placeholder="Write your draft here. We will touch it up for best conversion."
              />
              <FieldError show={attempted && !massDmData.outreachMessage.trim()} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Questions and Comments</Label>
              <Textarea
                className={cn(textareaCls, "min-h-[120px]")}
                value={massDmData.comments}
                onChange={(e) => setMassDmData({ ...massDmData, comments: e.target.value })}
                placeholder="Any specific instructions or questions for the team?"
              />
            </div>
          </div>
        )}

        {selected === "website" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <RequiredLabel>Project Title</RequiredLabel>
              <Input
                className={cn(
                  inputCls,
                  attempted && !websiteData.title.trim() && errorRingCls,
                )}
                value={websiteData.title}
                onChange={(e) => setWebsiteData({ ...websiteData, title: e.target.value })}
                placeholder="My New Business Website"
              />
              <FieldError show={attempted && !websiteData.title.trim()} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Google Drive Folder Link</Label>
              <Input
                className={inputCls}
                value={websiteData.googleDriveLink}
                onChange={(e) => setWebsiteData({ ...websiteData, googleDriveLink: e.target.value })}
                placeholder="https://drive.google.com/..."
              />
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Upload Company Logo (PNG/JPG)</p>
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    className={cn(inputCls, "cursor-pointer")}
                    onChange={(e) => handleFileUpload(e, "website")}
                  />
                  {websiteData.logoUrl && (
                    <div className="mt-2 flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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
            <div className="space-y-2">
              <RequiredLabel>About Us / Team Summary</RequiredLabel>
              <Textarea
                className={cn(
                  textareaCls,
                  "min-h-[160px]",
                  attempted && !websiteData.aboutUsSummary.trim() && errorRingCls,
                )}
                value={websiteData.aboutUsSummary}
                onChange={(e) => setWebsiteData({ ...websiteData, aboutUsSummary: e.target.value })}
                placeholder="A summary we can place on the About Us page."
              />
              <FieldError show={attempted && !websiteData.aboutUsSummary.trim()} />
            </div>
            <div className="space-y-2">
              <RequiredLabel>Must-Have Features</RequiredLabel>
              <Textarea
                className={cn(
                  textareaCls,
                  "min-h-[100px]",
                  attempted && !websiteData.features.trim() && errorRingCls,
                )}
                value={websiteData.features}
                onChange={(e) => setWebsiteData({ ...websiteData, features: e.target.value })}
                placeholder="Contact form, booking system, e-commerce, etc."
              />
              <FieldError show={attempted && !websiteData.features.trim()} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Brand Elements</Label>
              <Textarea
                className={cn(textareaCls, "min-h-[100px]")}
                value={websiteData.brandElements}
                onChange={(e) => setWebsiteData({ ...websiteData, brandElements: e.target.value })}
                placeholder="Colors, specific fonts, imagery style, etc."
              />
            </div>
          </div>
        )}

        {selected === "content" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <RequiredLabel>Text for Each Design (Numbered List)</RequiredLabel>
              <Textarea
                className={cn(
                  textareaCls,
                  "min-h-[120px]",
                  attempted && !contentData.designTexts.trim() && errorRingCls,
                )}
                value={contentData.designTexts}
                onChange={(e) => setContentData({ ...contentData, designTexts: e.target.value })}
                placeholder={"1. Text for first post\n2. Text for second post..."}
              />
              <FieldError show={attempted && !contentData.designTexts.trim()} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Design Examples / Similar Styles</Label>
              <Textarea
                className={cn(textareaCls, "min-h-[100px]")}
                value={contentData.designExamples}
                onChange={(e) => setContentData({ ...contentData, designExamples: e.target.value })}
                placeholder="Describe styles or link to examples you like."
              />
            </div>
            <div className="space-y-2">
              <RequiredLabel>Brand Colors</RequiredLabel>
              <Input
                className={cn(
                  inputCls,
                  attempted && !contentData.colors.trim() && errorRingCls,
                )}
                value={contentData.colors}
                onChange={(e) => setContentData({ ...contentData, colors: e.target.value })}
                placeholder="Primary colors to use."
              />
              <FieldError show={attempted && !contentData.colors.trim()} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Google Drive Link (Labeled Pictures)</Label>
              <Input
                className={inputCls}
                value={contentData.googleDriveLink}
                onChange={(e) => setContentData({ ...contentData, googleDriveLink: e.target.value })}
                placeholder="https://drive.google.com/..."
              />
              <p className="text-[10px] text-muted-foreground italic px-1">
                Label pictures by numbers for each individual design (1, 2, 3 etc).
              </p>
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Upload Company Logo (PNG/JPG)</Label>
              <Input
                type="file"
                accept="image/*"
                className={cn(inputCls, "cursor-pointer")}
                onChange={(e) => handleFileUpload(e, "content")}
              />
              {contentData.logoUrl && (
                <div className="mt-2 flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={contentData.logoUrl} alt="Logo preview" className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                  <span className="text-[10px] text-green-400 font-bold">Logo loaded</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-12 px-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-lg amber-glow"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
