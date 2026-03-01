import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "./CopyButton";
import { AlertTriangle, Check, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SceneRow, ViralScriptResult, Duration, Tone, Platform } from "./types";

const VIRAL_HISTORY_KEY = "vidlogic_viral_history";
const MAX_HISTORY = 50;

export interface ViralHistoryEntry {
  id: string;
  savedAt: string;
  topic: string;
  duration: Duration;
  tone: Tone;
  platform: Platform;
  result: ViralScriptResult;
}

export function loadViralHistory(): ViralHistoryEntry[] {
  try {
    const raw = localStorage.getItem(VIRAL_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveViralHistoryEntry(entry: ViralHistoryEntry) {
  const history = loadViralHistory();
  history.unshift(entry);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  localStorage.setItem(VIRAL_HISTORY_KEY, JSON.stringify(history));
}

function parseTimeToSeconds(timeStr: string): number {
  // Handle MM:SS format like "0:07", "1:30"
  const mmssMatch = timeStr.match(/(\d+):(\d{2})/);
  if (mmssMatch) {
    return parseInt(mmssMatch[1], 10) * 60 + parseInt(mmssMatch[2], 10);
  }
  // Handle plain seconds like "15s", "15"
  const secMatch = timeStr.match(/(\d+)\s*s?/);
  if (secMatch) {
    return parseInt(secMatch[1], 10);
  }
  return 0;
}

function parseTotalDuration(scenes: SceneRow[]): number {
  let maxEnd = 0;
  for (const scene of scenes) {
    // Split on dash/en-dash to get end time
    const parts = scene.time.split(/[-–]/);
    const endStr = parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
    const endSec = parseTimeToSeconds(endStr);
    if (endSec > maxEnd) maxEnd = endSec;
  }
  return maxEnd;
}

interface SceneBlueprintFooterProps {
  scenes: SceneRow[];
  selectedDuration: Duration;
  topic: string;
  tone: Tone;
  platform: Platform;
  result: ViralScriptResult;
}

export function SceneBlueprintFooter({
  scenes,
  selectedDuration,
  topic,
  tone,
  platform,
  result,
}: SceneBlueprintFooterProps) {
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);

  const totalSeconds = useMemo(() => parseTotalDuration(scenes), [scenes]);
  const targetSeconds = parseInt(selectedDuration.replace("s", ""), 10);
  const isOvertime = totalSeconds > targetSeconds;

  const dialogueOnly = scenes.map((s) => s.script).join("\n\n");

  const handleSave = () => {
    const entry: ViralHistoryEntry = {
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      topic,
      duration: selectedDuration,
      tone,
      platform,
      result,
    };
    saveViralHistoryEntry(entry);
    setSaved(true);
    toast({ title: "Script saved to history!" });
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30 rounded-b-lg">
      {/* Left: Duration */}
      <div className={`flex items-center gap-2 text-sm font-medium ${isOvertime ? "text-amber-500" : "text-muted-foreground"}`}>
        {isOvertime && <AlertTriangle className="h-4 w-4" />}
        <span>
          Total Estimated Duration: {totalSeconds}s
          {isOvertime && " — Script may run long"}
        </span>
      </div>

      {/* Right: Save button only (copy moved to header) */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleSave}
          disabled={saved}
          className="gap-2"
        >
          {saved ? (
            <>
              <Check className="h-4 w-4" />
              Saved
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save to History
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
