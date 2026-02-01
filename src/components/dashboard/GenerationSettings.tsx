import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Mic, Crown, Rocket, AlertCircle, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useCredits } from "@/hooks/use-credits";
import { PremiumModal } from "@/components/PremiumModal";
import { GlobalReachSettings } from "./GlobalReachSettings";
import { CreateBrandVoiceModal } from "./CreateBrandVoiceModal";
import { DEFAULT_BRAND_VOICES, isDefaultVoiceId } from "@/lib/default-brand-voices";

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
  targetLanguage,
  setTargetLanguage,
}: GenerationSettingsProps) {
  const { isPro, isAgency } = useSubscription();
  const { hasCredits, creditsUsed, creditLimit, loading: creditsLoading } = useCredits();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showCreateVoiceModal, setShowCreateVoiceModal] = useState(false);

  // Auto-select default voice on first render if nothing selected
  useState(() => {
    if (!selectedBrandVoice) {
      const defaultVoice = DEFAULT_BRAND_VOICES.find(v => v.isDefault);
      if (defaultVoice) {
        setSelectedBrandVoice(defaultVoice.id);
      }
    }
  });

  const handleBrandVoiceChange = (value: string) => {
    if (value === "create_new") {
      // Open the create modal
      if (!isPro) {
        setShowPremiumModal(true);
        return;
      }
      setShowCreateVoiceModal(true);
      return;
    }
    
    // Custom user voices require Pro (unless it's a default voice)
    if (!isPro && !isDefaultVoiceId(value) && value !== "none") {
      setShowPremiumModal(true);
      return;
    }
    
    setSelectedBrandVoice(value === "none" ? null : value);
  };

  const handleVoiceCreated = (voiceId: string) => {
    // Auto-select the newly created voice
    setSelectedBrandVoice(voiceId);
  };

  // Get the display name for the selected voice
  const getSelectedVoiceName = () => {
    if (!selectedBrandVoice) return "Select a writing style";
    
    // Check default voices first
    const defaultVoice = DEFAULT_BRAND_VOICES.find(v => v.id === selectedBrandVoice);
    if (defaultVoice) return defaultVoice.name;
    
    // Check user voices
    const userVoice = brandVoices.find(v => v.id === selectedBrandVoice);
    if (userVoice) return userVoice.name;
    
    return "Select a writing style";
  };

  // Agency users have unlimited, Pro users have 50, Free users have 5
  const creditsRemaining = isAgency ? Infinity : Math.max(0, creditLimit - creditsUsed);
  const isCreditsExhausted = !isAgency && !hasCredits;
  const showCreditsWarning = !isAgency && creditsRemaining <= (isPro ? 10 : 2) && creditsRemaining > 0;

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
        {/* Writing Style (Brand Voice) */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Writing Style
          </Label>
          <Select
            value={selectedBrandVoice || "default_friendly_peer"}
            onValueChange={handleBrandVoiceChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a writing style">
                {getSelectedVoiceName()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {/* Default Pre-populated Options */}
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Preset Styles
              </div>
              {DEFAULT_BRAND_VOICES.map((voice) => (
                <SelectItem key={voice.id} value={voice.id}>
                  <div className="flex items-center gap-2">
                    {voice.name}
                    {voice.isDefault && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        Default
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
              
              {/* User's Custom Voices */}
              {brandVoices.length > 0 && (
                <>
                  <SelectSeparator />
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1">
                    My Custom Voices
                    {!isPro && <Crown className="h-3 w-3 text-primary" />}
                  </div>
                  {brandVoices.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <div className="flex items-center gap-2">
                        {voice.name}
                        {!isPro && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            Pro
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}
              
              {/* Create New Option */}
              <SelectSeparator />
              <SelectItem value="create_new" className="text-primary">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create New Voice
                  {!isPro && <Crown className="h-3 w-3" />}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          <Link
            to="/brand-voices"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Manage all voices →
          </Link>
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

        {/* Target Language */}
        <GlobalReachSettings
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

          {/* Credits remaining badge for Free and Pro users (Agency has unlimited) */}
          {!isAgency && !creditsLoading && (
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
                {creditsRemaining} / {creditLimit} credits remaining
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
      
      <CreateBrandVoiceModal
        open={showCreateVoiceModal}
        onOpenChange={setShowCreateVoiceModal}
        onVoiceCreated={handleVoiceCreated}
      />
    </Card>
  );
}
