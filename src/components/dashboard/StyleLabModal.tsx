import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles, Plus, Minus, FlaskConical } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface StyleLabModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVoiceCreated?: (voiceId: string) => void;
}

const MIN_SAMPLES = 3;
const MAX_SAMPLES = 5;

export function StyleLabModal({ open, onOpenChange, onVoiceCreated }: StyleLabModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [voiceName, setVoiceName] = useState("");
  const [samples, setSamples] = useState<string[]>(["", "", ""]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const addSample = () => {
    if (samples.length < MAX_SAMPLES) {
      setSamples([...samples, ""]);
    }
  };

  const removeSample = (index: number) => {
    if (samples.length > MIN_SAMPLES) {
      setSamples(samples.filter((_, i) => i !== index));
    }
  };

  const updateSample = (index: number, value: string) => {
    const updated = [...samples];
    updated[index] = value;
    setSamples(updated);
  };

  const filledSamples = samples.filter((s) => s.trim().length >= 50);

  const handleAnalyze = async () => {
    if (!voiceName.trim()) {
      toast({ variant: "destructive", title: "Voice name is required" });
      return;
    }

    if (filledSamples.length < MIN_SAMPLES) {
      toast({
        variant: "destructive",
        title: "More samples needed",
        description: `Please provide at least ${MIN_SAMPLES} writing samples (each at least 50 characters).`,
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-voice", {
        body: {
          samples: samples.filter((s) => s.trim().length >= 50).map((s) => s.trim()),
          voiceName: voiceName.trim(),
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      queryClient.invalidateQueries({ queryKey: ["brandVoices"] });

      toast({
        title: "Voice profile created!",
        description: `"${voiceName}" has been trained from your writing samples and is ready to use.`,
      });

      if (data?.voice?.id) {
        onVoiceCreated?.(data.voice.id);
      }

      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Voice analysis error:", err);
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: err.message || "Failed to analyze writing samples. Please try again.",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetForm = () => {
    setVoiceName("");
    setSamples(["", "", ""]);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Style Lab
          </DialogTitle>
          <DialogDescription>
            Paste 3–5 examples of your writing (social posts, blog excerpts, emails). Our AI will
            analyze your tone, structure, and vocabulary to create a custom Style Profile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Voice Name */}
          <div className="space-y-2">
            <Label htmlFor="style-lab-name">Voice Name *</Label>
            <Input
              id="style-lab-name"
              placeholder="e.g., My LinkedIn Voice"
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              maxLength={50}
            />
          </div>

          {/* Writing Samples */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Writing Samples *</Label>
              <Badge variant="outline" className="text-xs">
                {filledSamples.length}/{MIN_SAMPLES} min
              </Badge>
            </div>

            {samples.map((sample, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">
                    Sample {index + 1}
                  </span>
                  {samples.length > MIN_SAMPLES && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-muted-foreground hover:text-destructive"
                      onClick={() => removeSample(index)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Textarea
                  placeholder="Paste a social media post, blog excerpt, or email you've written..."
                  value={sample}
                  onChange={(e) => updateSample(index, e.target.value)}
                  rows={3}
                  className="resize-none text-sm"
                  maxLength={5000}
                />
                {sample.trim().length > 0 && sample.trim().length < 50 && (
                  <p className="text-xs text-destructive">
                    Too short — need at least 50 characters ({sample.trim().length}/50)
                  </p>
                )}
              </div>
            ))}

            {samples.length < MAX_SAMPLES && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSample}
                className="w-full border-dashed"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Another Sample ({samples.length}/{MAX_SAMPLES})
              </Button>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isAnalyzing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || filledSamples.length < MIN_SAMPLES || !voiceName.trim()}
              className="flex-1 gradient-primary text-primary-foreground"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Analyzing Style...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Train Voice
                </>
              )}
            </Button>
          </div>

          {isAnalyzing && (
            <p className="text-xs text-muted-foreground text-center animate-pulse">
              AI is reading your samples and building a Style Profile… this may take 10–15 seconds.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
