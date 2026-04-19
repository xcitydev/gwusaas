"use client";

import { useState, useEffect, useCallback } from "react";
import SideBar from "@/components/SideBar";
import { PlanGate } from "@/components/PlanGate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IMAGE_MODELS, VIDEO_MODELS, PROVIDER_LABELS, BADGE_COLORS } from "./model-data";
import {
  ImageIcon, Video, Loader2, Download, RefreshCw, Sparkles, AlertCircle,
  Search, Grid, CheckSquare, Square,
} from "lucide-react";
import { toast } from "sonner";

interface MediaItem {
  id: string; type: string; provider: string; model: string; prompt: string;
  status: string; resultUrl: string | null; thumbnailUrl: string | null;
  width: number | null; height: number | null; duration: number | null;
  error: string | null; createdAt: string;
}

interface ApifyImage { url: string; title: string; sourceUrl: string }

function ModelCard({ model, selected, onSelect }: {
  model: (typeof IMAGE_MODELS)[0]; selected: boolean; onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex w-full flex-col items-start rounded-lg border p-3 text-left transition-colors ${
        selected ? "border-primary bg-primary/5" : "hover:border-muted-foreground/40 hover:bg-accent"
      }`}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="text-sm font-medium">{model.name}</span>
        <div className="flex shrink-0 items-center gap-1">
          {model.badge && (
            <Badge variant="secondary" className={`text-xs ${BADGE_COLORS[model.badge] ?? ""}`}>
              {model.badge}
            </Badge>
          )}
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium text-white ${PROVIDER_LABELS[model.provider]?.color ?? "bg-zinc-500"}`}>
            {PROVIDER_LABELS[model.provider]?.label ?? model.provider}
          </span>
        </div>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{model.description}</p>
    </button>
  );
}

