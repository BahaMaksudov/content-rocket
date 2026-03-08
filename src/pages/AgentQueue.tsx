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
import { Loader2, CheckCircle, XCircle, Pencil, ExternalLink, Inbox, Sparkles } from "lucide-react";

type Campaign = {
  id: string;
  user_id: string;
  status: string;
  youtube_url: string | null;
  video_title: string | null;
  insights: string[] | null;
  x_thread: string[] | null;
  linkedin_post: string | null;
  created_at: string;
};

export default function AgentQueue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editThread, setEditThread] = useState<string[]>([]);
  const [editLinkedin, setEditLinkedin] = useState("");

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

  const handleApprove = (id: string) => {
    // For now, mark as published (actual API publishing will be added later)
    updateMutation.mutate(
      { id, status: "published" },
      {
        onSuccess: () => {
          toast({ title: "Campaign approved!", description: "Content has been marked as published. Social API integration coming soon." });
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
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Inbox className="h-8 w-8 text-primary" />
            Agent Queue
          </h1>
          <p className="text-muted-foreground">
            Review, edit, and approve AI-generated campaigns before publishing.
          </p>
        </div>

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
            onApprove={() => handleApprove(campaign.id)}
            onReject={() => handleReject(campaign.id)}
            onEdit={() => handleEdit(campaign)}
            onSaveEdit={() => handleSaveEdit(campaign.id)}
            onCancelEdit={() => setEditingId(null)}
            isPending={updateMutation.isPending}
          />
        ))}

        {/* History */}
        {otherCampaigns.length > 0 && (
          <>
            <h2 className="text-xl font-semibold mt-8 pt-4 border-t border-border">History</h2>
            {otherCampaigns.map((campaign) => (
              <Card key={campaign.id} className="opacity-60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{campaign.video_title || "Untitled"}</CardTitle>
                    <Badge variant={campaign.status === "published" ? "default" : "secondary"}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </p>
                </CardHeader>
              </Card>
            ))}
          </>
        )}
      </div>
    </AppLayout>
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
}) {
  const thread = isEditing ? editThread : (Array.isArray(campaign.x_thread) ? campaign.x_thread : []);
  const linkedin = isEditing ? editLinkedin : (campaign.linkedin_post || "");
  const insights = Array.isArray(campaign.insights) ? campaign.insights : [];

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{campaign.video_title || "Untitled Video"}</CardTitle>
            {campaign.youtube_url && (
              <a
                href={campaign.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
              >
                <ExternalLink className="h-3 w-3" />
                View source video
              </a>
            )}
          </div>
          <Badge className="bg-accent/20 text-accent-foreground border-accent/30">Pending Review</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Insights */}
        {insights.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Key Insights</h4>
            <ul className="space-y-1">
              {insights.map((insight, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                  <span>{String(insight)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Side-by-side preview */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* X Thread */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <span className="font-mono">𝕏</span> Thread
            </h4>
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
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <span className="font-mono text-blue-400">in</span> LinkedIn Post
            </h4>
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
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          {isEditing ? (
            <>
              <Button size="sm" onClick={onSaveEdit} disabled={isPending}>
                Save Edits
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancelEdit}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={onApprove} disabled={isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve & Publish
              </Button>
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={onReject} disabled={isPending} className="text-destructive hover:text-destructive">
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
