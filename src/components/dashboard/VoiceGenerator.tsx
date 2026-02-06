import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Volume2, Loader2, Lock, Crown, Rocket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  getVoiceById, 
  getDefaultVoice, 
  getVoicesForTier,
} from "@/lib/voice-archetypes";
import { AudioPlayer } from "./AudioPlayer";
import { PremiumModal } from "@/components/PremiumModal";

interface VoiceGeneratorProps {
  scriptText: string;
  targetLanguage?: string | null;
}

export function VoiceGenerator({ scriptText, targetLanguage }: VoiceGeneratorProps) {
  const { toast } = useToast();
  const { session } = useAuth();
  const { tier, isPro, isAgency, loading: subscriptionLoading } = useSubscription();
  
  const [selectedVoiceId, setSelectedVoiceId] = useState(getDefaultVoice().id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const isFreeUser = tier === "free";
  const voices = getVoicesForTier(tier);

  // Validate and clean the script text - ensure it's a string
  const getCleanScriptText = (): string => {
    if (!scriptText) return '';
    
    // If it's already a string, return it trimmed
    if (typeof scriptText === 'string') {
      return scriptText.trim();
    }
    
    // If it's an array, flatten it
    if (Array.isArray(scriptText)) {
      return (scriptText as unknown[])
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            const obj = item as Record<string, unknown>;
            return String(obj.text || obj.snippet || obj.content || '');
          }
          return '';
        })
        .filter(Boolean)
        .join(' ')
        .trim();
    }
    
    // If it's an object with text property
    if (typeof scriptText === 'object') {
      const obj = scriptText as Record<string, unknown>;
      return String(obj.text || obj.snippet || obj.content || '').trim();
    }
    
    return '';
  };

  const handleGenerateAudio = async () => {
    // Gate free users
    if (isFreeUser) {
      setShowUpgradeModal(true);
      return;
    }

    const cleanText = getCleanScriptText();
    
    if (!cleanText || cleanText.length < 10) {
      toast({
        title: "No script content",
        description: "Please generate a script first before converting to audio.",
        variant: "destructive",
      });
      return;
    }

    const voice = getVoiceById(selectedVoiceId);
    if (!voice) {
      toast({
        title: "Voice not found",
        description: "Please select a valid voice.",
        variant: "destructive",
      });
      return;
    }

    // Check if user has access to this voice tier
    if (voice.tier === "agency" && !isAgency) {
      toast({
        title: "Agency voice",
        description: "This voice is only available to Agency users.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setAudioUrl(null);

    // Simulate progress for UX (actual API doesn't stream progress)
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    try {
      // Always re-read the session right before calling a backend function
      // so we don't accidentally use a stale access token.
      const { data: sessionData } = await supabase.auth.getSession();
      let accessToken = sessionData.session?.access_token || session?.access_token;

      if (!accessToken) {
        toast({
          title: "Authentication required",
          description: "Please sign in to use voice generation.",
          variant: "destructive",
        });
        return;
      }

      const makeRequest = async (token: string) =>
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-audio`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            // Always send the cleaned script text as a string
            text: cleanText,
            voiceId: voice.voiceId,
            performancePrompt: voice.performancePrompt,
            targetLanguage: targetLanguage || "english",
          }),
        });

      let response = await makeRequest(accessToken);
      let errorData: any = null;

      // If we get an auth error, refresh session and retry once.
      // 401 is always treated as an auth/session problem.
      // 403 is only retried when it looks like a token/JWT issue (NOT tier gating).
      if (!response.ok && (response.status === 401 || response.status === 403)) {
        errorData = await response.json().catch(() => ({}));

        const isTierError =
          errorData?.code === "SUBSCRIPTION_REQUIRED" || errorData?.code === "AGENCY_REQUIRED";

        const looksLikeTokenError =
          !isTierError &&
          (typeof errorData?.error !== "string" || /token|jwt|expired|invalid/i.test(errorData.error));

        const shouldRefreshAndRetry = response.status === 401 || (response.status === 403 && looksLikeTokenError);

        if (shouldRefreshAndRetry) {
          const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
          const refreshedToken = refreshed?.session?.access_token;
          if (!refreshError && refreshedToken) {
            accessToken = refreshedToken;
            response = await makeRequest(accessToken);
            // If retry also fails, read the latest error body for messaging.
            if (!response.ok) {
              errorData = await response.json().catch(() => ({}));
            }
          }
        }
      }

      if (!response.ok) {
        if (!errorData) {
          errorData = await response.json().catch(() => ({}));
        }

        // Subscription/tier errors should not trigger token refresh.
        if (response.status === 403 && errorData?.code === "SUBSCRIPTION_REQUIRED") {
          setShowUpgradeModal(true);
          throw new Error("Upgrade required to use voice generation");
        }

        throw new Error(errorData?.error || "Failed to generate audio");
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      
      setProgress(100);
      setAudioUrl(url);
      
      toast({
        title: "Audio generated!",
        description: `Your script is now voiced by ${voice.name}.`,
      });

    } catch (error) {
      console.error("Audio generation error:", error);
      
      // Don't show toast if we're showing upgrade modal
      if (error instanceof Error && !error.message.includes("Upgrade")) {
        toast({
          title: "Audio generation failed",
          description: error.message || "Please try again later.",
          variant: "destructive",
        });
      }
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setProgress(0);
  };

  // If audio is generated, show the player
  if (audioUrl) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Volume2 className="h-4 w-4" />
          <span>Audio generated with {getVoiceById(selectedVoiceId)?.name}</span>
        </div>
        <AudioPlayer audioUrl={audioUrl} onReset={handleReset} />
      </div>
    );
  }

  // Show generation controls
  return (
    <>
      <div className="space-y-3">
        {/* Voice Selection & Generate Button */}
        <div className="flex flex-wrap items-center gap-4">
          <Select 
            value={selectedVoiceId} 
            onValueChange={setSelectedVoiceId}
            disabled={isFreeUser}
          >
            <SelectTrigger className={`w-[260px] ${isFreeUser ? 'opacity-50' : ''}`}>
              <SelectValue placeholder="Select Voice" />
            </SelectTrigger>
            <SelectContent className="z-[100] min-w-[280px]">
              {/* Standard Voices - Pro & Agency */}
              <SelectGroup>
                <SelectLabel className="flex items-center gap-1 py-2">
                  <Crown className="h-3 w-3 text-primary" />
                  Character Voices
                </SelectLabel>
                {voices.standard.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id} className="py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{voice.name}</span>
                      <span className="text-xs text-muted-foreground">{voice.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>

              {/* Cloned Voices - Agency Only */}
              {isAgency && voices.cloned.length > 0 && (
                <>
                  <SelectSeparator className="my-2" />
                  <SelectGroup>
                    <SelectLabel className="flex items-center gap-1 py-2">
                      <Rocket className="h-3 w-3 text-primary" />
                      Premium Cloned Voices
                    </SelectLabel>
                    {voices.cloned.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id} className="py-2.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{voice.name}</span>
                          <span className="text-xs text-muted-foreground">{voice.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </>
              )}

              {/* Show locked message for Pro users */}
              {isPro && !isAgency && (
                <>
                  <SelectSeparator className="my-2" />
                  <div className="px-2 py-3 text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    <span>Cloned voices available with Agency</span>
                  </div>
                </>
              )}
            </SelectContent>
          </Select>

          <Button
            onClick={handleGenerateAudio}
            disabled={isGenerating || getCleanScriptText().length < 10 || subscriptionLoading}
            variant={isFreeUser ? "outline" : "secondary"}
            className={isFreeUser ? "opacity-75" : ""}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : isFreeUser ? (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Convert to Audio
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4 mr-2" />
                Convert to Audio
              </>
            )}
          </Button>
        </div>

      {/* Free user hint */}
        {isFreeUser && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Voice generation is a Pro feature
          </p>
        )}

        {/* v3 badge for paid users */}
        {!isFreeUser && !isGenerating && (
          <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
            <Volume2 className="h-2.5 w-2.5" />
            Powered by ElevenLabs Multilingual v2
          </p>
        )}

        {/* Progress Bar during generation */}
        {isGenerating && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Generating audio... {progress}%
            </p>
          </div>
        )}
      </div>

      {/* Upgrade Modal */}
      <PremiumModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        feature="voice-generation"
        description="Convert your scripts into professional AI-powered audio with 5 unique character voices. Upgrade to Pro to unlock this feature!"
      />
    </>
  );
}