function MediaCard({ item, onPollUpdate }: { item: MediaItem; onPollUpdate: (u: MediaItem) => void }) {
  const [polling, setPolling] = useState(item.status === "processing");

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/media/${item.id}/poll`);
      if (!res.ok) return;
      const updated: MediaItem = await res.json();
      if (updated.status !== "processing") { setPolling(false); onPollUpdate(updated); }
    }, 4000);
    return () => clearInterval(interval);
  }, [polling, item.id, onPollUpdate]);

  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card">
      <div className="relative flex aspect-video items-center justify-center bg-muted/40">
        {item.status === "processing" && (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-xs">Generating…</span>
          </div>
        )}
        {item.status === "failed" && (
          <div className="flex flex-col items-center gap-2 text-destructive p-4">
            <AlertCircle className="h-8 w-8" />
            <span className="text-center text-xs">{item.error ?? "Failed"}</span>
          </div>
        )}
        {item.status === "completed" && item.type === "image" && item.resultUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.resultUrl} alt={item.prompt} className="h-full w-full object-cover" />
        )}
        {item.status === "completed" && item.type === "video" && item.resultUrl && (
          <video src={item.resultUrl} controls className="h-full w-full object-contain" poster={item.thumbnailUrl ?? undefined} />
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-xs text-muted-foreground">{item.prompt}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <span className={`rounded px-1.5 py-0.5 text-xs font-medium text-white ${PROVIDER_LABELS[item.provider]?.color ?? "bg-zinc-500"}`}>
              {PROVIDER_LABELS[item.provider]?.label ?? item.provider}
            </span>
            <Badge
              variant={item.status === "completed" ? "default" : item.status === "failed" ? "destructive" : "secondary"}
              className="text-xs"
            >
              {item.status}
            </Badge>
          </div>
          {item.status === "completed" && item.resultUrl && !item.resultUrl.startsWith("data:") && (
            <a href={item.resultUrl} download target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
              <Download className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function ImageGenerator({ onGenerated }: { onGenerated: (i: MediaItem) => void }) {
  const [selectedModel, setSelectedModel] = useState(IMAGE_MODELS[0]);
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [generating, setGenerating] = useState(false);
  const [w, h] = size.split("x").map(Number);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/media/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "image", provider: selectedModel.provider, model: selectedModel.id, prompt, negativePrompt: negativePrompt || undefined, width: w, height: h }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as { error?: string })?.error ?? `HTTP ${res.status}`); }
      onGenerated(await res.json());
      toast.success("Image generated!");
      setPrompt("");
    } catch (e) { toast.error(String(e)); } finally { setGenerating(false); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <Card>
        <CardHeader><CardTitle className="text-sm">Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Prompt</Label>
            <Textarea placeholder="A cinematic photo of…" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Negative Prompt</Label>
            <Input placeholder="blurry, low quality…" value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Size</Label>
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="512x512">512 × 512</SelectItem>
                <SelectItem value="1024x1024">1024 × 1024</SelectItem>
                <SelectItem value="1792x1024">1792 × 1024 (Wide)</SelectItem>
                <SelectItem value="1024x1792">1024 × 1792 (Portrait)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={handleGenerate} disabled={generating || !prompt.trim()}>
            {generating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate</>}
          </Button>
        </CardContent>
      </Card>
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Model — <span className="text-foreground">{selectedModel.name}</span></h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {IMAGE_MODELS.map((m) => <ModelCard key={m.id} model={m} selected={selectedModel.id === m.id} onSelect={() => setSelectedModel(m)} />)}
        </div>
      </div>
    </div>
  );
}

function ImageSearch({ onCollageCreated }: { onCollageCreated: (i: MediaItem) => void }) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ApifyImage[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [caption, setCaption] = useState("");
  const [columns, setColumns] = useState("3");
  const [creatingCollage, setCreatingCollage] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true); setResults([]); setSelected(new Set());
    try {
      const res = await fetch("/api/media/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, maxResults: 12 }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as { error?: string })?.error ?? "Search failed"); }
      const data = await res.json() as { images?: ApifyImage[] };
      setResults(data.images ?? []);
    } catch (e) { toast.error(String(e)); } finally { setSearching(false); }
  }

  function toggleSelect(url: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(url) ? n.delete(url) : n.add(url); return n; });
  }

  async function handleCollage() {
    if (selected.size === 0) { toast.error("Select at least 1 image"); return; }
    setCreatingCollage(true);
    try {
      const res = await fetch("/api/media/collage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: Array.from(selected), columns: Number(columns), caption: caption || undefined }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as { error?: string })?.error ?? "Collage failed"); }
      const data = await res.json() as { id: string; url: string };
      onCollageCreated({
        id: data.id, type: "image", provider: "collage", model: "sharp-collage",
        prompt: `Collage: ${query}`, status: "completed", resultUrl: data.url,
        thumbnailUrl: null, width: null, height: null, duration: null,
        error: null, createdAt: new Date().toISOString(),
      });
      toast.success("Collage created!");
    } catch (e) { toast.error(String(e)); } finally { setCreatingCollage(false); }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search for images… e.g. 'luxury watches', 'coastal living'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={searching || !query.trim()}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Powered by Apify — requires APIFY_API_KEY in environment</p>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{selected.size} / {results.length} selected</span>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set(results.map((r) => r.url)))}>
                <CheckSquare className="mr-1 h-3.5 w-3.5" /> All
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                <Square className="mr-1 h-3.5 w-3.5" /> None
              </Button>
            </div>
            {selected.size > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Select value={columns} onValueChange={setColumns}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 column</SelectItem>
                    <SelectItem value="2">2 columns</SelectItem>
                    <SelectItem value="3">3 columns</SelectItem>
                    <SelectItem value="4">4 columns</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Caption text…" value={caption} onChange={(e) => setCaption(e.target.value)} className="w-36 sm:w-48" />
                <Button onClick={handleCollage} disabled={creatingCollage}>
                  {creatingCollage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Grid className="mr-2 h-4 w-4" />}
                  Make Collage
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {results.map((img) => {
              const isSel = selected.has(img.url);
              return (
                <button
                  key={img.url}
                  onClick={() => toggleSelect(img.url)}
                  className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${isSel ? "border-primary ring-2 ring-primary/30" : "border-transparent"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.title} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  {isSel && <div className="absolute inset-0 flex items-center justify-center bg-primary/20"><CheckSquare className="h-6 w-6 text-white drop-shadow" /></div>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function VideoGenerator({ onGenerated }: { onGenerated: (i: MediaItem) => void }) {
  const [selectedModel, setSelectedModel] = useState(VIDEO_MODELS[0]);
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [duration, setDuration] = useState("5");
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/media/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "video", provider: selectedModel.provider, model: selectedModel.id, prompt, imageUrl: imageUrl || undefined, duration: Number(duration) }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as { error?: string })?.error ?? `HTTP ${res.status}`); }
      onGenerated(await res.json());
      toast.success("Video generation started!");
      setPrompt("");
    } catch (e) { toast.error(String(e)); } finally { setGenerating(false); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <Card>
        <CardHeader><CardTitle className="text-sm">Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Prompt</Label>
            <Textarea placeholder="A drone shot flying over…" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Starting Image URL (image-to-video)</Label>
            <Input placeholder="https://…" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4 sec</SelectItem>
                <SelectItem value="5">5 sec</SelectItem>
                <SelectItem value="10">10 sec</SelectItem>
                <SelectItem value="15">15 sec</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={handleGenerate} disabled={generating || !prompt.trim()}>
            {generating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting…</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate Video</>}
          </Button>
          <p className="text-xs text-muted-foreground">Generation takes 30–120 seconds. Your video appears in the gallery automatically.</p>
        </CardContent>
      </Card>
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Model — <span className="text-foreground">{selectedModel.name}</span></h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {VIDEO_MODELS.map((m) => <ModelCard key={m.id} model={m} selected={selectedModel.id === m.id} onSelect={() => setSelectedModel(m)} />)}
        </div>
      </div>
    </div>
  );
}

function Gallery({ type, items, setItems }: {
  type: "image" | "video";
  items: MediaItem[];
  setItems: React.Dispatch<React.SetStateAction<MediaItem[]>>;
}) {
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/media?type=${type}`);
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }, [type, setItems]);

  useEffect(() => { refresh(); }, [refresh]);

  const handlePollUpdate = useCallback((u: MediaItem) => {
    setItems((prev) => prev.map((i) => i.id === u.id ? u : i));
  }, [setItems]);

  if (items.length === 0 && !loading) return (
    <div className="flex flex-col items-center justify-center rounded-xl border py-16 text-muted-foreground">
      {type === "image" ? <ImageIcon className="mb-3 h-10 w-10" /> : <Video className="mb-3 h-10 w-10" />}
      <p className="text-sm">No {type}s yet — generate one above</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} {type}(s)</p>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => <MediaCard key={item.id} item={item} onPollUpdate={handlePollUpdate} />)}
      </div>
    </div>
  );
}

