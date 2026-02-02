import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { 
  History, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2,
  Eye,
  Calendar,
  Video
} from "lucide-react";
import { BatchJob } from "@/hooks/use-bulk-process";

interface BatchHistoryPanelProps {
  batchJobs: BatchJob[];
  selectedBatchId: string | null;
  onSelectBatch: (batchId: string) => void;
  isLoading?: boolean;
}

export function BatchHistoryPanel({ 
  batchJobs, 
  selectedBatchId, 
  onSelectBatch,
  isLoading 
}: BatchHistoryPanelProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "pending":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      processing: "secondary",
      pending: "outline",
      failed: "destructive",
      cancelled: "outline",
    };

    return (
      <Badge variant={variants[status] || "outline"} className="capitalize text-[10px]">
        {status}
      </Badge>
    );
  };

  // Only show completed and failed batches (not active ones)
  const historicalBatches = batchJobs.filter(
    job => job.status === "completed" || job.status === "failed" || job.status === "cancelled"
  );

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Batch History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : historicalBatches.length === 0 ? (
          <div className="p-6 text-center">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
              <History className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No batch history yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px]">
            <div className="space-y-1 p-2">
              {historicalBatches.map((job) => (
                <button
                  key={job.id}
                  onClick={() => onSelectBatch(job.id)}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    selectedBatchId === job.id
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-muted/30 hover:bg-muted/50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {getStatusIcon(job.status)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Video className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium text-sm">
                            {job.total_videos} video{job.total_videos !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(job.status)}
                      <div className="flex items-center gap-2 text-xs">
                        {job.completed_videos > 0 && (
                          <span className="text-primary font-medium">
                            {job.completed_videos} ✓
                          </span>
                        )}
                        {job.failed_videos > 0 && (
                          <span className="text-destructive font-medium">
                            {job.failed_videos} ✗
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {selectedBatchId === job.id && (
                    <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-1 text-xs text-primary">
                      <Eye className="h-3 w-3" />
                      Viewing
                    </div>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
