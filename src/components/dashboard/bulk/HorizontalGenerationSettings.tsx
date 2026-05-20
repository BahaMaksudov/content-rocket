import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Mic, Globe, Users, MessageSquare, Plus, Crown } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { PremiumModal } from "@/components/PremiumModal";
import { CreateBrandVoiceModal } from "../CreateBrandVoiceModal";
import { DEFAULT_BRAND_VOICES, isDefaultVoiceId } from "@/lib/default-brand-voices";
import { Link } from "react-router-dom";

interface BrandVoice {
  id: string;
  name: string;
  description: string | null;
}

interface HorizontalGenerationSettingsProps {
  brandVoices: BrandVoice[];
  selectedBrandVoice: string | null;
  setSelectedBrandVoice: (id: string | null) => void;
  tone: string;
  setTone: (tone: string) => void;
  audience: string;
  setAudience: (audience: string) => void;
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

const languages = [
  { value: "english", label: "English", flag: "🇺🇸" },
  { value: "spanish", label: "Spanish", flag: "🇪🇸" },
  { value: "hindi", label: "Hindi", flag: "🇮🇳" },
  { value: "mandarin", label: "Mandarin", flag: "🇨🇳" },
  { value: "uzbek", label: "Uzbek", flag: "🇺🇿" },
  { value: "russian", label: "Russian", flag: "🇷🇺" },
  { value: "french", label: "French", flag: "🇫🇷" },
  { value: "german", label: "German", flag: "🇩🇪" },
  { value: "portuguese", label: "Portuguese", flag: "🇵🇹" },
  { value: "japanese", label: "Japanese", flag: "🇯🇵" },
  { value: "korean", label: "Korean", flag: "🇰🇷" },
];

export function HorizontalGenerationSettings({
  brandVoices,
  selectedBrandVoice,
  setSelectedBrandVoice,
  tone,
  setTone,
  audience,
  setAudience,
  targetLanguage,
  setTargetLanguage,
}: HorizontalGenerationSettingsProps) {
  const { isPro } = useSubscription();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showCreateVoiceModal, setShowCreateVoiceModal] = useState(false);

  const handleBrandVoiceChange = (value: string) => {
    if (value === "create_new") {
      if (!isPro) {
        setShowPremiumModal(true);
        return;
      }
      setShowCreateVoiceModal(true);
      return;
    }
    
    if (!isPro && !isDefaultVoiceId(value) && value !== "none") {
      setShowPremiumModal(true);
      return;
    }
    
    setSelectedBrandVoice(value === "none" ? null : value);
  };

  const handleVoiceCreated = (voiceId: string) => {
    setSelectedBrandVoice(voiceId);
  };

  const getSelectedVoiceName = () => {
    if (!selectedBrandVoice) return "Default";
    const defaultVoice = DEFAULT_BRAND_VOICES.find(v => v.id === selectedBrandVoice);
    if (defaultVoice) return defaultVoice.name;
    const userVoice = brandVoices.find(v => v.id === selectedBrandVoice);
    if (userVoice) return userVoice.name;
    return "Default";
  };

  return (
    <>
      <div className="w-full p-4 bg-muted/30 rounded-lg border border-border">
        <div className="flex flex-wrap items-end gap-4">

          {/* Tone */}
          <div className="flex-1 min-w-[140px] space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              Tone
            </Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="h-9 bg-background">
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
          <div className="flex-1 min-w-[140px] space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              Audience
            </Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger className="h-9 bg-background">
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

          {/* Language */}
          <div className="flex-1 min-w-[140px] space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Globe className="h-3 w-3" />
              Language
            </Label>
            <Select value={targetLanguage} onValueChange={setTargetLanguage}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    <span className="flex items-center gap-2">
                      <span>{l.flag}</span>
                      <span>{l.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </div>
      </div>

      <PremiumModal 
        open={showPremiumModal} 
        onOpenChange={setShowPremiumModal}
        feature="brand-voice"
      />
      
      <CreateBrandVoiceModal
        open={showCreateVoiceModal}
        onOpenChange={setShowCreateVoiceModal}
        onVoiceCreated={handleVoiceCreated}
      />
    </>
  );
}
