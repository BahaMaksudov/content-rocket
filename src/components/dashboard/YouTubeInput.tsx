import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Youtube, Link2, FileText, Check, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useTranscriptCredits } from "@/hooks/use-transcript-credits";
import { PremiumModal } from "@/components/PremiumModal";

interface YouTubeInputProps {
  onTranscriptFetched: (transcript: string, method: "auto" | "manual", title?: string) => void;
  transcript: string;
  transcriptMethod: "auto" | "manual" | null;
  youtubeUrl: string;
  setYoutubeUrl: (url: string) => void;
}

const YOUTUBE_URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;

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
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const { toast } = useToast();
  const { isPro } = useSubscription();
  const { canFetch, incrementFetches, creditsRemaining } = useTranscriptCredits();

  const isValidUrl = YOUTUBE_URL_REGEX.test(youtubeUrl);

  const handleFetchTranscript = async () => {
    // Check if free user has remaining fetches
    if (!isPro && !canFetch) {
      setShowPremiumModal(true);
      return;
    }

    if (!isValidUrl) {
      toast({
        variant: "destructive",
        title: "Invalid URL",
        description: "Please enter a valid YouTube URL.",
      });
      return;
    }

    setIsFetching(true);

    try {
      const { data, error } = await supabase.functions.invoke("fetch-transcript", {
        body: { url: youtubeUrl },
      });

      if (error) throw error;

        if (data?.transcript) {
        onTranscriptFetched(data.transcript, "auto", data.title);
        
        // Only increment fetch count after successful fetch (for free users)
        if (!isPro) {
          await incrementFetches();
        }
        
        toast({
          title: "Transcript fetched!",
          description: `Got transcript for "${data.title}"`,
        });
      } else {
        setShowManual(true);

          const title = typeof data?.error === "string" && data.error
            ? data.error
            : "No captions available";

          const description = typeof data?.details === "string" && data.details
            ? data.details
            : "This video doesn't have captions. Please paste the transcript manually.";

        toast({
          variant: "destructive",
            title,
            description,
        });
      }
    } catch (error: any) {
      console.error("Fetch error:", error);
      setShowManual(true);
      toast({
        variant: "destructive",
        title: "Failed to fetch transcript",
        description: "Please paste the transcript manually below.",
      });
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
    onTranscriptFetched(manualTranscript, "manual");
    toast({
      title: "Transcript added!",
      description: "You can now generate content.",
    });
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-destructive" />
          YouTube Video
        </CardTitle>
        <CardDescription>
          Enter a YouTube URL to extract the transcript
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="youtube-url">Video URL</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="youtube-url"
                placeholder="https://youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={handleFetchTranscript}
              disabled={!isValidUrl || isFetching}
              className="shrink-0"
            >
              {isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : !isPro && !canFetch ? (
                <>
                  <Crown className="h-4 w-4 mr-1" />
                  Fetch
                </>
              ) : (
                "Fetch"
              )}
            </Button>
          </div>
          {youtubeUrl && !isValidUrl && (
            <p className="text-sm text-destructive">Please enter a valid YouTube URL</p>
          )}
        </div>

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

        {/* Manual fallback */}
        {(showManual || transcriptMethod === "manual") && !transcript && (
          <div className="space-y-2 pt-2 border-t border-border">
            <Label htmlFor="manual-transcript" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Paste Transcript Manually
            </Label>
            <Textarea
              id="manual-transcript"
              placeholder="Paste the video transcript here..."
              value={manualTranscript}
              onChange={(e) => setManualTranscript(e.target.value)}
              rows={6}
            />
            <Button
              onClick={handleManualSubmit}
              variant="secondary"
              className="w-full"
              disabled={!manualTranscript.trim()}
            >
              Use This Transcript
            </Button>
          </div>
        )}

        {!showManual && !transcript && (
          <button
            onClick={() => setShowManual(true)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Or paste transcript manually →
          </button>
        )}
      </CardContent>

      <PremiumModal 
        open={showPremiumModal} 
        onOpenChange={setShowPremiumModal}
        feature="youtube"
      />
    </Card>
  );
}
