import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { PremiumModal } from "@/components/PremiumModal";
import { BatchJob } from "@/hooks/use-bulk-process";
import { 
  Layers, 
  Link2, 
  ListVideo, 
  Play, 
  Lock,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";

const MAX_URLS_PER_BATCH = 10;

interface BulkUploadInputProps {
  onStartBulk: (urls?: string[], playlistUrl?: string) => void;
  isPending: boolean;
  activeJob: BatchJob | null;
  onCancel: () => void;
  isCancelling: boolean;
}

export function BulkUploadInput({ 
  onStartBulk, 
  isPending, 
  activeJob, 
  onCancel, 
  isCancelling 
}: BulkUploadInputProps) {
  const { isAgency, openCheckout } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [inputMode, setInputMode] = useState<"urls" | "playlist">("urls");
  const [urlsInput, setUrlsInput] = useState("");
  const [playlistUrl, setPlaylistUrl] = useState("");

  // Count valid URLs
  const validUrls = urlsInput
    .split("\n")
    .filter((url) => {
      const trimmed = url.trim();
      return trimmed && (trimmed.includes("youtube") || trimmed.includes("youtu.be"));
    });
  const validUrlCount = validUrls.length;
  const isOverLimit = validUrlCount > MAX_URLS_PER_BATCH;

  const handleStartBulk = () => {
    if (!isAgency) {
      setShowUpgradeModal(true);
      return;
    }

    if (isOverLimit) return;

    const urls = inputMode === "urls" 
      ? urlsInput.split("\n").filter((url) => url.trim())
      : undefined;

    onStartBulk(urls, inputMode === "playlist" ? playlistUrl : undefined);
    setUrlsInput("");
    setPlaylistUrl("");
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
    };

    return (
      <Badge variant={variants[status] || "outline"} className="capitalize text-[10px]">
        {status}
      </Badge>
    );
  };

  return (
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

      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Layers className="h-5 w-5 text-primary" />
          Bulk Upload
        </CardTitle>
        <CardDescription>
          Process multiple YouTube videos at once
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Show active job progress if there is one */}
        {activeJob ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="font-medium text-sm">Processing...</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={isCancelling}
              >
                Cancel
              </Button>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>
                  {activeJob.completed_videos + activeJob.failed_videos} / {activeJob.total_videos}
                </span>
              </div>
              <Progress
                value={
                  ((activeJob.completed_videos + activeJob.failed_videos) / activeJob.total_videos) * 100
                }
              />
            </div>

            {/* Compact video list */}
            <div className="space-y-1 max-h-32 overflow-y-auto pr-2">
              <TooltipProvider>
                {activeJob.video_urls.slice(0, 5).map((video, idx) => (
                  <div
                    key={video.videoId}
                    className={`flex items-center gap-2 p-2 rounded text-xs ${
                      video.status === "processing" 
                        ? "bg-primary/10" 
                        : video.status === "completed"
                        ? "bg-muted/50"
                        : video.status === "failed"
                        ? "bg-destructive/10"
                        : "bg-muted/30"
                    }`}
                  >
                    {getStatusIcon(video.status)}
                    <span className="flex-1 truncate">
                      {video.title || `Video ${idx + 1}`}
                    </span>
                    {getStatusBadge(video.status)}
                    {video.error && (
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertCircle className="h-3 w-3 text-destructive" />
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                          <p className="text-xs">{video.error}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                ))}
                {activeJob.video_urls.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center py-1">
                    +{activeJob.video_urls.length - 5} more videos
                  </p>
                )}
              </TooltipProvider>
            </div>
          </div>
        ) : (
          <>
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "urls" | "playlist")}>
              <TabsList className="grid grid-cols-2 w-full h-9">
                <TabsTrigger value="urls" className="flex items-center gap-1.5 text-xs">
                  <Link2 className="h-3.5 w-3.5" />
                  Multiple URLs
                </TabsTrigger>
                <TabsTrigger value="playlist" className="flex items-center gap-1.5 text-xs">
                  <ListVideo className="h-3.5 w-3.5" />
                  Playlist
                </TabsTrigger>
              </TabsList>

              <TabsContent value="urls" className="mt-3 space-y-2">
                <Textarea
                  placeholder="Paste YouTube URLs here (one per line)&#10;https://youtube.com/watch?v=...&#10;https://youtu.be/..."
                  value={urlsInput}
                  onChange={(e) => setUrlsInput(e.target.value)}
                  rows={4}
                  className={`font-mono text-xs resize-none ${isOverLimit ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                <div className="flex items-center justify-between text-xs">
                  <div>
                    {validUrlCount > 0 ? (
                      <span className={isOverLimit ? "text-destructive font-medium" : "text-primary font-medium"}>
                        {validUrlCount} URL(s) detected
                      </span>
                    ) : (
                      <span className="text-muted-foreground">One URL per line</span>
                    )}
                  </div>
                  <div className={`flex items-center gap-1 ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
                    {isOverLimit && <AlertCircle className="h-3 w-3" />}
                    <span>Max {MAX_URLS_PER_BATCH}</span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="playlist" className="mt-3 space-y-2">
                <Input
                  placeholder="https://youtube.com/playlist?list=..."
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  First {MAX_URLS_PER_BATCH} videos will be processed
                </p>
              </TabsContent>
            </Tabs>

            <Button
              className="w-full"
              size="sm"
              disabled={
                isPending ||
                isOverLimit ||
                (inputMode === "urls" && validUrlCount === 0) ||
                (inputMode === "playlist" && !playlistUrl.trim())
              }
              onClick={handleStartBulk}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Processing ({validUrlCount > 0 ? Math.min(validUrlCount, MAX_URLS_PER_BATCH) : 0})
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>

      <PremiumModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        feature="bulk-processing"
      />
    </Card>
  );
}
