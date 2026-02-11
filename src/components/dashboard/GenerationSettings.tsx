import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Sparkles, Mic, Crown, Rocket, AlertCircle, Plus, Info, FlaskConical, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useCredits } from "@/hooks/use-credits";
import { PremiumModal } from "@/components/PremiumModal";
import { GlobalReachSettings } from "./GlobalReachSettings";
import { CreateBrandVoiceModal } from "./CreateBrandVoiceModal";
import { StyleLabModal } from "./StyleLabModal";
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
  hideGenerateButton?: boolean;
  includeSocialProof?: boolean;
  setIncludeSocialProof?: (value: boolean) => void;
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
  hideGenerateButton = false,
  includeSocialProof = false,
  setIncludeSocialProof,
}: GenerationSettingsProps) {
  const { isPro, isAgency, isPaid } = useSubscription();
  const { hasCredits, creditsUsed, creditLimit, loading: creditsLoading } = useCredits();
  const [showSocialProofGate, setShowSocialProofGate] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showCreateVoiceModal, setShowCreateVoiceModal] = useState(false);
  const [showStyleLab, setShowStyleLab] = useState(false);
  const [fairUseConfirmed, setFairUseConfirmed] = useState(false);

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
      if (!isPro) {
        setShowPremiumModal(true);
        return;
      }
      setShowCreateVoiceModal(true);
      return;
    }

    if (value === "style_lab") {
      if (!isPro) {
        setShowPremiumModal(true);
        return;
      }
      setShowStyleLab(true);
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
              
              {/* Create / Train Options */}
              <SelectSeparator />
              <SelectItem value="style_lab" className="text-primary">
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4" />
                  Train from My Writing
                  {!isPro && <Crown className="h-3 w-3" />}
                </div>
              </SelectItem>
              <SelectItem value="create_new" className="text-primary">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Manually
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

        {/* Include Social Proof Toggle */}
        {setIncludeSocialProof && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              <div>
                <Label htmlFor="social-proof-toggle" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                  Include Social Proof
                  {!isPaid && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/50 text-primary">
                      <Crown className="h-3 w-3 mr-0.5" />
                      Starter
                    </Badge>
                  )}
                </Label>
                <p className="text-xs text-muted-foreground">
                  Weave featured testimonials into generated content
                </p>
              </div>
            </div>
            <Switch
              id="social-proof-toggle"
              checked={includeSocialProof}
              onCheckedChange={(checked) => {
                if (!isPaid && checked) {
                  setShowSocialProofGate(true);
                  return;
                }
                setIncludeSocialProof(checked);
              }}
            />
          </div>
        )}

        {/* Credits Exhausted Warning Banner */}
        {isCreditsExhausted && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-medium">0 credits remaining</span>
          </div>
        )}


        {/* Generate Button - hidden when used in bulk mode */}
        {!hideGenerateButton && (
          <>
            {/* Responsible Creation Checkbox */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <Checkbox
                id="fair-use-confirmation"
                checked={fairUseConfirmed}
                onCheckedChange={(checked) => setFairUseConfirmed(checked === true)}
                className="mt-0.5"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Label 
                    htmlFor="fair-use-confirmation" 
                    className="text-sm font-medium cursor-pointer leading-tight"
                  >
                    I confirm I have the right to use this content or am transforming it for Fair Use (commentary, education, or news reporting).
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="text-sm">
                          Fair Use generally allows summarizing others' work if you add your own unique value or commentary.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={onGenerate}
                disabled={!hasTranscript || isGenerating || isCreditsExhausted || !fairUseConfirmed}
                className={`w-full ${
                  isCreditsExhausted 
                    ? "bg-muted text-muted-foreground cursor-not-allowed" 
                    : !fairUseConfirmed
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
          </>
        )}
      </CardContent>

      <PremiumModal 
        open={showPremiumModal} 
        onOpenChange={setShowPremiumModal}
        feature={isCreditsExhausted ? "generation-limit" : "brand-voice"}
      />

      <PremiumModal
        open={showSocialProofGate}
        onOpenChange={setShowSocialProofGate}
        feature="social-proof"
      />
      
      <CreateBrandVoiceModal
        open={showCreateVoiceModal}
        onOpenChange={setShowCreateVoiceModal}
        onVoiceCreated={handleVoiceCreated}
      />

      <StyleLabModal
        open={showStyleLab}
        onOpenChange={setShowStyleLab}
        onVoiceCreated={handleVoiceCreated}
      />
    </Card>
  );
}
