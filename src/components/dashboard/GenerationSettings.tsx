import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Sparkles, Crown, Rocket, AlertCircle, Info } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useCredits } from "@/hooks/use-credits";
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
  targetLanguage: string;
  setTargetLanguage: (language: string) => void;
  hideGenerateButton?: boolean;
  fairUseConfirmed?: boolean;
  setFairUseConfirmed?: (value: boolean) => void;
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
  fairUseConfirmed: externalFairUse,
  setFairUseConfirmed: externalSetFairUse,
}: GenerationSettingsProps) {
  const { isPro, isAgency, isPaid } = useSubscription();
  const { user } = useAuth();
  const { hasCredits, creditsUsed, creditLimit, loading: creditsLoading } = useCredits();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [internalFairUse, setInternalFairUse] = useState(false);
  const fairUseConfirmed = externalFairUse ?? internalFairUse;
  const setFairUseConfirmed = externalSetFairUse ?? setInternalFairUse;


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


        {/* Generate Button - hidden when used in bulk mode */}
        {!hideGenerateButton && (
          <>
            {/* Responsible Creation Checkbox */}
            <div className="flex items-center gap-3 py-1">
              <Checkbox
                id="fair-use-confirmation"
                checked={fairUseConfirmed}
                onCheckedChange={(checked) => setFairUseConfirmed(checked === true)}
              />
              <div className="flex items-center gap-1.5 flex-1">
                <Label 
                  htmlFor="fair-use-confirmation" 
                  className="text-sm text-muted-foreground cursor-pointer leading-tight"
                >
                  I confirm this usage falls under Fair Use (Commentary/Education).
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 cursor-help" />
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

            <div className="space-y-2">
              <Button
                onClick={onGenerate}
                disabled={!hasTranscript || isGenerating || isCreditsExhausted || !fairUseConfirmed}
                className={`w-full transition-all duration-300 ${
                  isCreditsExhausted || !fairUseConfirmed || !hasTranscript
                    ? "bg-[rgba(6,182,212,0.1)] text-muted-foreground border-2 border-[#06b6d44d] opacity-100"
                    : "!bg-[#06b6d4] !text-black font-bold shadow-[0_0_20px_rgba(6,182,212,0.6)]"
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

    </Card>
  );
}
