import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Pencil, ExternalLink, Inbox, Sparkles, Send, AlertCircle, Settings, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Decode HTML entities like &#39; -> ' so AI-returned text renders cleanly.
function decodeHtml(input: unknown): string {
  const str = input == null ? "" : String(input);
  if (!str || str.indexOf("&") === -1) return str;
  if (typeof window !== "undefined" && typeof window.DOMParser !== "undefined") {
    try {
      const doc = new DOMParser().parseFromString(str, "text/html");
      return doc.documentElement.textContent || str;
    } catch {
      /* fall through */
    }
  }
  return str
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function CopyIconButton({ text, label }: { text: string; label: string }) {
  const { toast } = useToast();
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied!", description: `${label} copied to clipboard.` });
    } catch {
      toast({ variant: "destructive", title: "Copy failed", description: "Please copy manually." });
    }
  };
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={handleCopy}
      aria-label={`Copy ${label}`}
      className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/60"
    >
      <Copy className="h-3.5 w-3.5" />
    </Button>
  );
}

type Campaign = {
  id: string;
  user_id: string;
  status: string;
  youtube_url: string | null;
  video_title: string | null;
  insights: string[] | null;
  x_thread: string[] | null;
  linkedin_post: string | null;
  facebook_post: string | null;
  published_to: any[] | null;
  created_at: string;
};

