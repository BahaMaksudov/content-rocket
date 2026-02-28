import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "./CopyButton";

interface CaptionsSectionProps {
  overlays: string[];
  socialCaption: string;
  hashtags: string[];
}

export function CaptionsSection({ overlays, socialCaption, hashtags }: CaptionsSectionProps) {
  const fullCaption = `${socialCaption}\n\n${hashtags.join(" ")}`;

  return (
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
            <Badge
              key={i}
              variant="secondary"
              className="text-sm font-bold tracking-wide px-3 py-1.5 uppercase"
            >
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
  );
}
