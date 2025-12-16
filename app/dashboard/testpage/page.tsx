"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MessageSquare, Send, RefreshCw, Settings, CheckCircle, XCircle } from "lucide-react";
import SideBar from "@/components/SideBar";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

export default function TestIGPage() {
  const { user, isLoaded } = useUser();
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  
  // Form state for connecting page
  const [pageForm, setPageForm] = useState({
    pageId: "",
    pageName: "",
    accessToken: "",
  });

  // Get connected pages
  const pages = useQuery(api.testIG.listPages, {});
  
  // Get conversations
  const conversations = useQuery(
    api.testIG.listConversations,
    selectedPageId ? { pageId: selectedPageId } : {}
  );

  // Get messages for selected thread
  const messages = useQuery(
    api.testIG.listDMs,
    selectedThreadId ? { threadId: selectedThreadId } : {}
  );

  const connectPage = useMutation(api.testIG.connectPage);
  const fetchAllDMs = useAction(api.testIG.fetchAllDMs);
  const setupWebhook = useAction(api.testIG.setupWebhook);
  const markAsRead = useMutation(api.testIG.markAsRead);

  const handleConnectPage = async () => {
    if (!pageForm.pageId || !pageForm.pageName || !pageForm.accessToken) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await connectPage({
        pageId: pageForm.pageId,
        pageName: pageForm.pageName,
        accessToken: pageForm.accessToken,
      });
      toast.success("Page connected successfully!");
      setPageForm({ pageId: "", pageName: "", accessToken: "" });
    } catch (error: any) {
      toast.error(`Failed to connect: ${error.message}`);
    }
  };

  const handleFetchDMs = async () => {
    if (!selectedPageId) {
      toast.error("Please select a page first");
      return;
    }

    try {
      const result = await fetchAllDMs({ pageId: selectedPageId });
      toast.success(`Fetched ${result.messagesCount} messages from ${result.conversationsCount} conversations!`);
    } catch (error: any) {
      toast.error(`Failed to fetch DMs: ${error.message}`);
    }
  };

  const handleSetupWebhook = async () => {
    if (!selectedPageId) {
      toast.error("Please select a page first");
      return;
    }

    const webhookUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhook/instagram`;

    try {
      await setupWebhook({
        pageId: selectedPageId,
        webhookUrl,
      });
      toast.success("Webhook configured successfully!");
    } catch (error: any) {
      toast.error(`Failed to setup webhook: ${error.message}`);
    }
  };

  const handleSelectThread = async (threadId: string) => {
    setSelectedThreadId(threadId);
    // Mark as read when opening thread
    try {
      await markAsRead({ threadId });
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c79b09]"></div>
      </div>
    );
  }

  return (
    <SideBar>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Instagram DM Testing</h2>
          <p className="text-muted-foreground">
            Connect your Instagram Business Account and manage DMs
          </p>
        </div>

        <Tabs defaultValue="connect" className="space-y-4">
          <TabsList>
            <TabsTrigger value="connect">Connect Page</TabsTrigger>
            <TabsTrigger value="dms">Messages</TabsTrigger>
            <TabsTrigger value="webhook">Webhook Setup</TabsTrigger>
          </TabsList>

          <TabsContent value="connect" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Connect Instagram Page</CardTitle>
                <CardDescription>
                  Connect your Facebook Page with Instagram Business Account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pageId">Facebook Page ID *</Label>
                  <Input
                    id="pageId"
                    value={pageForm.pageId}
                    onChange={(e) => setPageForm({ ...pageForm, pageId: e.target.value })}
                    placeholder="Enter Facebook Page ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pageName">Page Name *</Label>
                  <Input
                    id="pageName"
                    value={pageForm.pageName}
                    onChange={(e) => setPageForm({ ...pageForm, pageName: e.target.value })}
                    placeholder="Enter page name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accessToken">Access Token *</Label>
                  <Input
                    id="accessToken"
                    type="password"
                    value={pageForm.accessToken}
                    onChange={(e) => setPageForm({ ...pageForm, accessToken: e.target.value })}
                    placeholder="Enter long-lived access token"
                  />
                  <p className="text-sm text-muted-foreground">
                    Get this from Facebook Graph API Explorer or generate a long-lived token
                  </p>
                </div>
                <Button onClick={handleConnectPage}>Connect Page</Button>
              </CardContent>
            </Card>

            {pages && pages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Connected Pages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {pages.map((page) => (
                      <div
                        key={page._id}
                        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent"
                        onClick={() => setSelectedPageId(page.pageId)}
                      >
                        <div>
                          <div className="font-medium">{page.pageName}</div>
                          <div className="text-sm text-muted-foreground">
                            Page ID: {page.pageId}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            IG Account: {page.instagramBusinessAccountId}
                          </div>
                        </div>
                        <Badge variant={selectedPageId === page.pageId ? "default" : "outline"}>
                          {selectedPageId === page.pageId ? "Selected" : "Select"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="dms" className="space-y-4">
            {!selectedPageId ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Please select a page from the "Connect Page" tab first
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Conversations</h3>
                    <p className="text-sm text-muted-foreground">
                      {conversations?.length || 0} conversations
                    </p>
                  </div>
                  <Button onClick={handleFetchDMs}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Fetch All DMs
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Conversations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {conversations && conversations.length > 0 ? (
                        <div className="space-y-2">
                          {conversations.map((conv) => (
                            <div
                              key={conv.threadId}
                              className={`p-3 border rounded-lg cursor-pointer hover:bg-accent ${
                                selectedThreadId === conv.threadId ? "bg-accent" : ""
                              }`}
                              onClick={() => handleSelectThread(conv.threadId)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-medium">
                                    {conv.participantUsername || `User ${conv.participantId.slice(0, 8)}`}
                                  </div>
                                  <div className="text-sm text-muted-foreground truncate">
                                    {conv.lastMessage || "No messages"}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatDate(conv.lastMessageTime)}
                                  </div>
                                </div>
                                {conv.unreadCount > 0 && (
                                  <Badge variant="default">{conv.unreadCount}</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No conversations yet. Click "Fetch All DMs" to load messages.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Messages</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedThreadId && messages ? (
                        <div className="space-y-4 max-h-[600px] overflow-y-auto">
                          {messages.length > 0 ? (
                            messages.map((msg) => (
                              <div
                                key={msg._id}
                                className={`flex ${msg.from === "page" ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`max-w-[80%] rounded-lg p-3 ${
                                    msg.from === "page"
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted"
                                  }`}
                                >
                                  <div className="text-sm">{msg.message}</div>
                                  <div
                                    className={`text-xs mt-1 ${
                                      msg.from === "page"
                                        ? "text-primary-foreground/70"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {formatDate(msg.timestamp)}
                                  </div>
                                  {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="mt-2 space-y-1">
                                      {msg.attachments.map((att, idx) => (
                                        <a
                                          key={idx}
                                          href={att.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs underline"
                                        >
                                          {att.type} attachment
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              No messages in this thread
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          Select a conversation to view messages
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="webhook" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Webhook Configuration</CardTitle>
                <CardDescription>
                  Configure real-time DM tracking via Instagram webhooks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedPageId ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Please select a page first
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Webhook URL</Label>
                      <Input
                        value={`${typeof window !== "undefined" ? window.location.origin : ""}/api/webhook/instagram`}
                        readOnly
                        className="bg-muted"
                      />
                      <p className="text-sm text-muted-foreground">
                        Use this URL in Facebook Developer Console
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Verify Token</Label>
                      <Input
                        value={process.env.NEXT_PUBLIC_INSTAGRAM_WEBHOOK_VERIFY_TOKEN || "Set INSTAGRAM_WEBHOOK_VERIFY_TOKEN"}
                        readOnly
                        className="bg-muted"
                      />
                      <p className="text-sm text-muted-foreground">
                        Set INSTAGRAM_WEBHOOK_VERIFY_TOKEN in your environment
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Setup Instructions</Label>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                        <li>Go to Facebook Developer Console → Your App → Webhooks</li>
                        <li>Add callback URL: Copy the Webhook URL above</li>
                        <li>Set verify token: Copy the Verify Token above</li>
                        <li>Subscribe to: messages, messaging_postbacks</li>
                        <li>Click "Setup Webhook" below to enable</li>
                      </ol>
                    </div>

                    <Button onClick={handleSetupWebhook}>
                      <Settings className="h-4 w-4 mr-2" />
                      Setup Webhook
                    </Button>

                    {pages && pages.find((p) => p.pageId === selectedPageId)?.webhookVerified && (
                      <div className="flex items-center space-x-2 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>Webhook is configured and verified</span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SideBar>
  );
}

