import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SceneBlueprintFooter } from "./SceneBlueprintFooter";
import type { SceneRow, ViralScriptResult, Duration, Tone, Platform } from "./types";
import { useIsMobile } from "@/hooks/use-mobile";

interface SceneBreakdownProps {
  scenes: SceneRow[];
  selectedDuration: Duration;
  topic: string;
  tone: Tone;
  platform: Platform;
  result: ViralScriptResult;
}

function highlightVisualKeywords(text: string) {
  // Highlight bracketed keywords like [B-Roll], [Text Overlay: ...]
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((part, i) =>
    part.startsWith("[") && part.endsWith("]") ? (
      <span key={i} className="text-cyan-400 font-medium">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function SceneBreakdown({ scenes, selectedDuration, topic, tone, platform, result }: SceneBreakdownProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <span>🎬</span> Scene-by-Scene Blueprint
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {scenes.map((scene, i) => (
            <div key={i} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                  ⏱️ {scene.time}
                </span>
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                <span className="text-muted-foreground text-xs font-medium block mb-1">🎙️ Dialogue</span>
                {scene.script}
              </div>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                <span className="text-muted-foreground text-xs font-medium block mb-1">🎬 Visuals</span>
                {highlightVisualKeywords(scene.visual)}
              </div>
            </div>
          ))}
        </CardContent>
        <SceneBlueprintFooter
          scenes={scenes}
          selectedDuration={selectedDuration}
          topic={topic}
          tone={tone}
          platform={platform}
          result={result}
        />
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <span>🎬</span> Scene-by-Scene Blueprint
          </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-[100px]">⏱️ Timing</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">🎙️ Dialogue</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-[35%]">🎬 Visuals</th>
            </tr>
          </thead>
          <tbody>
            {scenes.map((scene, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-cyan-400 whitespace-nowrap align-top">
                  {scene.time}
                </td>
                <td className="px-4 py-3 leading-relaxed align-top whitespace-pre-wrap">
                  {scene.script}
                </td>
                <td className="px-4 py-3 text-muted-foreground align-top whitespace-pre-wrap">
                  {highlightVisualKeywords(scene.visual)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
      <SceneBlueprintFooter
        scenes={scenes}
        selectedDuration={selectedDuration}
        topic={topic}
        tone={tone}
        platform={platform}
        result={result}
      />
    </Card>
  );
}
