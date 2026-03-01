import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCw } from "lucide-react";
import { CopyButton } from "./CopyButton";
import type { HookOption } from "./types";

interface HookLabProps {
  hooks: HookOption[];
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export function HookLab({ hooks, onRegenerate, isRegenerating }: HookLabProps) {
  const [selectedId, setSelectedId] = useState<number>(hooks[0]?.id ?? 1);

  return (
    <Card className="border-border bg-card relative">
      {isRegenerating && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-sm rounded-[inherit]">
          <div className="text-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Regenerating hooks…</p>
          </div>
        </div>
      )}
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          <span className="flex items-center gap-2"><span>🎣</span> Hook Lab</span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">Click a hook to select it for your video</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {hooks.map((hook) => {
          const isSelected = hook.id === selectedId;
          return (
            <button
              key={hook.id}
              onClick={() => setSelectedId(hook.id)}
              className={`w-full text-left rounded-lg border p-3 transition-all duration-200 ${
                isSelected
                  ? "border-cyan-500 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                  : "border-border bg-muted/20 hover:border-muted-foreground/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {hook.style}
                  </Badge>
                  <p className="text-sm leading-relaxed">{hook.text}</p>
                </div>
                <CopyButton text={hook.text} className="shrink-0 mt-0.5" />
              </div>
            </button>
          );
        })}

        {onRegenerate && (
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="w-full gap-2 text-muted-foreground hover:text-foreground"
            >
              <RotateCw className="h-4 w-4" />
              🔄 Regenerate Hooks
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
