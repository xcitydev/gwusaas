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
  };

  const handleSubmit = async () => {
    if (!user?.id || !selected) return;
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
              <Label className={labelCls}>Instagram Username</Label>
              <Input
                className={inputCls}
                value={outreachData.username}
                onChange={(e) => setOutreachData({ ...outreachData, username: e.target.value })}
                placeholder="@username"
              />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Instagram Password</Label>
              <Input
                type="password"
                className={inputCls}
                value={outreachData.password}
                onChange={(e) => setOutreachData({ ...outreachData, password: e.target.value })}
                placeholder="••••••••"
              />
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
              <Label className={labelCls}>Ideal Client Description</Label>
              <Textarea
                className={cn(textareaCls, "min-h-[120px]")}
                value={outreachData.idealClient}
                onChange={(e) => setOutreachData({ ...outreachData, idealClient: e.target.value })}
                placeholder="Age range, profession, income, buying motivations..."
              />
            </div>
            {selected === "real-estate" ? (
              <div className="space-y-2">
                <Label className={labelCls}>Target Locations (Cities/ZIPs)</Label>
                <Textarea
                  className={cn(textareaCls, "min-h-[100px]")}
                  value={outreachData.targetLocations}
                  onChange={(e) => setOutreachData({ ...outreachData, targetLocations: e.target.value })}
                  placeholder="New York, 90210, Beverly Hills..."
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className={labelCls}>10 Target Accounts (@handles)</Label>
                <Textarea
                  className={cn(textareaCls, "min-h-[120px]")}
                  value={outreachData.targetAccounts}
                  onChange={(e) => setOutreachData({ ...outreachData, targetAccounts: e.target.value })}
                  placeholder={"@competitor1\n@competitor2..."}
                />
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
              <Label className={labelCls}>Instagram Username (Destination)</Label>
              <Input
                className={inputCls}
                value={massDmData.trafficDestination}
                onChange={(e) => setMassDmData({ ...massDmData, trafficDestination: e.target.value })}
                placeholder="@yourhandle"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={labelCls}>How many DMs?</Label>
                <Input
                  className={inputCls}
                  value={massDmData.dmCount}
                  onChange={(e) => setMassDmData({ ...massDmData, dmCount: e.target.value })}
                  placeholder="10,000"
                />
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
              <Label className={labelCls}>Email</Label>
              <Input
                className={inputCls}
                value={massDmData.email}
                onChange={(e) => setMassDmData({ ...massDmData, email: e.target.value })}
                placeholder="your@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Ideal Target Accounts (Vertical List)</Label>
              <Textarea
                className={cn(textareaCls, "min-h-[160px]")}
                value={massDmData.targetAccounts}
                onChange={(e) => setMassDmData({ ...massDmData, targetAccounts: e.target.value })}
                placeholder={"@handle1\n@handle2\n@handle3..."}
              />
              <p className="text-[10px] text-muted-foreground italic px-1">
                Note: Please select accounts with &lt;10k followers for best results.
              </p>
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Ideal Outreach Message</Label>
              <Textarea
                className={cn(textareaCls, "min-h-[160px]")}
                value={massDmData.outreachMessage}
                onChange={(e) => setMassDmData({ ...massDmData, outreachMessage: e.target.value })}
                placeholder="Write your draft here. We will touch it up for best conversion."
              />
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
              <Label className={labelCls}>Project Title</Label>
              <Input
                className={inputCls}
                value={websiteData.title}
                onChange={(e) => setWebsiteData({ ...websiteData, title: e.target.value })}
                placeholder="My New Business Website"
              />
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
              <Label className={labelCls}>About Us / Team Summary</Label>
              <Textarea
                className={cn(textareaCls, "min-h-[160px]")}
                value={websiteData.aboutUsSummary}
                onChange={(e) => setWebsiteData({ ...websiteData, aboutUsSummary: e.target.value })}
                placeholder="A summary we can place on the About Us page."
              />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Must-Have Features</Label>
              <Textarea
                className={cn(textareaCls, "min-h-[100px]")}
                value={websiteData.features}
                onChange={(e) => setWebsiteData({ ...websiteData, features: e.target.value })}
                placeholder="Contact form, booking system, e-commerce, etc."
              />
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
              <Label className={labelCls}>Text for Each Design (Numbered List)</Label>
              <Textarea
                className={cn(textareaCls, "min-h-[120px]")}
                value={contentData.designTexts}
                onChange={(e) => setContentData({ ...contentData, designTexts: e.target.value })}
                placeholder={"1. Text for first post\n2. Text for second post..."}
              />
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
              <Label className={labelCls}>Brand Colors</Label>
              <Input
                className={inputCls}
                value={contentData.colors}
                onChange={(e) => setContentData({ ...contentData, colors: e.target.value })}
                placeholder="Primary colors to use."
              />
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
