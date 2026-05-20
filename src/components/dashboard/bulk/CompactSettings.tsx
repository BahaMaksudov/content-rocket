import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Settings2, Mic, Globe, Users, MessageSquare, Plus, Crown } from "lucide-react";
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

interface CompactSettingsProps {
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
  { value: "english", label: "English" },
  { value: "spanish", label: "Spanish" },
  { value: "french", label: "French" },
  { value: "german", label: "German" },
  { value: "portuguese", label: "Portuguese" },
  { value: "italian", label: "Italian" },
  { value: "dutch", label: "Dutch" },
  { value: "japanese", label: "Japanese" },
  { value: "korean", label: "Korean" },
  { value: "chinese", label: "Chinese (Simplified)" },
];

export function CompactSettings({
  brandVoices,
  selectedBrandVoice,
  setSelectedBrandVoice,
  tone,
  setTone,
  audience,
  setAudience,
  targetLanguage,
  setTargetLanguage,
}: CompactSettingsProps) {
  const { isPro } = useSubscription();
  const [isOpen, setIsOpen] = useState(false);
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

  const getToneLabel = () => tones.find(t => t.value === tone)?.label || "Professional";
  const getAudienceLabel = () => audiences.find(a => a.value === audience)?.label || "General";
  const getLanguageLabel = () => languages.find(l => l.value === targetLanguage)?.label || "English";

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border border-border rounded-lg bg-muted/30">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-4 h-auto hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              <span className="font-medium">Generation Settings</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Quick summary badges */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {getToneLabel()}
                </Badge>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {getLanguageLabel()}
                </Badge>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 border-t border-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">


              {/* Tone */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MessageSquare className="h-3 w-3" />
                  Tone
                </Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="h-9">
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
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  Audience
                </Label>
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger className="h-9">
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
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  Language
                </Label>
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-border/50">
              <Link
                to="/brand-voices"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Manage all voices →
              </Link>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

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