export default function AgentQueue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editThread, setEditThread] = useState<string[]>([]);
  const [editLinkedin, setEditLinkedin] = useState("");
  const [publishingCampaignId, setPublishingCampaignId] = useState<string | null>(null);
  const [publishingPlatform, setPublishingPlatform] = useState<string | null>(null);
  const [publishingThreadInfo, setPublishingThreadInfo] = useState<{ total: number } | null>(null);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["agent-campaigns", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_campaigns")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Campaign[];
    },
    enabled: !!user,
  });

  // Check social connections
  const { data: agentSettings } = useQuery({
    queryKey: ["agent-settings-connections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_settings")
        .select("x_refresh_token, x_username, linkedin_access_token, linkedin_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const xConnected = !!(agentSettings as any)?.x_refresh_token;
  const linkedinConnected = !!(agentSettings as any)?.linkedin_access_token;

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, x_thread, linkedin_post }: { id: string; status: string; x_thread?: string[]; linkedin_post?: string }) => {
      const update: Record<string, unknown> = { status };
      if (x_thread) update.x_thread = x_thread;
      if (linkedin_post !== undefined) update.linkedin_post = linkedin_post;

      const { error } = await supabase
        .from("agent_campaigns")
        .update(update)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-campaigns"] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ campaignId, platforms, threadCount }: { campaignId: string; platforms: string[]; threadCount: number }) => {
      const results: { platform: string; success: boolean; error?: string; reconnect?: boolean; failedAtIndex?: number; totalTweets?: number }[] = [];

      setPublishingCampaignId(campaignId);

      for (const platform of platforms) {
        setPublishingPlatform(platform);
        if (platform === "x" && threadCount > 1) {
          setPublishingThreadInfo({ total: threadCount });
        } else {
          setPublishingThreadInfo(null);
        }

        const fnName = platform === "x" ? "publish-to-x" : "publish-to-linkedin";
        const { data, error } = await supabase.functions.invoke(fnName, {
          body: { campaign_id: campaignId, user_id: user!.id },
        });

        if (error || data?.error) {
          results.push({
            platform,
            success: false,
            error: data?.error || error?.message || "Unknown error",
            reconnect: data?.reconnect === true,
            failedAtIndex: data?.failed_at_index,
            totalTweets: data?.total_tweets,
          });
        } else {
          results.push({ platform, success: true, totalTweets: data?.total_tweets });
        }
      }

      setPublishingCampaignId(null);
      setPublishingPlatform(null);
      setPublishingThreadInfo(null);

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["agent-campaigns"] });

      const successes = results.filter((r) => r.success);
      const failures = results.filter((r) => !r.success);

      if (successes.length > 0 && failures.length === 0) {
        const threadInfo = successes.find((r) => r.platform === "x" && (r.totalTweets || 0) > 1);
        const desc = threadInfo
          ? `Thread (${threadInfo.totalTweets} tweets) published to X${successes.length > 1 ? " & " + successes.filter(r => r.platform !== "x").map(r => r.platform).join(", ") : ""}.`
          : `Content published to ${successes.map((r) => r.platform).join(" & ")}.`;
        toast({ title: "🚀 Published!", description: desc });
      } else if (successes.length > 0) {
        toast({
          title: "Partially published",
          description: `Published to ${successes.map((r) => r.platform).join(", ")}. Failed: ${failures.map((r) => `${r.platform} (${r.error})`).join(", ")}`,
          variant: "destructive",
        });
      } else {
        const reconnect = failures.some((r) => r.reconnect);
        toast({
          title: "Publishing failed",
          description: reconnect
            ? "Token expired or invalid. Please reconnect in Agent Settings."
            : failures.map((r) => `${r.platform}: ${r.error}`).join("; "),
          variant: "destructive",
        });
      }
    },
    onError: (err: Error) => {
      setPublishingCampaignId(null);
      setPublishingPlatform(null);
      setPublishingThreadInfo(null);
      toast({ variant: "destructive", title: "Publish Error", description: err.message });
    },
  });

  const handleApproveAndPublish = (campaign: Campaign) => {
    const platformsToPublish: string[] = [];
    if (xConnected) platformsToPublish.push("x");
    if (linkedinConnected) platformsToPublish.push("linkedin");

    const threadCount = Array.isArray(campaign.x_thread) ? campaign.x_thread.length : 1;

    if (platformsToPublish.length === 0) {
      updateMutation.mutate(
        { id: campaign.id, status: "approved" },
        {
          onSuccess: () => {
            toast({
              title: "Campaign approved",
              description: "Connect your social accounts in Agent Settings to enable direct publishing.",
            });
          },
        }
      );
      return;
    }

    // Approve and publish
    updateMutation.mutate(
      { id: campaign.id, status: "publishing" },
      {
        onSuccess: () => {
          publishMutation.mutate({ campaignId: campaign.id, platforms: platformsToPublish, threadCount });
        },
      }
    );
  };

  const handleReject = (id: string) => {
    updateMutation.mutate(
      { id, status: "rejected" },
      {
        onSuccess: () => {
          toast({ title: "Campaign rejected", description: "This campaign has been archived." });
        },
      }
    );
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingId(campaign.id);
    setEditThread(Array.isArray(campaign.x_thread) ? campaign.x_thread : []);
    setEditLinkedin(campaign.linkedin_post || "");
  };

  const handleSaveEdit = (id: string) => {
    updateMutation.mutate(
      { id, status: "pending", x_thread: editThread, linkedin_post: editLinkedin },
      {
        onSuccess: () => {
          setEditingId(null);
          toast({ title: "Edits saved!" });
        },
      }
    );
  };

  const pendingCampaigns = campaigns?.filter((c) => c.status === "pending") || [];
  const otherCampaigns = campaigns?.filter((c) => c.status !== "pending") || [];

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3">
            <Inbox className="h-7 w-7 md:h-8 md:w-8 text-primary" />
            Agent Queue
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Review, edit, and approve AI-generated campaigns before publishing.
          </p>
        </div>

        {/* Connection status banner */}
        {!xConnected && !linkedinConnected && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span>No social accounts connected. Approving will save without publishing.</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate("/agent/settings")}>
                <Settings className="h-3.5 w-3.5 mr-1" /> Connect
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pending count */}
        {pendingCampaigns.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge className="bg-accent/20 text-accent-foreground border-accent/30">
              {pendingCampaigns.length} pending
            </Badge>
            <span className="text-sm text-muted-foreground">campaigns awaiting your review</span>
          </div>
        )}

        {/* Empty state */}
        {pendingCampaigns.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No pending campaigns</h3>
              <p className="text-muted-foreground text-sm max-w-md">
                Your agent will automatically discover trending videos and generate drafts. Check your Agent Settings to make sure the agent is active.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Pending campaigns */}
        {pendingCampaigns.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            isEditing={editingId === campaign.id}
            editThread={editThread}
            editLinkedin={editLinkedin}
            onEditThread={setEditThread}
            onEditLinkedin={setEditLinkedin}
            onApprove={() => handleApproveAndPublish(campaign)}
            onReject={() => handleReject(campaign.id)}
            onEdit={() => handleEdit(campaign)}
            onSaveEdit={() => handleSaveEdit(campaign.id)}
            onCancelEdit={() => setEditingId(null)}
            isPending={updateMutation.isPending || publishMutation.isPending}
            xConnected={xConnected}
            linkedinConnected={linkedinConnected}
            onReconnect={() => navigate("/agent/settings")}
            isPublishing={publishingCampaignId === campaign.id}
            publishingPlatform={publishingCampaignId === campaign.id ? publishingPlatform : null}
            publishingThreadInfo={publishingCampaignId === campaign.id ? publishingThreadInfo : null}
          />
        ))}

        {/* History */}
        {otherCampaigns.length > 0 && (
          <>
            <h2 className="text-xl font-semibold mt-8 pt-4 border-t border-border">History</h2>
            {otherCampaigns.map((campaign) => (
              <HistoryCard key={campaign.id} campaign={campaign} onReconnect={() => navigate("/agent/settings")} />
            ))}
          </>
        )}
      </div>
    </AppLayout>
  );
}

