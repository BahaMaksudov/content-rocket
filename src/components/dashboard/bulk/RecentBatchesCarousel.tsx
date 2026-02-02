import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2,
  Eye,
  Video,
  Calendar,
  History
} from "lucide-react";
import { BatchJob } from "@/hooks/use-bulk-process";

interface RecentBatchesCarouselProps {
  batchJobs: BatchJob[];
  selectedBatchId: string | null;
  onSelectBatch: (batchId: string) => void;
  isLoading?: boolean;
}

export function RecentBatchesCarousel({ 
  batchJobs, 
  selectedBatchId, 
  onSelectBatch,
  isLoading 
}: RecentBatchesCarouselProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "border-primary/30 bg-primary/5";
      case "failed":
        return "border-destructive/30 bg-destructive/5";
      case "processing":
        return "border-primary/50 bg-primary/10";
      default:
        return "border-border bg-muted/30";
    }
  };

  // Only show completed and failed batches (historical)
  const historicalBatches = batchJobs.filter(
    job => job.status === "completed" || job.status === "failed" || job.status === "cancelled"
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (historicalBatches.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-muted mb-3">
          <History className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">
          No batch history yet. Start processing to see your results here.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Recent Batches</h3>
        </div>
        <Badge variant="outline">
          {historicalBatches.length} batch{historicalBatches.length !== 1 ? "es" : ""}
        </Badge>
      </div>
      
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-4">
          {historicalBatches.map((job) => (
            <Card
              key={job.id}
              onClick={() => onSelectBatch(job.id)}
              className={`flex-shrink-0 w-[220px] cursor-pointer transition-all hover:shadow-lg ${
                selectedBatchId === job.id
                  ? "ring-2 ring-primary border-primary shadow-md"
                  : getStatusColor(job.status)
              }`}
            >
              <div className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  {getStatusIcon(job.status)}
                  <Badge 
                    variant={job.status === "completed" ? "default" : job.status === "failed" ? "destructive" : "secondary"} 
                    className="capitalize text-xs"
                  >
                    {job.status}
                  </Badge>
                </div>

                {/* Video count */}
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">
                    {job.total_videos} video{job.total_videos !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-sm">
                  {job.completed_videos > 0 && (
                    <span className="text-primary font-medium">{job.completed_videos} ✓</span>
                  )}
                  {job.failed_videos > 0 && (
                    <span className="text-destructive font-medium">{job.failed_videos} ✗</span>
                  )}
                </div>

                {/* Date */}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                </div>

                {/* View indicator */}
                {selectedBatchId === job.id && (
                  <div className="flex items-center gap-1.5 text-sm text-primary pt-2 border-t border-border font-medium">
                    <Eye className="h-4 w-4" />
                    Currently Viewing
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
