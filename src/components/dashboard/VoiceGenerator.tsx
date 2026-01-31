import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Volume2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VOICE_ARCHETYPES, getVoiceById, getDefaultVoice } from "@/lib/voice-archetypes";
import { AudioPlayer } from "./AudioPlayer";

interface VoiceGeneratorProps {
  scriptText: string;
}

export function VoiceGenerator({ scriptText }: VoiceGeneratorProps) {
  const { toast } = useToast();
  const [selectedVoiceId, setSelectedVoiceId] = useState(getDefaultVoice().id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleGenerateAudio = async () => {
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
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-audio`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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
      toast({
        title: "Audio generation failed",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
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
    <div className="space-y-3">
      {/* Voice Selection & Generate Button */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Voice" />
          </SelectTrigger>
          <SelectContent>
            {VOICE_ARCHETYPES.map((voice) => (
              <SelectItem key={voice.id} value={voice.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{voice.name}</span>
                  <span className="text-xs text-muted-foreground">{voice.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={handleGenerateAudio}
          disabled={isGenerating || !scriptText.trim()}
          variant="secondary"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Volume2 className="h-4 w-4 mr-2" />
              Convert to Audio
            </>
          )}
        </Button>
      </div>

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
  );
}
