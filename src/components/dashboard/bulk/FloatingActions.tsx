import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, Share2, Loader2 } from "lucide-react";
import { BatchJob } from "@/hooks/use-bulk-process";
import { useState } from "react";

interface FloatingActionsProps {
  batchJob: BatchJob | null;
  hasContent: boolean;
}

export function FloatingActions({ batchJob, hasContent }: FloatingActionsProps) {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleBulkDownload = async () => {
    if (!batchJob || !hasContent) return;
    
    setIsDownloading(true);
    
    // Simulate download - in production, this would compile all content
    setTimeout(() => {
      toast({
        title: "Download started",
        description: "Your content is being compiled into a ZIP file.",
      });
      setIsDownloading(false);
    }, 1500);
  };

  const handlePublishAll = () => {
    toast({
      title: "Coming soon",
      description: "Publishing integration will be available in the next update.",
    });
  };

  if (!hasContent || !batchJob || batchJob.status !== "completed") {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleBulkDownload}
        disabled={isDownloading}
        className="gap-2 bg-background/95 backdrop-blur shadow-lg border-border"
      >
        {isDownloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Download All
      </Button>
      
      <Button
        size="sm"
        onClick={handlePublishAll}
        className="gap-2 shadow-lg"
      >
        <Share2 className="h-4 w-4" />
        Publish All
      </Button>
    </div>
  );
}
