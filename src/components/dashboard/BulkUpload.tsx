import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBulkProcess, BatchJob } from "@/hooks/use-bulk-process";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { PremiumModal } from "@/components/PremiumModal";
import { 
  Layers, 
  Link2, 
  ListVideo, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2,
  Lock,
  Sparkles
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface BulkUploadProps {
  tone?: string;
  audience?: string;
  brandVoice?: any;
  targetLanguage?: string;
}

export function BulkUpload({ tone, audience, brandVoice, targetLanguage }: BulkUploadProps) {
  const { isAgency, openCheckout } = useSubscription();
  const { batchJobs, activeJob, startBulkProcess, cancelBatchJob, isLoading } = useBulkProcess();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [inputMode, setInputMode] = useState<"urls" | "playlist">("urls");
  const [urlsInput, setUrlsInput] = useState("");
  const [playlistUrl, setPlaylistUrl] = useState("");

  // Count valid URLs
  const validUrlCount = urlsInput
    .split("\n")
    .filter((url) => url.trim() && url.includes("youtube") || url.includes("youtu.be"))
    .length;

  const handleStartBulk = () => {
    if (!isAgency) {
      setShowUpgradeModal(true);
      return;
    }

    const urls = inputMode === "urls" 
      ? urlsInput.split("\n").filter((url) => url.trim())
      : undefined;

    startBulkProcess.mutate(
      {
        urls,
        playlistUrl: inputMode === "playlist" ? playlistUrl : undefined,
        tone,
        audience,
        brandVoice,
        translateTo: targetLanguage !== "english" ? targetLanguage : undefined,
      },
      {
        onSuccess: () => {
          setUrlsInput("");
          setPlaylistUrl("");
        },
      }
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      processing: "secondary",
      pending: "outline",
      failed: "destructive",
      cancelled: "outline",
    };

    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Bulk Upload Card */}
      <Card className="border-border bg-card relative overflow-hidden">
        {!isAgency && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="text-center p-6">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Agency Feature</h3>
              <p className="text-muted-foreground mb-4 max-w-sm">
                Bulk processing is available exclusively for Agency subscribers. 
                Process up to 10 videos at once!
              </p>
              <Button onClick={() => setShowUpgradeModal(true)}>
                <Sparkles className="h-4 w-4 mr-2" />
                Upgrade to Agency
              </Button>
            </div>
          </div>
        )}

        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Bulk Upload
          </CardTitle>
          <CardDescription>
            Process multiple YouTube videos at once. Paste URLs or a playlist link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "urls" | "playlist")}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="urls" className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Multiple URLs
              </TabsTrigger>
              <TabsTrigger value="playlist" className="flex items-center gap-2">
                <ListVideo className="h-4 w-4" />
                Playlist
              </TabsTrigger>
            </TabsList>

            <TabsContent value="urls" className="mt-4 space-y-3">
              <Textarea
                placeholder="Paste YouTube URLs here (one per line)&#10;https://youtube.com/watch?v=...&#10;https://youtu.be/..."
                value={urlsInput}
                onChange={(e) => setUrlsInput(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                {validUrlCount > 0 ? (
                  <span className="text-primary font-medium">{validUrlCount} valid URL(s) detected</span>
                ) : (
                  "Enter YouTube URLs, one per line"
                )}
                {validUrlCount > 10 && (
                  <span className="text-amber-500 ml-2">(max 10 per batch)</span>
                )}
              </p>
            </TabsContent>

            <TabsContent value="playlist" className="mt-4 space-y-3">
              <Input
                placeholder="https://youtube.com/playlist?list=..."
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Paste a YouTube playlist URL to process all videos
              </p>
            </TabsContent>
          </Tabs>

          <Button
            className="w-full"
            disabled={
              startBulkProcess.isPending ||
              !!activeJob ||
              (inputMode === "urls" && validUrlCount === 0) ||
              (inputMode === "playlist" && !playlistUrl.trim())
            }
            onClick={handleStartBulk}
          >
            {startBulkProcess.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : activeJob ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing in progress...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Bulk Processing
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Active Job Progress */}
      {activeJob && (
        <Card className="border-primary/50 bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Processing Batch
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => cancelBatchJob.mutate(activeJob.id)}
                disabled={cancelBatchJob.isPending}
              >
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="font-medium">
                  {activeJob.completed_videos + activeJob.failed_videos} / {activeJob.total_videos}
                </span>
              </div>
              <Progress
                value={
                  ((activeJob.completed_videos + activeJob.failed_videos) / activeJob.total_videos) * 100
                }
              />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-primary">{activeJob.completed_videos}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-destructive">{activeJob.failed_videos}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">
                  {activeJob.total_videos - activeJob.completed_videos - activeJob.failed_videos}
                </p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>

            {/* Video list */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {activeJob.video_urls.map((video, idx) => (
                <div
                  key={video.videoId}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                >
                  {getStatusIcon(video.status)}
                  <span className="text-sm flex-1 truncate">
                    {video.title || video.videoId}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Batch Jobs */}
      {batchJobs && batchJobs.length > 0 && !activeJob && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Recent Batches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {batchJobs.slice(0, 5).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <p className="font-medium">
                        {job.total_videos} video{job.total_videos !== 1 ? "s" : ""}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {job.completed_videos > 0 && (
                      <span className="text-sm text-primary">
                        {job.completed_videos} ✓
                      </span>
                    )}
                    {job.failed_videos > 0 && (
                      <span className="text-sm text-destructive">
                        {job.failed_videos} ✗
                      </span>
                    )}
                    {getStatusBadge(job.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <PremiumModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        feature="bulk-processing"
      />
    </div>
  );
}
