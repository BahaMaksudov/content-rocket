import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Loader2,
  Youtube,
  Link2,
  FileText,
  Check,
  Eye,
  Copy,
  Pencil,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  Info,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFetchTracking } from "@/hooks/use-fetch-tracking";
import { useCredits } from "@/hooks/use-credits";

interface YouTubeInputProps {
  onTranscriptFetched: (transcript: string, method: "auto" | "manual", title?: string) => void;
  transcript: string;
  transcriptMethod: "auto" | "manual" | null;
  youtubeUrl: string;
  setYoutubeUrl: (url: string) => void;
  onFetchCountReset?: (url: string) => void;
}

const YOUTUBE_URL_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/;
const MAX_TRANSCRIPT_LENGTH = 20000;

export function YouTubeInput({
  onTranscriptFetched,
  transcript,
  transcriptMethod,
  youtubeUrl,
  setYoutubeUrl,
}: YouTubeInputProps) {
  const [isFetching, setIsFetching] = useState(false);
  const [manualTranscript, setManualTranscript] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableTranscript, setEditableTranscript] = useState("");
  const [adWarning, setAdWarning] = useState<string | null>(null);
  const [showHighDemandModal, setShowHighDemandModal] = useState(false);
  const manualSectionRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { incrementFetchCount } = useFetchTracking();
  const { useCredit, refreshCredits } = useCredits();

  // Clear manual transcript when URL changes
  useEffect(() => {
    if (youtubeUrl) {
      setManualTranscript("");
    }
  }, [youtubeUrl]);

  // Scroll to manual section helper
  const scrollToManualSection = () => {
    setShowManual(true);
    setShowHighDemandModal(false);
    setTimeout(() => {
      manualSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const handleCopyTranscript = async () => {
    if (!transcript) return;
    try {
      await navigator.clipboard.writeText(transcript);
      toast({
        title: "Copied!",
        description: "Transcript copied to clipboard.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Could not copy to clipboard.",
      });
    }
  };

  const handleEditClick = () => {
    setEditableTranscript(transcript);
    setIsEditMode(true);
  };

  const handleSaveEdit = () => {
    if (editableTranscript.trim()) {
      onTranscriptFetched(editableTranscript.trim(), "manual");
      setIsEditMode(false);
      setAdWarning(null);
      toast({
        title: "Transcript updated!",
        description: "Your edited transcript has been saved.",
      });
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditableTranscript("");
  };

  const isValidUrl = YOUTUBE_URL_REGEX.test(youtubeUrl);
  const isOverLimit = manualTranscript.length > MAX_TRANSCRIPT_LENGTH;

  const handleFetchTranscript = async () => {
    if (!isValidUrl) {
      toast({
        variant: "destructive",
        title: "Invalid URL",
        description: "Please enter a valid YouTube URL.",
      });
      return;
    }

    // ── Same-video fetch protection ──────────────────────────────────────────
    const newCount = await incrementFetchCount(youtubeUrl);

    if (newCount === 2) {
      // 2nd fetch: warn but proceed for free
      toast({
        title: "⚠️ Heads-up",
        description:
          "You have fetched this transcript twice. A 3rd fetch for the same video will deduct 1 generation credit.",
      });
    } else if (newCount >= 3) {
      // 3rd+ fetch: deduct 1 credit before proceeding
      const deducted = await useCredit();
      if (!deducted) {
        toast({
          variant: "destructive",
          title: "Not enough credits",
          description:
            "You need at least 1 credit to fetch this transcript again. Please generate content first or upgrade your plan.",
        });
        return;
      }
      await refreshCredits();
      toast({
        title: "1 credit deducted",
        description: "1 generation credit was deducted for repeated transcript fetching.",
      });
    }
    // ────────────────────────────────────────────────────────────────────────

    setIsFetching(true);
    setAdWarning(null);

    try {
      const { data, error } = await supabase.functions.invoke("fetch-transcript", {
        body: { url: youtubeUrl },
      });

      if (error) throw error;

      if (data?.transcript) {
        onTranscriptFetched(data.transcript, "auto", data.title);
        setAdWarning(null);

        toast({
          title: "Transcript fetched!",
          description: `Got transcript for "${data.title}"`,
        });
      } else {
        // Auto-expand manual section on any failure
        setShowManual(true);

        // Log technical details for developers only
        if (data?.details) {
          console.log("Transcript fetch details:", data.details);
        }

        // Check for advertisement detection
        if (data?.errorCode === "AD_DETECTED") {
          setAdWarning("We detected an advertisement instead of the video transcript.");
          scrollToManualSection();
          return;
        }

        // Check for quota/rate limit errors (429) - show friendly modal
        const isQuotaError =
          data?.details?.includes("429") ||
          data?.error?.toLowerCase().includes("rate limit") ||
          data?.error?.toLowerCase().includes("quota");

        if (isQuotaError) {
          setShowHighDemandModal(true);
          return;
        }

        // Generic "no captions" message without technical details
        toast({
          title: "Transcript not available",
          description: "This video's captions couldn't be fetched. Try pasting the transcript manually.",
        });

        // Scroll to manual section
        setTimeout(() => {
          manualSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    } catch (error: any) {
      console.error("Fetch error:", error);

      // Auto-expand manual section on any failure
      setShowManual(true);

      // Check if it's a quota/rate limit error
      const errorMessage = error?.message?.toLowerCase() || "";
      const isQuotaError =
        errorMessage.includes("429") ||
        errorMessage.includes("rate limit") ||
        errorMessage.includes("quota") ||
        errorMessage.includes("too many requests");

      if (isQuotaError) {
        setShowHighDemandModal(true);
        return;
      }

      toast({
        title: "Couldn't fetch transcript",
        description: "No worries! You can paste the transcript manually below.",
      });

      // Scroll to manual section
      setTimeout(() => {
        manualSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    } finally {
      setIsFetching(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manualTranscript.trim()) {
      toast({
        variant: "destructive",
        title: "Empty transcript",
        description: "Please paste some text.",
      });
      return;
    }
    if (isOverLimit) {
      toast({
        variant: "destructive",
        title: "Transcript too long",
        description: `Please reduce to ${MAX_TRANSCRIPT_LENGTH.toLocaleString()} characters or less.`,
      });
      return;
    }
    onTranscriptFetched(manualTranscript.trim(), "manual");
    toast({
      title: "Transcript added!",
      description: "You can now generate content.",
    });
  };

  const handleUrlChange = (value: string) => {
    setYoutubeUrl(value);
    // Clear any existing manual transcript when entering a new URL
    if (value !== youtubeUrl) {
      setManualTranscript("");
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-destructive" />
          YouTube Video
        </CardTitle>
        <CardDescription>Enter a YouTube URL to extract the transcript</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        <div className="space-y-3">
          <Label htmlFor="youtube-url">Logic Bar</Label>
          {/* Logic Bar: single sleek input with Generate button inside */}
          <div className="relative flex items-center w-full rounded-xl border border-border bg-muted/30 focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/30 transition-all">
            <Link2 className="absolute left-4 h-4 w-4 text-muted-foreground shrink-0 pointer-events-none" />
            <input
              id="youtube-url"
              type="url"
              placeholder="Paste a YouTube URL to analyze..."
              value={youtubeUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && isValidUrl && !isFetching && handleFetchTranscript()}
              className="flex-1 bg-transparent text-sm pl-10 pr-2 py-3 focus:outline-none text-foreground placeholder:text-muted-foreground"
            />
            <div className="pr-2 shrink-0">
              <Button
                onClick={handleFetchTranscript}
                disabled={!isValidUrl || isFetching}
                size="sm"
                className="gradient-primary text-primary-foreground btn-glow h-8 px-3 gap-1.5"
              >
                {isFetching ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Fetch</span>
                  </>
                )}
              </Button>
            </div>
          </div>
          {youtubeUrl && !isValidUrl && <p className="text-sm text-destructive">Please enter a valid YouTube URL</p>}
          {/* Preview button below */}
          <div className="flex gap-2">
            <Button
              onClick={() => setShowPreviewModal(true)}
              disabled={!transcript}
              variant="outline"
              size="sm"
              className="shrink-0"
            >
              <Eye className="h-4 w-4 mr-1" />
              Preview Transcript
            </Button>
          </div>
        </div>

        {/* Advertisement Warning */}
        {adWarning && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{adWarning}</AlertDescription>
          </Alert>
        )}

        {/* Transcript status */}
        {transcript && (
          <div className="p-3 rounded-lg bg-success/10 border border-success/20 flex items-center gap-2">
            <Check className="h-4 w-4 text-success" />
            <span className="text-sm text-success">Transcript loaded</span>
            <Badge variant="secondary" className="ml-auto">
              {transcriptMethod === "auto" ? "Auto-fetched" : "Manual"}
            </Badge>
          </div>
        )}

        {/* Manual transcript toggle */}
        {!transcript && (
          <button
            onClick={() => setShowManual(!showManual)}
            className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            <FileText className="h-3.5 w-3.5" />
            {showManual ? "Hide manual entry" : "Don't have a transcript? Paste it manually."}
          </button>
        )}

        {/* Manual transcript entry */}
        {showManual && !transcript && (
          <div ref={manualSectionRef} className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <Label htmlFor="manual-transcript" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Paste Transcript Manually
              </Label>
              <button
                onClick={() => setShowHelpGuide(!showHelpGuide)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                How to get a transcript
              </button>
            </div>

            {/* Help Guide */}
            <Collapsible open={showHelpGuide} onOpenChange={setShowHelpGuide}>
              <CollapsibleContent>
                <div className="p-3 rounded-md bg-background border border-border text-sm space-y-3 mb-3">
                  <p className="font-medium text-foreground">How to copy a YouTube transcript:</p>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>Open the video on YouTube in your browser</li>
                    <li>
                      Click the <strong className="text-foreground">"...more" in the description</strong> button below
                      the video
                    </li>
                    <li>
                      Select <strong className="text-foreground">"Show transcript"</strong> from the menu
                    </li>
                    <li>A transcript panel will appear on the right side of the video</li>
                    <li>
                      Click the <strong className="text-foreground">⋮</strong> (three dots) in the transcript panel and
                      select <strong className="text-foreground">"Toggle timestamps"</strong> to hide timestamps
                      (optional)
                    </li>
                    <li>
                      Select all text in the transcript panel (
                      <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">Ctrl+A</kbd> or{" "}
                      <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">⌘+A</kbd>) and copy it
                    </li>
                    <li>Paste it in the box below</li>
                  </ol>
                  <div className="p-2 rounded bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-primary">💡</span>
                      <span>
                        <strong>Tip:</strong> Not all videos have transcripts. If you don't see "Show transcript" in the
                        menu, the video's creator hasn't enabled captions.
                      </span>
                    </p>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="relative">
              <Textarea
                id="manual-transcript"
                placeholder="Paste the video transcript here..."
                value={manualTranscript}
                onChange={(e) => setManualTranscript(e.target.value)}
                rows={6}
                className={isOverLimit ? "border-destructive focus-visible:ring-destructive" : ""}
              />
            </div>

            {/* Character counter */}
            <div className="flex items-center justify-between">
              <span className={`text-xs ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
                {manualTranscript.length.toLocaleString()} / {MAX_TRANSCRIPT_LENGTH.toLocaleString()} characters
                {isOverLimit && " (over limit)"}
              </span>
              {manualTranscript.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  ~{Math.ceil(manualTranscript.split(/\s+/).filter(Boolean).length).toLocaleString()} words
                </span>
              )}
            </div>

            <Button
              onClick={handleManualSubmit}
              variant="secondary"
              className="w-full"
              disabled={!manualTranscript.trim() || isOverLimit}
            >
              Use This Transcript
            </Button>
          </div>
        )}
      </CardContent>

      {/* Preview Transcript Modal */}
      <Dialog
        open={showPreviewModal}
        onOpenChange={(open) => {
          setShowPreviewModal(open);
          if (!open) {
            setIsEditMode(false);
            setEditableTranscript("");
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {isEditMode ? "Edit Transcript" : "Transcript Preview"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Edit the transcript to remove ads or fix errors before generating content."
                : "Review the fetched transcript before generating content."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {transcript || isEditMode ? (
              <>
                {isEditMode ? (
                  <Textarea
                    value={editableTranscript}
                    onChange={(e) => setEditableTranscript(e.target.value)}
                    className="h-[400px] font-mono text-sm resize-none"
                    placeholder="Paste or edit the transcript here..."
                  />
                ) : (
                  <ScrollArea className="h-[400px] w-full rounded-md border border-border bg-muted/30 p-4">
                    <pre className="font-mono text-sm whitespace-pre-wrap break-words text-foreground leading-relaxed">
                      {transcript}
                    </pre>
                  </ScrollArea>
                )}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{(isEditMode ? editableTranscript : transcript).length.toLocaleString()} characters</span>
                  <div className="flex gap-2">
                    {!isEditMode && (
                      <>
                        <Button onClick={handleEditClick} variant="outline" size="sm">
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button onClick={handleCopyTranscript} variant="outline" size="sm">
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                <p>No transcript available for this video. Please try another link.</p>
              </div>
            )}
          </div>

          {isEditMode && (
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={!editableTranscript.trim()}>
                Save Changes
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* High Demand Modal */}
      <Dialog open={showHighDemandModal} onOpenChange={setShowHighDemandModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Automated Fetching Busy
            </DialogTitle>
            <DialogDescription className="pt-2 text-base leading-relaxed">
              We are currently experiencing high demand for automated transcripts. To skip the wait, please use the
              "Paste Transcript Manually" section below!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowHighDemandModal(false)}>
              Maybe Later
            </Button>
            <Button onClick={scrollToManualSection}>
              <ChevronDown className="h-4 w-4 mr-1" />
              Show me how to paste manually
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
