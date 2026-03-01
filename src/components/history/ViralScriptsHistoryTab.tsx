import { useState, useSyncExternalStore } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Sparkles, Trash2 } from "lucide-react";
import { HookLab } from "@/components/dashboard/viral/HookLab";
import { SceneBreakdown } from "@/components/dashboard/viral/SceneBreakdown";
import { CaptionsSection } from "@/components/dashboard/viral/CaptionsSection";
import type { ViralHistoryEntry } from "@/components/dashboard/viral/SceneBlueprintFooter";
import { loadViralHistory } from "@/components/dashboard/viral/SceneBlueprintFooter";
import { PLATFORM_OPTIONS, TONE_OPTIONS } from "@/components/dashboard/viral/types";

// Subscribe to localStorage changes so the list updates immediately after save
const VIRAL_HISTORY_KEY = "vidlogic_viral_history";

function subscribeToStorage(cb: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === VIRAL_HISTORY_KEY) cb();
  };
  window.addEventListener("storage", handler);
  // Also listen for custom event for same-tab updates
  window.addEventListener("viral-history-updated", cb);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("viral-history-updated", cb);
  };
}

let snapshotCache: ViralHistoryEntry[] = loadViralHistory();
function getSnapshot() {
  const raw = localStorage.getItem(VIRAL_HISTORY_KEY);
  const parsed = raw ? JSON.parse(raw) : [];
  // Only update reference if content changed
  if (JSON.stringify(parsed) !== JSON.stringify(snapshotCache)) {
    snapshotCache = parsed;
  }
  return snapshotCache;
}

export function ViralScriptsHistoryTab() {
  const { toast } = useToast();
  const entries = useSyncExternalStore(subscribeToStorage, getSnapshot);
  const [selectedEntry, setSelectedEntry] = useState<ViralHistoryEntry | null>(null);

  const handleDelete = (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    localStorage.setItem(VIRAL_HISTORY_KEY, JSON.stringify(updated));
    snapshotCache = updated;
    window.dispatchEvent(new Event("viral-history-updated"));
    toast({ title: "Script deleted" });
    setSelectedEntry(null);
  };

  if (!entries.length) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-12 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-2">No saved scripts yet</h3>
          <p className="text-muted-foreground mb-4">
            Generate a viral script and click "Save to History" to see it here
          </p>
          <Button variant="outline" onClick={() => window.location.href = "/dashboard"}>
            Go to Viral Script Generator
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getPlatformLabel = (value: string) => PLATFORM_OPTIONS.find((p) => p.value === value)?.label || value;
  const getToneLabel = (value: string) => TONE_OPTIONS.find((t) => t.value === value)?.label || value;

  return (
    <>
      <div className="space-y-4">
        {entries.map((entry) => (
          <Card
            key={entry.id}
            className="border-border bg-card hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => setSelectedEntry(entry)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1 line-clamp-1">{entry.topic}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {formatDistanceToNow(new Date(entry.savedAt), { addSuffix: true })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{entry.duration}</Badge>
                    <Badge variant="outline">{getToneLabel(entry.tone)}</Badge>
                    <Badge variant="outline">{getPlatformLabel(entry.platform)}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="pr-8">{selectedEntry?.topic}</DialogTitle>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{selectedEntry.duration}</Badge>
                <Badge variant="outline">{getToneLabel(selectedEntry.tone)}</Badge>
                <Badge variant="outline">{getPlatformLabel(selectedEntry.platform)}</Badge>
              </div>

              <HookLab hooks={selectedEntry.result.hooks} />
              <SceneBreakdown
                scenes={selectedEntry.result.scenes}
                selectedDuration={selectedEntry.duration}
                topic={selectedEntry.topic}
                tone={selectedEntry.tone}
                platform={selectedEntry.platform}
                result={selectedEntry.result}
                hideSave
              />
              <CaptionsSection
                overlays={selectedEntry.result.overlays}
                socialCaption={selectedEntry.result.socialCaption}
                hashtags={selectedEntry.result.hashtags}
              />
            </div>
          )}

          <div className="flex justify-end mt-4 pt-4 border-t border-border">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDelete(selectedEntry!.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
