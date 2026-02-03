import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { PremiumModal } from "@/components/PremiumModal";
import { BatchJob } from "@/hooks/use-bulk-process";
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
  MessageSquare,
  Globe,
  Settings2,
  ChevronDown
} from "lucide-react";

const MAX_URLS_PER_BATCH = 10;

const tones = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "humorous", label: "Humorous" },
  { value: "inspirational", label: "Inspirational" },
];

const languages = [
  { value: "english", label: "English" },
  { value: "spanish", label: "Spanish" },
  { value: "french", label: "French" },
  { value: "german", label: "German" },
  { value: "portuguese", label: "Portuguese" },
  { value: "japanese", label: "Japanese" },
  { value: "korean", label: "Korean" },
  { value: "chinese", label: "Chinese" },
];

interface FullWidthInputProps {
  onStartBulk: (urls?: string[], playlistUrl?: string) => void;
  isPending: boolean;
  activeJob: BatchJob | null;
  onCancel: () => void;
  isCancelling: boolean;
  tone: string;
  setTone: (tone: string) => void;
  targetLanguage: string;
  setTargetLanguage: (language: string) => void;
}

export function FullWidthInput({ 
  onStartBulk, 
  isPending, 
  activeJob, 
  onCancel, 
  isCancelling,
  tone,
  setTone,
  targetLanguage,
  setTargetLanguage
}: FullWidthInputProps) {
  const { isAgency } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [inputMode, setInputMode] = useState<"urls" | "playlist">("urls");
  const [urlsInput, setUrlsInput] = useState("");
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [configOpen, setConfigOpen] = useState(false);

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
    <div className="w-full space-y-3 relative">
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
                {/* Generate button below URL input */}
                <Button
                  disabled={isPending || isOverLimit || validUrlCount === 0}
                  onClick={handleStartBulk}
                  className="w-full gap-2"
                  size="lg"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Generate Content
                  {validUrlCount > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {Math.min(validUrlCount, MAX_URLS_PER_BATCH)} videos
                    </Badge>
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="playlist" className="mt-4 space-y-3">
                <Input
                  placeholder="https://youtube.com/playlist?list=..."
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  className="text-sm h-11"
                />
                <p className="text-sm text-muted-foreground">
                  First {MAX_URLS_PER_BATCH} videos from the playlist will be processed
                </p>
                {/* Generate button below playlist input */}
                <Button
                  disabled={isPending || !playlistUrl.trim()}
                  onClick={handleStartBulk}
                  className="w-full gap-2"
                  size="lg"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Generate Content from Playlist
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Collapsible Configuration */}
      <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between h-11 px-4 bg-muted/50 hover:bg-muted border border-border rounded-lg"
          >
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Configuration</span>
              <Badge variant="secondary" className="text-[10px]">
                {tone} • {targetLanguage}
              </Badge>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${configOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Tone */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  Tone
                </label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    {tones.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Language */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  Output Language
                </label>
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    {languages.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <PremiumModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        feature="bulk-processing"
      />
    </div>
  );
}
