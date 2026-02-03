import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBulkProcess } from "@/hooks/use-bulk-process";

import { FullWidthInput } from "./FullWidthInput";
import { ContentFocusedViewer } from "./ContentFocusedViewer";
import { RecentBatchesCarousel } from "./RecentBatchesCarousel";
import { FloatingActions } from "./FloatingActions";

interface BrandVoice {
  id: string;
  name: string;
  description: string | null;
}

interface BulkWorkspaceProps {
  tone?: string;
  setTone?: (tone: string) => void;
  audience?: string;
  setAudience?: (audience: string) => void;
  targetLanguage?: string;
  setTargetLanguage?: (language: string) => void;
  selectedBrandVoice?: string | null;
  setSelectedBrandVoice?: (id: string | null) => void;
  brandVoices?: BrandVoice[];
}

export function BulkWorkspace({
  tone: externalTone,
  setTone: externalSetTone,
  audience: externalAudience,
  setAudience: externalSetAudience,
  targetLanguage: externalTargetLanguage,
  setTargetLanguage: externalSetTargetLanguage,
  selectedBrandVoice: externalSelectedBrandVoice,
  setSelectedBrandVoice: externalSetSelectedBrandVoice,
  brandVoices: externalBrandVoices,
}: BulkWorkspaceProps) {
  const { user } = useAuth();
  const { batchJobs, activeJob, startBulkProcess, cancelBatchJob, isLoading } = useBulkProcess();
  
  // Internal state
  const [internalTone, setInternalTone] = useState("professional");
  const [internalAudience, setInternalAudience] = useState("general");
  const [internalTargetLanguage, setInternalTargetLanguage] = useState("english");
  const [internalSelectedBrandVoice, setInternalSelectedBrandVoice] = useState<string | null>("default_friendly_peer");
  
  // Use external props if provided
  const tone = externalTone ?? internalTone;
  const setTone = externalSetTone ?? setInternalTone;
  const audience = externalAudience ?? internalAudience;
  const setAudience = externalSetAudience ?? setInternalAudience;
  const targetLanguage = externalTargetLanguage ?? internalTargetLanguage;
  const setTargetLanguage = externalSetTargetLanguage ?? setInternalTargetLanguage;
  const selectedBrandVoice = externalSelectedBrandVoice ?? internalSelectedBrandVoice;
  const setSelectedBrandVoice = externalSetSelectedBrandVoice ?? setInternalSelectedBrandVoice;

  // Selected batch for viewing
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  // Fetch brand voices
  const { data: fetchedBrandVoices } = useQuery({
    queryKey: ["brand-voices", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_voices")
        .select("id, name, description")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BrandVoice[];
    },
    enabled: !!user && !externalBrandVoices,
  });

  const brandVoices = externalBrandVoices ?? fetchedBrandVoices ?? [];

  // Auto-select active job or most recent completed batch
  useEffect(() => {
    if (activeJob) {
      setSelectedBatchId(activeJob.id);
    } else if (!selectedBatchId && batchJobs && batchJobs.length > 0) {
      const completedBatch = batchJobs.find(j => j.status === "completed");
      if (completedBatch) {
        setSelectedBatchId(completedBatch.id);
      }
    }
  }, [activeJob, batchJobs, selectedBatchId]);

  // Handle batch selection - populates the content viewer immediately
  const handleSelectBatch = (batchId: string) => {
    setSelectedBatchId(batchId);
  };

  // Get selected batch
  const selectedBatch = batchJobs?.find(j => j.id === selectedBatchId) || activeJob || null;

  // Check if we have content for floating actions
  const hasContent = selectedBatch?.status === "completed" && (selectedBatch?.completed_videos || 0) > 0;

  const handleStartBulk = (urls?: string[], playlistUrl?: string) => {
    const brandVoiceObj = selectedBrandVoice 
      ? brandVoices.find(v => v.id === selectedBrandVoice) 
      : null;

    startBulkProcess.mutate({
      urls,
      playlistUrl,
      tone,
      audience,
      brandVoice: brandVoiceObj,
      translateTo: targetLanguage !== "english" ? targetLanguage : undefined,
    });
  };

  return (
    <div className="flex flex-col w-full space-y-6 pb-24">
      {/* Phase 1: The Header - Full Width Input & Generation Settings */}
      <section className="w-full">
        <FullWidthInput
          onStartBulk={handleStartBulk}
          isPending={startBulkProcess.isPending}
          activeJob={activeJob || null}
          onCancel={() => activeJob && cancelBatchJob.mutate(activeJob.id)}
          isCancelling={cancelBatchJob.isPending}
          tone={tone}
          setTone={setTone}
          audience={audience}
          setAudience={setAudience}
          targetLanguage={targetLanguage}
          setTargetLanguage={setTargetLanguage}
          brandVoices={brandVoices}
          selectedBrandVoice={selectedBrandVoice}
          setSelectedBrandVoice={setSelectedBrandVoice}
        />
      </section>

      {/* Phase 2: The Primary Content Viewer - Hero Card (100% width) */}
      <section className="w-full">
        <ContentFocusedViewer
          batchJob={selectedBatch}
          isProcessing={activeJob?.id === selectedBatchId}
        />
      </section>

      {/* Phase 3: Horizontal Batch History - Bottom Section */}
      <section className="w-full border-t border-border pt-6">
        <RecentBatchesCarousel
          batchJobs={batchJobs || []}
          selectedBatchId={selectedBatchId}
          onSelectBatch={handleSelectBatch}
          isLoading={isLoading}
        />
      </section>

      {/* Floating Action Buttons - Bottom Right */}
      <FloatingActions
        batchJob={selectedBatch}
        hasContent={hasContent}
      />
    </div>
  );
}
