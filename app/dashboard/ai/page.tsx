"use client";

import type React from "react";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Brain,
  MessageSquare,
  Settings,
  Upload,
  FileText,
  ExternalLink,
  Hash,
  Video,
  BookOpen,
  Sparkles,
  Copy,
  RefreshCw,
} from "lucide-react";

interface AIModel {
  id: string;
  name: string;
  status: "training" | "ready" | "draft";
  createdAt: string;
  trainingData: number;
  conversations: number;
}

interface GeneratedContent {
  captions?: string[];
  hashtags?: string[];
  videoIdeas?: string[];
  blogOutline?: { title: string; sections: string[] };
}

import SideBar from "@/components/SideBar";
interface AIModel {
  id: string;
  name: string;
  status: "training" | "ready" | "draft";
  createdAt: string;
  trainingData: number;
  conversations: number;
}

const page = () => {
  const [aiModels, setAiModels] = useState<AIModel[]>([
    {
      id: "1",
      name: "Customer Support AI",
      status: "ready",
      createdAt: "2024-01-15",
      trainingData: 150,
      conversations: 45,
    },
    {
      id: "2",
      name: "Sales Assistant AI",
      status: "training",
      createdAt: "2024-01-20",
      trainingData: 89,
      conversations: 0,
    },
  ]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTrainModalOpen, setIsTrainModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [selectedAI, setSelectedAI] = useState<AIModel | null>(null);
  const [newAIName, setNewAIName] = useState("");
  const [trainingText, setTrainingText] = useState("");
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "ai"; content: string }>
  >([]);
  const [currentMessage, setCurrentMessage] = useState("");

  const [captionInput, setCaptionInput] = useState("");
  const [videoIdeaInput, setVideoIdeaInput] = useState("");
  const [blogTitleInput, setBlogTitleInput] = useState("");
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent>(
    {}
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCreateAI = () => {
    if (newAIName.trim()) {
      const newAI: AIModel = {
        id: Date.now().toString(),
        name: newAIName,
        status: "draft",
        createdAt: new Date().toISOString().split("T")[0],
        trainingData: 0,
        conversations: 0,
      };
      setAiModels([...aiModels, newAI]);
      setNewAIName("");
      setIsCreateModalOpen(false);
    }
  };

  const handleTrainAI = (ai: AIModel) => {
    setSelectedAI(ai);
    setIsTrainModalOpen(true);
  };

  const handleChatWithAI = (ai: AIModel) => {
    setSelectedAI(ai);
    setChatMessages([]);
    setIsChatModalOpen(true);
  };

  const handleSendMessage = () => {
    if (currentMessage.trim()) {
      setChatMessages([
        ...chatMessages,
        { role: "user", content: currentMessage },
        {
          role: "ai",
          content: `This is a simulated response from ${selectedAI?.name}. In production, this would connect to your trained AI model.`,
        },
      ]);
      setCurrentMessage("");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In production, this would upload the file to your backend
      console.log("[v0] File uploaded:", file.name);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready":
        return "bg-green-500";
      case "training":
        return "bg-yellow-500";
      case "draft":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const generateCaptions = async () => {
    if (!captionInput.trim()) return;
    setIsGenerating(true);

    // Simulate API call - replace with actual backend call
    setTimeout(() => {
      const mockCaptions = [
        `✨ ${captionInput} - Creating magic one moment at a time! What's your favorite part about this? 💫`,
        `Just captured this amazing moment! ${captionInput} 📸 Drop a ❤️ if you love it too!`,
        `Behind the scenes: ${captionInput} 🎬 The process is just as beautiful as the result!`,
        `${captionInput} - Sometimes the simplest moments create the biggest impact 🌟`,
      ];

      const mockHashtags = [
        "#contentcreator",
        "#socialmedia",
        "#marketing",
        "#business",
        "#entrepreneur",
        "#digitalmarketing",
        "#branding",
        "#creative",
        "#inspiration",
        "#growth",
      ];

      setGeneratedContent((prev) => ({
        ...prev,
        captions: mockCaptions,
        hashtags: mockHashtags,
      }));
      setIsGenerating(false);
    }, 2000);
  };

  const generateVideoIdeas = async () => {
    if (!videoIdeaInput.trim()) return;
    setIsGenerating(true);

    setTimeout(() => {
      const mockVideoIdeas = [
        `5 Common Mistakes in ${videoIdeaInput} (And How to Fix Them)`,
        `Day in the Life: Working in ${videoIdeaInput}`,
        `Before vs After: My ${videoIdeaInput} Transformation`,
        `3 Things I Wish I Knew Before Starting ${videoIdeaInput}`,
        `Quick Tips: Master ${videoIdeaInput} in 60 Seconds`,
      ];

      setGeneratedContent((prev) => ({
        ...prev,
        videoIdeas: mockVideoIdeas,
      }));
      setIsGenerating(false);
    }, 2000);
  };

  const generateBlogOutline = async () => {
    if (!blogTitleInput.trim()) return;
    setIsGenerating(true);

    setTimeout(() => {
      const mockOutline = {
        title: blogTitleInput,
        sections: [
          "Introduction: Why This Matters",
          "The Problem Most People Face",
          "Step-by-Step Solution",
          "Common Mistakes to Avoid",
          "Real-World Examples",
          "Tools and Resources",
          "Conclusion and Next Steps",
        ],
      };

      setGeneratedContent((prev) => ({
        ...prev,
        blogOutline: mockOutline,
      }));
      setIsGenerating(false);
    }, 2000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };
  return (
    <SideBar>
      <div className="flex-1 space-y-4 p-8 pt-6 max-w-7xl mx-auto">
        <div>
          <div className="p-6 space-y-6">
            {/* Header */}
            <motion.div
              className="flex items-center justify-between"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-foreground">
                  AI Studio
                </h1>
                <p className="text-muted-foreground">
                  Create, train, and deploy your personalized AI assistants
                </p>
              </div>

              <Dialog
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
              >
                <DialogTrigger asChild>
                  <Button className="cursor-pointer bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New AI
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New AI Assistant</DialogTitle>
                    <DialogDescription>
                      Give your AI assistant a name to get started
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="ai-name">AI Name</Label>
                      <Input
                        id="ai-name"
                        placeholder="e.g., Customer Support AI"
                        value={newAIName}
                        onChange={(e) => setNewAIName(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleCreateAI} className="w-full">
                      Create AI Assistant
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </motion.div>

            {/* AI Models Grid */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-[5rem]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {aiModels.map((ai, index) => (
                <motion.div
                  key={ai.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Card className="bg-card/50 backdrop-blur-sm border-border hover:shadow-lg transition-all duration-300">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center space-x-2">
                          <Brain className="w-5 h-5 text-primary" />
                          <span>{ai.name}</span>
                        </CardTitle>
                        <Badge
                          className={`${getStatusColor(ai.status)} text-white`}
                        >
                          {ai.status}
                        </Badge>
                      </div>
                      <CardDescription>
                        Created on {new Date(ai.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            Training Data:
                          </span>
                          <p className="font-medium">{ai.trainingData} items</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Conversations:
                          </span>
                          <p className="font-medium">{ai.conversations}</p>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTrainAI(ai)}
                          className="flex-1 cursor-pointer hover:text-primary/80"
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          Train
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleChatWithAI(ai)}
                          className="flex-1 cursor-pointer hover:text-primary/80"
                          disabled={ai.status === "draft"}
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Chat
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-primary cursor-pointer"
                        disabled={ai.status !== "ready"}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Export AI
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="space-y-6 pt-7 mt-7"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="border-t border-border pt-8">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  AI Content Generation Tools
                </h2>
                <p className="text-muted-foreground mb-6">
                  Generate engaging content for your social media and marketing
                  campaigns
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Caption & Hashtag Generator */}
                  <Card className="bg-card/50 backdrop-blur-sm border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Hash className="w-5 h-5 text-primary" />
                        <span>Caption & Hashtag Generator</span>
                      </CardTitle>
                      <CardDescription>
                        Generate engaging captions with relevant hashtags
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="caption-input">
                          Describe your content
                        </Label>
                        <Textarea
                          id="caption-input"
                          placeholder="e.g., A photo of my new coffee shop's latte art with a cozy vibe"
                          value={captionInput}
                          onChange={(e) => setCaptionInput(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <Button
                        onClick={generateCaptions}
                        className="w-full"
                        disabled={isGenerating || !captionInput.trim()}
                      >
                        {isGenerating ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate Captions
                          </>
                        )}
                      </Button>

                      {generatedContent.captions && (
                        <div className="space-y-3 mt-4">
                          <h4 className="font-medium text-sm">
                            Generated Captions:
                          </h4>
                          {generatedContent.captions.map((caption, index) => (
                            <div
                              key={index}
                              className="p-3 bg-muted/50 rounded-lg text-sm"
                            >
                              <p className="mb-2">{caption}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(caption)}
                                className="h-6 px-2"
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copy
                              </Button>
                            </div>
                          ))}

                          {generatedContent.hashtags && (
                            <div className="mt-4">
                              <h4 className="font-medium text-sm mb-2">
                                Suggested Hashtags:
                              </h4>
                              <div className="flex flex-wrap gap-1">
                                {generatedContent.hashtags.map(
                                  (hashtag, index) => (
                                    <Badge
                                      key={index}
                                      variant="secondary"
                                      className="text-xs cursor-pointer"
                                      onClick={() => copyToClipboard(hashtag)}
                                    >
                                      {hashtag}
                                    </Badge>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Video/Reel Idea Generator */}
                  <Card className="bg-card/50 backdrop-blur-sm border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Video className="w-5 h-5 text-primary" />
                        <span>Video Idea Generator</span>
                      </CardTitle>
                      <CardDescription>
                        Get trending video ideas for your niche
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="video-input">Your niche or topic</Label>
                        <Input
                          id="video-input"
                          placeholder="e.g., financial planning for millennials"
                          value={videoIdeaInput}
                          onChange={(e) => setVideoIdeaInput(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={generateVideoIdeas}
                        className="w-full"
                        disabled={isGenerating || !videoIdeaInput.trim()}
                      >
                        {isGenerating ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate Ideas
                          </>
                        )}
                      </Button>

                      {generatedContent.videoIdeas && (
                        <div className="space-y-2 mt-4">
                          <h4 className="font-medium text-sm">Video Ideas:</h4>
                          {generatedContent.videoIdeas.map((idea, index) => (
                            <div
                              key={index}
                              className="p-3 bg-muted/50 rounded-lg text-sm"
                            >
                              <p className="mb-2">{idea}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(idea)}
                                className="h-6 px-2"
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copy
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Blog Post Outline Generator */}
                  <Card className="bg-card/50 backdrop-blur-sm border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        <span>Blog Outline Generator</span>
                      </CardTitle>
                      <CardDescription>
                        Create structured blog post outlines
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="blog-input">
                          Blog post title or topic
                        </Label>
                        <Input
                          id="blog-input"
                          placeholder="e.g., How to get more leads on Instagram"
                          value={blogTitleInput}
                          onChange={(e) => setBlogTitleInput(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={generateBlogOutline}
                        className="w-full"
                        disabled={isGenerating || !blogTitleInput.trim()}
                      >
                        {isGenerating ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate Outline
                          </>
                        )}
                      </Button>

                      {generatedContent.blogOutline && (
                        <div className="space-y-3 mt-4">
                          <h4 className="font-medium text-sm">Blog Outline:</h4>
                          <div className="p-3 bg-muted/50 rounded-lg text-sm">
                            <h5 className="font-medium mb-2">
                              {generatedContent.blogOutline.title}
                            </h5>
                            <ol className="space-y-1">
                              {generatedContent.blogOutline.sections.map(
                                (section, index) => (
                                  <li key={index} className="flex items-start">
                                    <span className="text-primary mr-2">
                                      {index + 1}.
                                    </span>
                                    <span>{section}</span>
                                  </li>
                                )
                              )}
                            </ol>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                copyToClipboard(
                                  `${
                                    generatedContent.blogOutline?.title
                                  }\n\n${generatedContent.blogOutline?.sections
                                    .map((s, i) => `${i + 1}. ${s}`)
                                    .join("\n")}`
                                )
                              }
                              className="h-6 px-2 mt-2"
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copy Outline
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </motion.div>

            {/* Train AI Modal */}
            <Dialog open={isTrainModalOpen} onOpenChange={setIsTrainModalOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Train {selectedAI?.name}</DialogTitle>
                  <DialogDescription>
                    Add training data to improve your AI's responses
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="training-text">Training Text</Label>
                    <Textarea
                      id="training-text"
                      placeholder="Enter training data, FAQs, or knowledge base content..."
                      value={trainingText}
                      onChange={(e) => setTrainingText(e.target.value)}
                      rows={8}
                    />
                  </div>

                  <div>
                    <Label htmlFor="file-upload">Upload Documents</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Upload PDF, TXT, or DOC files
                      </p>
                      <Input
                        id="file-upload"
                        type="file"
                        accept=".pdf,.txt,.doc,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() =>
                          document.getElementById("file-upload")?.click()
                        }
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Choose Files
                      </Button>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={() => setIsTrainModalOpen(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button className="flex-1">Start Training</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Chat Modal */}
            <Dialog open={isChatModalOpen} onOpenChange={setIsChatModalOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Chat with {selectedAI?.name}</DialogTitle>
                  <DialogDescription>
                    Test your AI assistant's responses
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="h-64 border rounded-lg p-4 overflow-y-auto bg-muted/20">
                    {chatMessages.length === 0 ? (
                      <p className="text-muted-foreground text-center">
                        Start a conversation with your AI...
                      </p>
                    ) : (
                      chatMessages.map((message, index) => (
                        <div
                          key={index}
                          className={`mb-3 ${
                            message.role === "user" ? "text-right" : "text-left"
                          }`}
                        >
                          <div
                            className={`inline-block p-2 rounded-lg max-w-xs ${
                              message.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            {message.content}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Input
                      placeholder="Type your message..."
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleSendMessage()
                      }
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage}>Send</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </SideBar>
  );
};

export default page;
