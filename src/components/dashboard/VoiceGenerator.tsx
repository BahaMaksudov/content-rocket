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
import { 
  getVoiceById, 
  getDefaultVoice, 
  getVoicesForTier,
} from "@/lib/voice-archetypes";
import { AudioPlayer } from "./AudioPlayer";
import { PremiumModal } from "@/components/PremiumModal";

interface VoiceGeneratorProps {
  scriptText: string;
}

export function VoiceGenerator({ scriptText }: VoiceGeneratorProps) {
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

  const handleGenerateAudio = async () => {
    // Gate free users
    if (isFreeUser) {
      setShowUpgradeModal(true);
      return;
    }

    if (!scriptText.trim()) {
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
      // Ensure we have a valid session token
      if (!session?.access_token) {
        toast({
          title: "Authentication required",
          description: "Please sign in to use voice generation.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-audio`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            text: scriptText,
            voiceId: voice.voiceId,
            performancePrompt: voice.performancePrompt,
          }),
        }
      );

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle 403 specifically for subscription errors
        if (response.status === 403) {
          setShowUpgradeModal(true);
          throw new Error("Upgrade required to use voice generation");
        }
        
        throw new Error(errorData.error || "Failed to generate audio");
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
      clearInterval(progressInterval);
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
        <div className="flex flex-wrap items-center gap-3">
          <Select 
            value={selectedVoiceId} 
            onValueChange={setSelectedVoiceId}
            disabled={isFreeUser}
          >
            <SelectTrigger className={`w-[200px] ${isFreeUser ? 'opacity-50' : ''}`}>
              <SelectValue placeholder="Select Voice" />
            </SelectTrigger>
            <SelectContent>
              {/* Standard Voices - Pro & Agency */}
              <SelectGroup>
                <SelectLabel className="flex items-center gap-1">
                  <Crown className="h-3 w-3 text-primary" />
                  Character Voices
                </SelectLabel>
                {voices.standard.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{voice.name}</span>
                      <span className="text-xs text-muted-foreground">{voice.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>

              {/* Cloned Voices - Agency Only */}
              {isAgency && voices.cloned.length > 0 && (
                <>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel className="flex items-center gap-1">
                      <Rocket className="h-3 w-3 text-amber-500" />
                      Premium Cloned Voices
                    </SelectLabel>
                    {voices.cloned.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        <div className="flex flex-col">
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
                  <SelectSeparator />
                  <div className="px-2 py-2 text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    <span>Cloned voices available with Agency</span>
                  </div>
                </>
              )}
            </SelectContent>
          </Select>

          <Button
            onClick={handleGenerateAudio}
            disabled={isGenerating || !scriptText.trim() || subscriptionLoading}
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
