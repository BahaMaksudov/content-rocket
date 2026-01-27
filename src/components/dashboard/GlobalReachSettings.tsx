import { Globe, Languages } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GlobalReachSettingsProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  language: string;
  onLanguageChange: (language: string) => void;
}

const languages = [
  { value: "spanish", label: "Spanish", flag: "🇪🇸" },
  { value: "hindi", label: "Hindi", flag: "🇮🇳" },
  { value: "mandarin", label: "Mandarin", flag: "🇨🇳" },
  { value: "uzbek", label: "Uzbek", flag: "🇺🇿" },
  { value: "russian", label: "Russian", flag: "🇷🇺" },
];

export function GlobalReachSettings({
  enabled,
  onEnabledChange,
  language,
  onLanguageChange,
}: GlobalReachSettingsProps) {
  return (
    <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 cursor-pointer">
          <Globe className="h-4 w-4 text-primary" />
          Global Reach
        </Label>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </div>
      
      {enabled && (
        <div className="space-y-2 pt-2 border-t border-border">
          <Label className="flex items-center gap-2 text-sm">
            <Languages className="h-3 w-3" />
            Target Language
          </Label>
          <Select value={language} onValueChange={onLanguageChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  <span className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            All content will be translated while preserving your brand voice
          </p>
        </div>
      )}
    </div>
  );
}
