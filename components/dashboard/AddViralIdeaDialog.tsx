"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function AddViralIdeaDialog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const saveIdea = useMutation(api.viralWorkspace.saveIdea);

  const [formData, setFormData] = useState({
    idea: "",
    platform: "any",
    category: "education",
    hook: "",
    whyItWorks: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.idea) {
      toast.error("Idea title is required");
      return;
    }

    setLoading(true);
    try {
      await saveIdea({
        userId,
        ...formData,
      });
      toast.success("Viral idea saved");
      setOpen(false);
      setFormData({
        idea: "",
        platform: "any",
        category: "education",
        hook: "",
        whyItWorks: "",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save idea");
    } finally {
      setLoading(true); // Wait, this should be false
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="amber-glow font-bold">
          <Plus className="mr-2 h-4 w-4" />
          Add Manual Idea
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Manual Viral Idea</DialogTitle>
            <DialogDescription>
              Capture a winning content angle to use in your pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="idea">Idea Title / Angle</Label>
              <Input
                id="idea"
                value={formData.idea}
                onChange={(e) => setFormData({ ...formData, idea: e.target.value })}
                placeholder="e.g. How to get 10 clients with 1 loom video"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="platform">Platform</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(val) => setFormData({ ...formData, platform: val })}
                >
                  <SelectTrigger id="platform">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="reddit">Reddit</SelectItem>
                    <SelectItem value="substack">Substack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client attraction">Client Attraction</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="social proof">Social Proof</SelectItem>
                    <SelectItem value="controversy">Controversy</SelectItem>
                    <SelectItem value="trend">Trend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hook">Opening Hook</Label>
              <Input
                id="hook"
                value={formData.hook}
                onChange={(e) => setFormData({ ...formData, hook: e.target.value })}
                placeholder="e.g. Most agency owners are doing outreach wrong..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="whyItWorks">Why It Works / Strategy</Label>
              <Textarea
                id="whyItWorks"
                value={formData.whyItWorks}
                onChange={(e) => setFormData({ ...formData, whyItWorks: e.target.value })}
                placeholder="e.g. It creates curiosity and flips a common belief."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full amber-glow font-bold">
              {loading ? "Saving..." : "Save Viral Idea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
