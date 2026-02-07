import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Loader2,
  Youtube,
  Globe,
  Link2,
  FileText,
  FileAudio,
  Check,
  Crown,
  Eye,
  Copy,
  Pencil,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  Info,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useCredits } from "@/hooks/use-credits";
import { PremiumModal } from "@/components/PremiumModal";
import { useVideoExtraction, isAudioFile, isVideoFile } from "@/hooks/use-video-extraction";

/* ────────────────────── Types & Constants ────────────────────── */

interface ContentInputProps {
  onTranscriptFetched: (transcript: string, method: "auto" | "manual", title?: string) => void;
  transcript: string;
  transcriptMethod: "auto" | "manual" | null;
  youtubeUrl: string;
  setYoutubeUrl: (url: string) => void;
  onCreditUsed?: () => Promise<void>;
}

const YOUTUBE_URL_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/;
const MAX_TRANSCRIPT_LENGTH = 20000;
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const ACCEPTED_FILE_TYPES = ".mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.webm,.mov,.avi";

/* ────────────────────── Component ────────────────────── */

export function ContentInput({
  onTranscriptFetched,
  transcript,
  transcriptMethod,
  youtubeUrl,
  setYoutubeUrl,
  onCreditUsed,
}: ContentInputProps) {
  /* ── State ── */
  const [isFetching, setIsFetching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [manualTranscript, setManualTranscript] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableTranscript, setEditableTranscript] = useState("");
  const [adWarning, setAdWarning] = useState<string | null>(null);
  const [showHighDemandModal, setShowHighDemandModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { extractAudio, progress: extractionProgress, isExtracting, error: extractionError } = useVideoExtraction();

  const manualSectionRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const { isPro } = useSubscription();
  const { canUseCredits, useCredit } = useCredits();

  /* ── Source detection ── */
  const isYoutubeUrl = YOUTUBE_URL_REGEX.test(youtubeUrl);
  const hasProtocol = /^https?:\/\//i.test(youtubeUrl);
  const isWebUrl = hasProtocol && !isYoutubeUrl && youtubeUrl.includes(".");
  const isValidUrl = isYoutubeUrl || isWebUrl;
  const needsProtocol =
    !hasProtocol && youtubeUrl.includes(".") && !isYoutubeUrl && youtubeUrl.length > 3;
  const isOverLimit = manualTranscript.length > MAX_TRANSCRIPT_LENGTH;

  /* ── Side effects ── */
  useEffect(() => {
    if (youtubeUrl) {
      setManualTranscript("");
      setSelectedFile(null);
    }
  }, [youtubeUrl]);

  /* ── Helpers ── */
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
      toast({ title: "Copied!", description: "Content copied to clipboard." });
    } catch {
      toast({ variant: "destructive", title: "Copy failed", description: "Could not copy to clipboard." });
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
      toast({ title: "Content updated!", description: "Your edited content has been saved." });
    }
  };
  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditableTranscript("");
  };

  const handleUrlChange = (value: string) => {
    setYoutubeUrl(value);
    if (value !== youtubeUrl) {
      setManualTranscript("");
      setSelectedFile(null);
    }
  };

  const handleFileSelect = (file: File) => {
    // Audio files must be under 25 MB; video files will be extracted client-side
    if (isAudioFile(file) && file.size > MAX_FILE_SIZE) {
      toast({ variant: "destructive", title: "File too large", description: "Audio files must be under 25 MB." });
      return;
    }
    setSelectedFile(file);
    setYoutubeUrl("");
  };

  /* ── Fetch: YouTube or Web URL ── */
  const handleFetch = async () => {
    if (!isPro && !canUseCredits) {
      setShowPremiumModal(true);
      return;
    }
    if (!isValidUrl) {
      toast({ variant: "destructive", title: "Invalid URL", description: "Please enter a valid URL." });
      return;
    }

    setIsFetching(true);
    setAdWarning(null);

    try {
      if (isYoutubeUrl) {
        /* ── YouTube transcript ── */
        const { data, error } = await supabase.functions.invoke("fetch-transcript", {
          body: { url: youtubeUrl },
        });
        if (error) throw error;

        if (data?.transcript) {
          onTranscriptFetched(data.transcript, "auto", data.title);
          setAdWarning(null);
          if (!isPro) {
            await useCredit();
            onCreditUsed?.();
          }
          toast({ title: "Transcript fetched!", description: `Got transcript for "${data.title}"` });
        } else {
          setShowManual(true);
          if (data?.details) console.log("Transcript fetch details:", data.details);
          if (data?.errorCode === "AD_DETECTED") {
            setAdWarning("We detected an advertisement instead of the video transcript.");
            scrollToManualSection();
            return;
          }
          const isQuotaError =
            data?.details?.includes("429") ||
            data?.error?.toLowerCase().includes("rate limit") ||
            data?.error?.toLowerCase().includes("quota");
          if (isQuotaError) {
            setShowHighDemandModal(true);
            return;
          }
          toast({
            title: "Transcript not available",
            description: "This video's captions couldn't be fetched. Try pasting manually.",
          });
          setTimeout(() => {
            manualSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 100);
        }
      } else if (isWebUrl) {
        /* ── Web page content via Jina Reader ── */
        const { data, error } = await supabase.functions.invoke("fetch-web-content", {
          body: { url: youtubeUrl },
        });
        if (error) throw error;

        if (data?.transcript) {
          onTranscriptFetched(data.transcript, "auto", data.title);
          if (!isPro) {
            await useCredit();
            onCreditUsed?.();
          }
          toast({ title: "Content extracted!", description: `Got content from "${data.title}"` });
        } else {
          toast({
            variant: "destructive",
            title: "Extraction failed",
            description: data?.error || "Could not extract content from this page.",
          });
        }
      }
    } catch (error: any) {
      console.error("Fetch error:", error);
      setShowManual(true);
      const errorMessage = error?.message?.toLowerCase() || "";
      if (isYoutubeUrl) {
        const isQuotaError =
          errorMessage.includes("429") ||
          errorMessage.includes("rate limit") ||
          errorMessage.includes("quota") ||
          errorMessage.includes("too many requests");
        if (isQuotaError) {
          setShowHighDemandModal(true);
          return;
        }
      }
      toast({
        title: "Couldn't fetch content",
        description: "Please try again or paste the content manually below.",
      });
      setTimeout(() => {
        manualSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    } finally {
      setIsFetching(false);
    }
  };

  /* ── File upload: extract audio (if video) → Whisper transcription ── */
  const handleFileUpload = async () => {
    if (!selectedFile) return;
    if (!isPro && !canUseCredits) {
      setShowPremiumModal(true);
      return;
    }

    setIsUploading(true);
    try {
      let fileToUpload: File = selectedFile;

      // If it's a video file, extract audio first using FFmpeg.wasm
      if (isVideoFile(selectedFile)) {
        const extracted = await extractAudio(selectedFile);
        if (!extracted) {
          // extractionError will be set by the hook
          toast({
            variant: "destructive",
            title: "Audio extraction failed",
            description: extractionError || "Could not extract audio from this video.",
          });
          setIsUploading(false);
          return;
        }
        fileToUpload = extracted;
      }

      const formData = new FormData();
      formData.append("file", fileToUpload);

      const { data, error } = await supabase.functions.invoke("transcribe-media", {
        body: formData,
      });
      if (error) throw error;

      if (data?.transcript) {
        onTranscriptFetched(data.transcript, "auto", data.title);
        if (!isPro) {
          await useCredit();
          onCreditUsed?.();
        }
        toast({ title: "File transcribed!", description: `Transcript ready for "${data.title}"` });
        setSelectedFile(null);
      } else {
        throw new Error(data?.error || "Transcription failed");
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Transcription failed",
        description: error?.message || "Could not transcribe the file. Please try again.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  /* ── Manual paste ── */
  const handleManualSubmit = () => {
    if (!manualTranscript.trim()) {
      toast({ variant: "destructive", title: "Empty content", description: "Please paste some text." });
      return;
    }
    if (isOverLimit) {
      toast({
        variant: "destructive",
        title: "Content too long",
        description: `Please reduce to ${MAX_TRANSCRIPT_LENGTH.toLocaleString()} characters or less.`,
      });
      return;
    }
    onTranscriptFetched(manualTranscript.trim(), "manual");
    toast({ title: "Content added!", description: "You can now generate content." });
  };

  /* ── Derived UI values ── */
  const sourceIcon = isYoutubeUrl ? (
    <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
  ) : isWebUrl ? (
    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
  ) : (
    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  );

  const fetchLabel = isYoutubeUrl ? "Fetch Transcript" : isWebUrl ? "Extract Content" : "Fetch";

  /* ────────────────────── Render ────────────────────── */
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Content Source
        </CardTitle>
        <CardDescription>YouTube, web pages, or audio / video files</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Respect Creators Note */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border text-muted-foreground">
          <span className="text-base leading-none">⚠️</span>
          <p className="text-sm leading-relaxed">
            <strong>Note:</strong> Please ensure you have permission to use this content or are creating
            original commentary. We support a healthy ecosystem of creators.
          </p>
        </div>

        {/* ── Source Tabs ── */}
        <Tabs defaultValue="url" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url" className="flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" /> Link
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Upload File
            </TabsTrigger>
          </TabsList>

          {/* ── URL Tab ── */}
          <TabsContent value="url" className="space-y-3 mt-3">
            <div className="space-y-2">
              <Label htmlFor="source-url">URL</Label>
              <div className="relative w-full">
                {sourceIcon}
                <Input
                  id="source-url"
                  placeholder="https://youtube.com/watch?v=... or any web page"
                  value={youtubeUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
              {youtubeUrl && isValidUrl && (
                <Badge variant="secondary" className="text-xs">
                  {isYoutubeUrl ? "YouTube Video" : "Web Page"}
                </Badge>
              )}
              {needsProtocol && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" /> Add https:// to fetch this web page
                </p>
              )}
              {youtubeUrl && !isValidUrl && !needsProtocol && (
                <p className="text-sm text-destructive">Please enter a valid URL</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleFetch} disabled={!isValidUrl || isFetching} className="shrink-0">
                {isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : !isPro && !canUseCredits ? (
                  <>
                    <Crown className="h-4 w-4 mr-1" />
                    {fetchLabel}
                  </>
                ) : (
                  fetchLabel
                )}
              </Button>
              <Button
                onClick={() => setShowPreviewModal(true)}
                disabled={!transcript}
                variant="outline"
                className="shrink-0"
              >
                <Eye className="h-4 w-4 mr-1" /> Preview
              </Button>
            </div>
          </TabsContent>

          {/* ── Upload Tab ── */}
          <TabsContent value="upload" className="space-y-3 mt-3">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                selectedFile && "border-primary/30 bg-primary/5"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileSelect(file);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept={ACCEPTED_FILE_TYPES}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              {selectedFile ? (
                <div className="space-y-2">
                  <FileAudio className="h-8 w-8 mx-auto text-primary" />
                  <p className="font-medium text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                    {isVideoFile(selectedFile) && (
                      <span className="ml-1">&bull; Audio will be extracted</span>
                    )}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                  >
                    <X className="h-3 w-3 mr-1" /> Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm font-medium">Drop an audio or video file here</p>
                  <p className="text-xs text-muted-foreground">
                    MP3, MP4, MOV, AVI, WAV, M4A, WebM
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Videos are processed locally &bull; Audio files max 25 MB
                  </p>
                </div>
              )}
            </div>

            {/* Extraction Progress Bar */}
            {isExtracting && extractionProgress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">
                    {extractionProgress.message}
                  </span>
                  <span className="text-muted-foreground">
                    {extractionProgress.percent}%
                  </span>
                </div>
                <Progress value={extractionProgress.percent} className="h-2" />
              </div>
            )}

            {/* Extraction Error */}
            {extractionError && !isExtracting && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{extractionError}</AlertDescription>
              </Alert>
            )}

            {selectedFile && (
              <Button onClick={handleFileUpload} disabled={isUploading || isExtracting} className="w-full">
                {isExtracting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing Video&hellip;
                  </>
                ) : isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Transcribing&hellip;
                  </>
                ) : !isPro && !canUseCredits ? (
                  <>
                    <Crown className="h-4 w-4 mr-1" /> Transcribe File
                  </>
                ) : (
                  <>
                    <FileAudio className="h-4 w-4 mr-2" /> Transcribe File
                  </>
                )}
              </Button>
            )}

            {transcript && (
              <Button
                onClick={() => setShowPreviewModal(true)}
                variant="outline"
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-1" /> Preview Content
              </Button>
            )}
          </TabsContent>
        </Tabs>

        {/* Ad Warning (YouTube-specific) */}
        {adWarning && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{adWarning}</AlertDescription>
          </Alert>
        )}

        {/* Transcript Status */}
        {transcript && (
          <div className="p-3 rounded-lg bg-success/10 border border-success/20 flex items-center gap-2">
            <Check className="h-4 w-4 text-success" />
            <span className="text-sm text-success">Content loaded</span>
            <Badge variant="secondary" className="ml-auto">
              {transcriptMethod === "auto" ? "Auto-fetched" : "Manual"}
            </Badge>
          </div>
        )}

        {/* Manual Paste Toggle */}
        {!transcript && (
          <button
            onClick={() => setShowManual(!showManual)}
            className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            <FileText className="h-3.5 w-3.5" />
            {showManual ? "Hide manual entry" : "Or paste content manually"}
          </button>
        )}

        {/* Manual Paste Entry */}
        {showManual && !transcript && (
          <div ref={manualSectionRef} className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <Label htmlFor="manual-transcript" className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Paste Content Manually
              </Label>
              <button
                onClick={() => setShowHelpGuide(!showHelpGuide)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <HelpCircle className="h-3.5 w-3.5" /> How to get a transcript
              </button>
            </div>

            <Collapsible open={showHelpGuide} onOpenChange={setShowHelpGuide}>
              <CollapsibleContent>
                <div className="p-3 rounded-md bg-background border border-border text-sm space-y-3 mb-3">
                  <p className="font-medium text-foreground">How to copy a YouTube transcript:</p>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>Open the video on YouTube</li>
                    <li>
                      Click <strong className="text-foreground">&ldquo;...more&rdquo;</strong> below the
                      video
                    </li>
                    <li>
                      Select <strong className="text-foreground">&ldquo;Show transcript&rdquo;</strong>
                    </li>
                    <li>Select all text and copy it</li>
                    <li>Paste it below</li>
                  </ol>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Textarea
              id="manual-transcript"
              placeholder="Paste the transcript or content here..."
              value={manualTranscript}
              onChange={(e) => setManualTranscript(e.target.value)}
              rows={6}
              className={isOverLimit ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            <div className="flex items-center justify-between">
              <span className={`text-xs ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
                {manualTranscript.length.toLocaleString()} / {MAX_TRANSCRIPT_LENGTH.toLocaleString()}{" "}
                characters
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
              Use This Content
            </Button>
          </div>
        )}
      </CardContent>

      {/* ── Modals ── */}
      <PremiumModal open={showPremiumModal} onOpenChange={setShowPremiumModal} feature="youtube" />

      {/* Preview / Edit Modal */}
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
              {isEditMode ? "Edit Content" : "Content Preview"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Edit the content to remove noise or fix errors before generating."
                : "Review the fetched content before generating."}
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
                    placeholder="Paste or edit the content here..."
                  />
                ) : (
                  <ScrollArea className="h-[400px] w-full rounded-md border border-border bg-muted/30 p-4">
                    <pre className="font-mono text-sm whitespace-pre-wrap break-words text-foreground leading-relaxed">
                      {transcript}
                    </pre>
                  </ScrollArea>
                )}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {(isEditMode ? editableTranscript : transcript).length.toLocaleString()} characters
                  </span>
                  <div className="flex gap-2">
                    {!isEditMode && (
                      <>
                        <Button onClick={handleEditClick} variant="outline" size="sm">
                          <Pencil className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button onClick={handleCopyTranscript} variant="outline" size="sm">
                          <Copy className="h-4 w-4 mr-1" /> Copy
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                <p>No content available. Please fetch or upload content first.</p>
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

      {/* High Demand Modal (YouTube-specific) */}
      <Dialog open={showHighDemandModal} onOpenChange={setShowHighDemandModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Automated Fetching Busy
            </DialogTitle>
            <DialogDescription className="pt-2 text-base leading-relaxed">
              We are currently experiencing high demand for automated transcripts. Use the &ldquo;Paste
              Manually&rdquo; section below!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowHighDemandModal(false)}>
              Maybe Later
            </Button>
            <Button onClick={scrollToManualSection}>
              <ChevronDown className="h-4 w-4 mr-1" /> Show me how to paste manually
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