function getPublishStatusBadges(publishedTo: any[] | null) {
  if (!publishedTo || !Array.isArray(publishedTo) || publishedTo.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {publishedTo.map((entry: any, i: number) => {
        if (entry.status === "success") {
          return (
            <Badge key={i} className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              ✅ {entry.platform}
            </Badge>
          );
        }
        return (
          <Badge key={i} variant="destructive" className="text-xs">
            🔴 {entry.platform}
          </Badge>
        );
      })}
    </div>
  );
}

function HistoryCard({ campaign, onReconnect }: { campaign: Campaign; onReconnect: () => void }) {
  const publishedTo = Array.isArray((campaign as any).published_to) ? (campaign as any).published_to : [];
  const hasErrors = publishedTo.some((e: any) => e.status !== "success");

  return (
    <Card className="opacity-60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{campaign.video_title || "Untitled"}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              {getPublishStatusBadges(publishedTo)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={campaign.status === "published" ? "default" : "secondary"}>
              {campaign.status}
            </Badge>
            {hasErrors && (
              <Button size="sm" variant="ghost" className="text-destructive text-xs h-7" onClick={onReconnect}>
                Reconnect
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(campaign.created_at).toLocaleDateString()}
        </p>
      </CardHeader>
    </Card>
  );
}

function CampaignCard({
  campaign,
  isEditing,
  editThread,
  editLinkedin,
  onEditThread,
  onEditLinkedin,
  onApprove,
  onReject,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  isPending,
  xConnected,
  linkedinConnected,
  onReconnect,
  isPublishing,
  publishingPlatform,
  publishingThreadInfo,
}: {
  campaign: Campaign;
  isEditing: boolean;
  editThread: string[];
  editLinkedin: string;
  onEditThread: (t: string[]) => void;
  onEditLinkedin: (s: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  isPending: boolean;
  xConnected: boolean;
  linkedinConnected: boolean;
  onReconnect: () => void;
  isPublishing: boolean;
  publishingPlatform: string | null;
  publishingThreadInfo: { total: number } | null;
}) {
  const thread = isEditing ? editThread : (Array.isArray(campaign.x_thread) ? campaign.x_thread : []);
  const linkedin = isEditing ? editLinkedin : (campaign.linkedin_post || "");
  const insights = Array.isArray(campaign.insights) ? campaign.insights : [];
  const publishedTo = Array.isArray((campaign as any).published_to) ? (campaign as any).published_to : [];
  const hasPublishErrors = publishedTo.some((e: any) => e.status !== "success");

  const getPublishButtonLabel = () => {
    if (isPublishing) {
      if (publishingPlatform === "x" && publishingThreadInfo) {
        return `Publishing thread (${publishingThreadInfo.total} tweets) to 𝕏…`;
      }
      if (publishingPlatform === "x") return "Publishing to 𝕏…";
      if (publishingPlatform === "linkedin") return "Publishing to LinkedIn…";
      return "Publishing…";
    }
    return xConnected || linkedinConnected ? "Approve & Publish" : "Approve";
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base sm:text-lg break-words leading-snug">
              {decodeHtml(campaign.video_title) || "Untitled Video"}
            </CardTitle>
            {campaign.youtube_url && (
              <a
                href={campaign.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1 break-all"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                View source video
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {hasPublishErrors && (
              <Badge variant="destructive" className="text-xs">
                🔴 Connection Error
              </Badge>
            )}
            {getPublishStatusBadges(publishedTo)}
            <Badge className="bg-accent/20 text-accent-foreground border-accent/30">Pending Review</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 overflow-hidden">
        {/* Insights */}
        {insights.length > 0 && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 sm:p-4">
            <h4 className="text-xs sm:text-sm font-semibold mb-2 text-primary uppercase tracking-wide">Key Insights</h4>
            <ul className="space-y-1.5">
              {insights.map((insight, i) => (
                <li key={i} className="text-xs sm:text-sm flex items-start gap-2 break-words">
                  <span className="text-primary font-bold mt-0.5 shrink-0">{i + 1}.</span>
                  <span className="min-w-0 break-words">{decodeHtml(insight)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Side-by-side on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* X Thread */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <span className="font-mono">𝕏</span> Thread
                {!xConnected && <Badge variant="outline" className="text-xs text-muted-foreground">Not connected</Badge>}
              </h4>
              {!isEditing && thread.length > 0 && (
                <CopyIconButton
                  text={thread.map((t, i) => `${i + 1}/${thread.length} ${String(t)}`).join("\n\n")}
                  label="X thread"
                />
              )}
            </div>
            {isEditing ? (
              <div className="space-y-2">
                {editThread.map((tweet, i) => (
                  <Textarea
                    key={i}
                    value={tweet}
                    onChange={(e) => {
                      const newThread = [...editThread];
                      newThread[i] = e.target.value;
                      onEditThread(newThread);
                    }}
                    className="text-sm min-h-[60px]"
                    maxLength={280}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {thread.map((tweet, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/50 border border-border text-sm">
                    <span className="text-muted-foreground text-xs">{i + 1}/{thread.length}</span>
                    <p className="mt-1">{String(tweet)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LinkedIn Post */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <span className="font-mono text-blue-400">in</span> LinkedIn Post
                {!linkedinConnected && <Badge variant="outline" className="text-xs text-muted-foreground">Not connected</Badge>}
              </h4>
              {!isEditing && linkedin && (
                <CopyIconButton text={linkedin} label="LinkedIn post" />
              )}
            </div>
            {isEditing ? (
              <Textarea
                value={editLinkedin}
                onChange={(e) => onEditLinkedin(e.target.value)}
                className="text-sm min-h-[200px]"
              />
            ) : (
              <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm whitespace-pre-wrap">
                {linkedin}
              </div>
            )}
          </div>

          {/* Facebook Post */}
          {(campaign as any).facebook_post && (
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <span className="font-mono text-[#1877F2]">f</span> Facebook Post
                  <Badge variant="outline" className="text-xs text-muted-foreground">Coming soon: direct publishing</Badge>
                </h4>
                <CopyIconButton text={(campaign as any).facebook_post} label="Facebook post" />
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm whitespace-pre-wrap">
                {(campaign as any).facebook_post}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          {isEditing ? (
            <>
              <Button size="sm" onClick={onSaveEdit} disabled={isPending} className="flex-1 sm:flex-none">
                Save Edits
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancelEdit} className="flex-1 sm:flex-none">
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={onApprove} disabled={isPending || isPublishing} className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-primary-foreground">
                {isPending || isPublishing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                {getPublishButtonLabel()}
              </Button>
              <Button size="sm" variant="outline" onClick={onEdit} className="flex-1 sm:flex-none">
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={onReject} disabled={isPending} className="flex-1 sm:flex-none text-destructive hover:text-destructive">
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
              {hasPublishErrors && (
                <Button size="sm" variant="outline" onClick={onReconnect} className="text-destructive border-destructive/30">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Reconnect
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
