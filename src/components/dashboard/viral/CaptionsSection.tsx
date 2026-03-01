import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RotateCw } from "lucide-react";
import { CopyButton } from "./CopyButton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
              <div className="flex items-center gap-1">
                <CopyButton text={overlays.join("\n")} />
                {onRegenerate && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={onRegenerate}
                          disabled={isRegenerating}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                        >
                          <RotateCw className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent><p>Regenerate Captions</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
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
    </div>
  );
}
