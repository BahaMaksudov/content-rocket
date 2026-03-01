import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCw } from "lucide-react";
import { CopyButton } from "./CopyButton";

interface CaptionsSectionProps {
  overlays: string[];
  socialCaption: string;
  hashtags: string[];
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export function CaptionsSection({ overlays, socialCaption, hashtags, onRegenerate, isRegenerating }: CaptionsSectionProps) {
  const fullCaption = `${socialCaption}\n\n${hashtags.join(" ")}`;

  return (
    <div className="relative">
      {isRegenerating && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-sm rounded-xl">
          <div className="text-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Regenerating captions…</p>
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* On-Screen Overlays */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <span>🎯</span> On-Screen Overlays
              </CardTitle>
              <CopyButton text={overlays.join("\n")} />
            </div>
            <p className="text-xs text-muted-foreground">Punchy text for video editors</p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {overlays.map((overlay, i) => (
              <Badge key={i} variant="secondary" className="text-sm font-bold tracking-wide px-3 py-1.5 uppercase">
                {overlay}
              </Badge>
            ))}
          </CardContent>
        </Card>

        {/* Social Metadata */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <span>🏷️</span> Social Metadata
              </CardTitle>
              <CopyButton text={fullCaption} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-relaxed">{socialCaption}</p>
            <div className="flex flex-wrap gap-1.5">
              {hashtags.map((tag, i) => (
                <span key={i} className="text-xs text-cyan-400">{tag}</span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {onRegenerate && (
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="w-full gap-2 text-muted-foreground hover:text-foreground"
          >
            <RotateCw className="h-4 w-4" />
            🔄 Regenerate Captions
          </Button>
        </div>
      )}
    </div>
  );
}
