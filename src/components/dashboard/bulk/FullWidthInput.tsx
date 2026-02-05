import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { PremiumModal } from "@/components/PremiumModal";
import { BatchJob } from "@/hooks/use-bulk-process";
import { HorizontalGenerationSettings } from "./HorizontalGenerationSettings";
import { 
  Link2, 
  ListVideo, 
  Play, 
  Lock,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Info
} from "lucide-react";

const MAX_URLS_PER_BATCH = 10;

interface BrandVoice {
  id: string;
  name: string;
  description: string | null;
}

interface FullWidthInputProps {
  onStartBulk: (urls?: string[], playlistUrl?: string) => void;
  isPending: boolean;
  activeJob: BatchJob | null;
  onCancel: () => void;
  isCancelling: boolean;
  tone: string;
  setTone: (tone: string) => void;
  audience: string;
  setAudience: (audience: string) => void;
  targetLanguage: string;
  setTargetLanguage: (language: string) => void;
  brandVoices: BrandVoice[];
  selectedBrandVoice: string | null;
  setSelectedBrandVoice: (id: string | null) => void;
}

export function FullWidthInput({ 
  onStartBulk, 
  isPending, 
  activeJob, 
  onCancel, 
  isCancelling,
  tone,
  setTone,
  audience,
  setAudience,
  targetLanguage,
  setTargetLanguage,
  brandVoices,
  selectedBrandVoice,
  setSelectedBrandVoice
}: FullWidthInputProps) {
  const { isAgency } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [inputMode, setInputMode] = useState<"urls" | "playlist">("urls");
  const [urlsInput, setUrlsInput] = useState("");
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [fairUseConfirmed, setFairUseConfirmed] = useState(false);

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
    if (isOverLimit || !fairUseConfirmed) return;

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
        return <CheckCircle2 className="h-3 w-3 text-primary" />;
      case "failed":
        return <XCircle className="h-3 w-3 text-destructive" />;
      case "processing":
        return <Loader2 className="h-3 w-3 animate-spin text-primary" />;
      default:
        return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <div className="w-full space-y-4 relative">
      {/* Agency Lock Overlay */}
      {!isAgency && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
          <div className="text-center p-6">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Agency Feature</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Process up to 10 videos at once
            </p>
            <Button size="sm" onClick={() => setShowUpgradeModal(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Upgrade to Agency
            </Button>
          </div>
        </div>
      )}

      {/* Main Input Card - Full Width */}
      <div className="w-full bg-card border border-border rounded-xl p-5">
        {activeJob ? (
          /* Active Job Progress */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div>
                  <p className="font-medium">Processing Batch</p>
                  <p className="text-sm text-muted-foreground">
                    {activeJob.completed_videos + activeJob.failed_videos} of {activeJob.total_videos} videos completed
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={onCancel} disabled={isCancelling}>
                Cancel
              </Button>
            </div>
            
            <Progress
              value={((activeJob.completed_videos + activeJob.failed_videos) / activeJob.total_videos) * 100}
              className="h-2"
            />

            {/* Compact video status tags */}
            <div className="flex flex-wrap gap-2">
              <TooltipProvider>
                {activeJob.video_urls.map((video, idx) => (
                  <Tooltip key={video.videoId}>
                    <TooltipTrigger asChild>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        video.status === "processing" ? "bg-primary/10 text-primary border border-primary/20" :
                        video.status === "completed" ? "bg-muted text-foreground" :
                        video.status === "failed" ? "bg-destructive/10 text-destructive border border-destructive/20" :
                        "bg-muted/50 text-muted-foreground"
                      }`}>
                        {getStatusIcon(video.status)}
                        <span className="max-w-[120px] truncate">{video.title || `Video ${idx + 1}`}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{video.title || video.videoId}</p>
                      {video.error && <p className="text-xs text-destructive mt-1">{video.error}</p>}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>
          </div>
        ) : (
          /* URL Input */
          <div className="space-y-4">
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "urls" | "playlist")}>
              <TabsList className="h-10">
                <TabsTrigger value="urls" className="gap-2 px-4">
                  <Link2 className="h-4 w-4" />
                  Multiple URLs
                </TabsTrigger>
                <TabsTrigger value="playlist" className="gap-2 px-4">
                  <ListVideo className="h-4 w-4" />
                  Playlist
                </TabsTrigger>
              </TabsList>

              <TabsContent value="urls" className="mt-4 space-y-3">
                {/* Respect Creators Note */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border text-muted-foreground">
                  <span className="text-base leading-none">⚠️</span>
                  <p className="text-sm leading-relaxed">
                    <strong>Note:</strong> Please ensure you have permission to use this content or are creating original commentary. We support a healthy ecosystem of creators.
                  </p>
                </div>
                
                <Textarea
                  placeholder="Paste YouTube URLs (one per line)&#10;https://youtube.com/watch?v=...&#10;https://youtu.be/..."
                  value={urlsInput}
                  onChange={(e) => setUrlsInput(e.target.value)}
                  rows={4}
                  className={`font-mono text-sm resize-none ${isOverLimit ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                <div className="flex items-center justify-between text-sm">
                  <span className={validUrlCount > 0 ? (isOverLimit ? "text-destructive font-medium" : "text-primary font-medium") : "text-muted-foreground"}>
                    {validUrlCount > 0 ? `${validUrlCount} URLs detected` : "Paste YouTube URLs above"}
                  </span>
                  <span className={`flex items-center gap-1 ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
                    {isOverLimit && <AlertCircle className="h-4 w-4" />}
                    Max {MAX_URLS_PER_BATCH} per batch
                  </span>
                </div>
                
                {/* Responsible Creation Checkbox */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                  <Checkbox
                    id="bulk-fair-use-confirmation"
                    checked={fairUseConfirmed}
                    onCheckedChange={(checked) => setFairUseConfirmed(checked === true)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Label 
                        htmlFor="bulk-fair-use-confirmation" 
                        className="text-sm font-medium cursor-pointer leading-tight"
                      >
                        I confirm I have the right to use this content or am transforming it for Fair Use.
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-sm">
                              Fair Use generally allows summarizing others' work if you add your own unique value or commentary.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
                
                {/* Generate button below URL input */}
                <Button
                  disabled={isPending || isOverLimit || validUrlCount === 0 || !fairUseConfirmed}
                  onClick={handleStartBulk}
                  className="gap-2"
                  size="sm"
                >
                  {isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                  Generate
                  {validUrlCount > 0 && (
                    <Badge variant="secondary" className="ml-1 text-[10px]">
                      {Math.min(validUrlCount, MAX_URLS_PER_BATCH)}
                    </Badge>
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="playlist" className="mt-4 space-y-3">
                {/* Respect Creators Note */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border text-muted-foreground">
                  <span className="text-base leading-none">⚠️</span>
                  <p className="text-sm leading-relaxed">
                    <strong>Note:</strong> Please ensure you have permission to use this content or are creating original commentary. We support a healthy ecosystem of creators.
                  </p>
                </div>
                
                <Input
                  placeholder="https://youtube.com/playlist?list=..."
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  className="text-sm h-11"
                />
                <p className="text-sm text-muted-foreground">
                  First {MAX_URLS_PER_BATCH} videos from the playlist will be processed
                </p>
                
                {/* Responsible Creation Checkbox */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                  <Checkbox
                    id="playlist-fair-use-confirmation"
                    checked={fairUseConfirmed}
                    onCheckedChange={(checked) => setFairUseConfirmed(checked === true)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Label 
                        htmlFor="playlist-fair-use-confirmation" 
                        className="text-sm font-medium cursor-pointer leading-tight"
                      >
                        I confirm I have the right to use this content or am transforming it for Fair Use.
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-sm">
                              Fair Use generally allows summarizing others' work if you add your own unique value or commentary.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
                
                {/* Generate button below playlist input */}
                <Button
                  disabled={isPending || !playlistUrl.trim() || !fairUseConfirmed}
                  onClick={handleStartBulk}
                  className="gap-2"
                  size="sm"
                >
                  {isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                  Generate from Playlist
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Horizontal Generation Settings - Always Visible */}
      <HorizontalGenerationSettings
        brandVoices={brandVoices}
        selectedBrandVoice={selectedBrandVoice}
        setSelectedBrandVoice={setSelectedBrandVoice}
        tone={tone}
        setTone={setTone}
        audience={audience}
        setAudience={setAudience}
        targetLanguage={targetLanguage}
        setTargetLanguage={setTargetLanguage}
      />

      <PremiumModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        feature="bulk-processing"
      />
    </div>
  );
}