export default function MediaStudioPage() {
  const [imageItems, setImageItems] = useState<MediaItem[]>([]);
  const [videoItems, setVideoItems] = useState<MediaItem[]>([]);

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-7xl p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Media Studio</h1>
          <p className="text-muted-foreground">Generate AI images &amp; videos, search real images, and create collages</p>
        </div>

        <PlanGate requiredPlan="growth">
          <Tabs defaultValue="ai-image">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="ai-image" className="gap-1.5"><Sparkles className="h-3.5 w-3.5" /> AI Images</TabsTrigger>
              <TabsTrigger value="search" className="gap-1.5"><Search className="h-3.5 w-3.5" /> Search Images</TabsTrigger>
              <TabsTrigger value="video" className="gap-1.5"><Video className="h-3.5 w-3.5" /> AI Video</TabsTrigger>
            </TabsList>

            <TabsContent value="ai-image" className="mt-6 space-y-8">
              <ImageGenerator onGenerated={(i) => setImageItems((prev) => [i, ...prev])} />
              <div><h3 className="mb-4 text-base font-semibold">Image Gallery</h3><Gallery type="image" items={imageItems} setItems={setImageItems} /></div>
            </TabsContent>

            <TabsContent value="search" className="mt-6 space-y-8">
              <ImageSearch onCollageCreated={(i) => setImageItems((prev) => [i, ...prev])} />
              <div><h3 className="mb-4 text-base font-semibold">Collage Gallery</h3><Gallery type="image" items={imageItems} setItems={setImageItems} /></div>
            </TabsContent>

            <TabsContent value="video" className="mt-6 space-y-8">
              <VideoGenerator onGenerated={(i) => setVideoItems((prev) => [i, ...prev])} />
              <div><h3 className="mb-4 text-base font-semibold">Video Gallery</h3><Gallery type="video" items={videoItems} setItems={setVideoItems} /></div>
            </TabsContent>
          </Tabs>
        </PlanGate>
      </div>
    </SideBar>
  );
}
