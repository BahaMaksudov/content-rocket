import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface BatchJob {
  id: string;
  user_id: string;
  organization_id: string | null;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  total_videos: number;
  completed_videos: number;
  failed_videos: number;
  video_urls: Array<{
    videoId: string;
    url: string;
    status: string;
    title: string | null;
    error: string | null;
    generationId?: string | null;
  }>;
  results: any[];
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export function useBulkProcess() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Track previously active job to detect completion
  const prevActiveJobRef = useRef<string | null>(null);

  // Get recent batch jobs
  const { data: batchJobs, isLoading } = useQuery({
    queryKey: ["batch-jobs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("batch_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as BatchJob[];
    },
    enabled: !!user,
    refetchInterval: (query) => {
      // Refetch every 3 seconds if there's an active job
      const hasActiveJob = query.state.data?.some(
        (job) => job.status === "pending" || job.status === "processing"
      );
      return hasActiveJob ? 3000 : false;
    },
  });
  
  // Detect when a batch job completes and refresh generations
  const activeJob = batchJobs?.find(
    (job) => job.status === "pending" || job.status === "processing"
  );
  
  useEffect(() => {
    const currentActiveId = activeJob?.id || null;
    const prevActiveId = prevActiveJobRef.current;
    
    // If we had an active job and now we don't, the job completed
    if (prevActiveId && !currentActiveId) {
      // Find the job that just completed
      const completedJob = batchJobs?.find(job => job.id === prevActiveId);
      
      if (completedJob) {
        // Invalidate generations query so History page shows new content
        queryClient.invalidateQueries({ queryKey: ["generations"] });
        
        // Show completion toast with summary
        if (completedJob.status === "completed") {
          toast({
            title: "🎉 Batch processing complete!",
            description: `${completedJob.completed_videos} video(s) processed successfully. View them in History.`,
          });
        } else if (completedJob.status === "failed" && completedJob.completed_videos > 0) {
          toast({
            title: "Batch processing finished",
            description: `${completedJob.completed_videos} succeeded, ${completedJob.failed_videos} failed. Check History for results.`,
          });
        }
      }
    }
    
    prevActiveJobRef.current = currentActiveId;
  }, [activeJob?.id, batchJobs, queryClient, toast]);

  // Get a specific batch job
  const getBatchJob = (batchId: string) => {
    return batchJobs?.find((job) => job.id === batchId);
  };

  // Start bulk processing
  const startBulkProcess = useMutation({
    mutationFn: async ({
      urls,
      playlistUrl,
      tone,
      audience,
      brandVoice,
      translateTo,
    }: {
      urls?: string[];
      playlistUrl?: string;
      tone?: string;
      audience?: string;
      brandVoice?: any;
      translateTo?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("bulk-process", {
        body: { urls, playlistUrl, tone, audience, brandVoice, translateTo },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["batch-jobs"] });
      toast({
        title: "Bulk processing started",
        description: `Processing ${data.totalVideos} videos in the background`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to start bulk processing",
        description: error.message,
      });
    },
  });

  // Cancel a batch job
  const cancelBatchJob = useMutation({
    mutationFn: async (batchId: string) => {
      const { error } = await supabase
        .from("batch_jobs")
        .update({ status: "cancelled" })
        .eq("id", batchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batch-jobs"] });
      toast({ title: "Batch job cancelled" });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to cancel",
        description: error.message,
      });
    },
  });

  return {
    batchJobs,
    activeJob,
    isLoading,
    startBulkProcess,
    cancelBatchJob,
    getBatchJob,
  };
}
