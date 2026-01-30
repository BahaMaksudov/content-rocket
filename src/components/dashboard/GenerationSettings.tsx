import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Mic, Crown, Rocket, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useGenerationCredits, FREE_TIER_LIMIT } from "@/hooks/use-generation-credits";
import { PremiumModal } from "@/components/PremiumModal";
import { GlobalReachSettings } from "./GlobalReachSettings";

interface BrandVoice {
  id: string;
  name: string;
  description: string | null;
}

interface GenerationSettingsProps {
  brandVoices: BrandVoice[];
  selectedBrandVoice: string | null;
  setSelectedBrandVoice: (id: string | null) => void;
  tone: string;
  setTone: (tone: string) => void;
  audience: string;
  setAudience: (audience: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  hasTranscript: boolean;
  globalReachEnabled: boolean;
  setGlobalReachEnabled: (enabled: boolean) => void;
  targetLanguage: string;
  setTargetLanguage: (language: string) => void;
}

const tones = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "humorous", label: "Humorous" },
  { value: "inspirational", label: "Inspirational" },
];

const audiences = [
  { value: "general", label: "General" },
  { value: "b2b", label: "B2B / Business" },
  { value: "tech", label: "Tech-savvy" },
  { value: "young", label: "Young Adults" },
];

export function GenerationSettings({
  brandVoices,
  selectedBrandVoice,
  setSelectedBrandVoice,
  tone,
  setTone,
  audience,
  setAudience,
  onGenerate,
  isGenerating,
  hasTranscript,
  globalReachEnabled,
  setGlobalReachEnabled,
  targetLanguage,
  setTargetLanguage,
}: GenerationSettingsProps) {
  const { isPro } = useSubscription();
  const { canGenerate, creditsRemaining, loading: creditsLoading } = useGenerationCredits();
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const handleBrandVoiceChange = (value: string) => {
    if (!isPro && value !== "none") {
      setShowPremiumModal(true);
      return;
    }
    setSelectedBrandVoice(value === "none" ? null : value);
  };

  const isCreditsExhausted = !isPro && !canGenerate;
  const showCreditsWarning = !isPro && creditsRemaining <= 2 && creditsRemaining > 0;

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Generation Settings
        </CardTitle>
        <CardDescription>
          Customize how your content is generated
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Brand Voice */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Brand Voice
            {!isPro && (
              <span className="ml-auto">
                <Crown className="h-4 w-4 text-primary" />
              </span>
            )}
          </Label>
          <Select
            value={selectedBrandVoice || "none"}
            onValueChange={handleBrandVoiceChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a brand voice" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No brand voice</SelectItem>
              {brandVoices.map((voice) => (
                <SelectItem key={voice.id} value={voice.id}>
                  {voice.name} {!isPro && "(Pro)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {brandVoices.length === 0 && (
            <Link
              to="/brand-voices"
              className="text-sm text-primary hover:underline"
            >
              Create your first brand voice →
            </Link>
          )}
          {!isPro && brandVoices.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Upgrade to Pro to use custom brand voices
            </p>
          )}
        </div>

        {/* Tone */}
        <div className="space-y-2">
          <Label>Tone</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tones.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Audience */}
        <div className="space-y-2">
          <Label>Target Audience</Label>
          <Select value={audience} onValueChange={setAudience}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {audiences.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Global Reach Settings */}
        <GlobalReachSettings
          enabled={globalReachEnabled}
          onEnabledChange={setGlobalReachEnabled}
          language={targetLanguage}
          onLanguageChange={setTargetLanguage}
        />

        {/* Credits Exhausted Warning Banner */}
        {isCreditsExhausted && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-medium">0 credits remaining</span>
          </div>
        )}

        {/* Low Credits Warning */}
        {showCreditsWarning && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning-foreground">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-medium">
              Only {creditsRemaining} credit{creditsRemaining !== 1 ? 's' : ''} remaining
            </span>
          </div>
        )}

        {/* Generate Button */}
        <div className="space-y-2">
          <Button
            onClick={onGenerate}
            disabled={!hasTranscript || isGenerating || isCreditsExhausted}
            className={`w-full ${
              isCreditsExhausted 
                ? "bg-muted text-muted-foreground cursor-not-allowed" 
                : "gradient-primary text-primary-foreground"
            }`}
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating All Assets...
              </>
            ) : isCreditsExhausted ? (
              <>
                <AlertCircle className="h-4 w-4 mr-2" />
                No Credits Remaining
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4 mr-2" />
                Generate All Assets
              </>
            )}
          </Button>

          {/* Credits remaining badge for free tier */}
          {!isPro && !creditsLoading && (
            <div className="flex justify-center">
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  isCreditsExhausted 
                    ? "border-destructive/50 text-destructive" 
                    : showCreditsWarning 
                      ? "border-warning/50 text-warning-foreground"
                      : "border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {creditsRemaining} / {FREE_TIER_LIMIT} credits remaining
              </Badge>
            </div>
          )}
        </div>

        {!hasTranscript && !isCreditsExhausted && (
          <p className="text-sm text-muted-foreground text-center">
            Fetch or paste a transcript first
          </p>
        )}

        {isCreditsExhausted && (
          <Button
            variant="outline"
            onClick={() => setShowPremiumModal(true)}
            className="w-full border-primary/50 text-primary hover:bg-primary/10"
          >
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to Continue Generating
          </Button>
        )}
      </CardContent>

      <PremiumModal 
        open={showPremiumModal} 
        onOpenChange={setShowPremiumModal}
        feature={isCreditsExhausted ? "generation-limit" : "brand-voice"}
      />
    </Card>
  );
}
