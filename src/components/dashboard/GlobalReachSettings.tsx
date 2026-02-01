import { Globe, Languages } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GlobalReachSettingsProps {
  language: string;
  onLanguageChange: (language: string) => void;
}

const languages = [
  { value: "english", label: "English", flag: "🇺🇸" },
  { value: "spanish", label: "Spanish", flag: "🇪🇸" },
  { value: "hindi", label: "Hindi", flag: "🇮🇳" },
  { value: "mandarin", label: "Mandarin", flag: "🇨🇳" },
  { value: "uzbek", label: "Uzbek", flag: "🇺🇿" },
  { value: "russian", label: "Russian", flag: "🇷🇺" },
];

export function GlobalReachSettings({
  language,
  onLanguageChange,
}: GlobalReachSettingsProps) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Languages className="h-4 w-4 text-primary" />
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
        All content will be generated in the selected language
      </p>
    </div>
  );
}
