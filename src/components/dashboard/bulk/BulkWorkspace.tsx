import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBulkProcess, BatchJob } from "@/hooks/use-bulk-process";

import { CompactSettings } from "./CompactSettings";
import { BulkUploadInput } from "./BulkUploadInput";
import { BatchContentViewer } from "./BatchContentViewer";
import { BatchHistoryPanel } from "./BatchHistoryPanel";

interface BrandVoice {
  id: string;
  name: string;
  description: string | null;
}

interface BulkWorkspaceProps {
  // Settings from parent (for single video mode compatibility)
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
  
  // Internal state (used if external props not provided)
  const [internalTone, setInternalTone] = useState("professional");
  const [internalAudience, setInternalAudience] = useState("general");
  const [internalTargetLanguage, setInternalTargetLanguage] = useState("english");
  const [internalSelectedBrandVoice, setInternalSelectedBrandVoice] = useState<string | null>("default_friendly_peer");
  
  // Use external props if provided, otherwise use internal state
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

  // Fetch brand voices if not provided
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

  // Get selected batch
  const selectedBatch = batchJobs?.find(j => j.id === selectedBatchId) || activeJob || null;

  const handleStartBulk = (urls?: string[], playlistUrl?: string) => {
    // Find the brand voice object
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
    <div className="space-y-6">
      {/* Left Column: Upload & Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          {/* Bulk Upload Input */}
          <BulkUploadInput
            onStartBulk={handleStartBulk}
            isPending={startBulkProcess.isPending}
            activeJob={activeJob || null}
            onCancel={() => activeJob && cancelBatchJob.mutate(activeJob.id)}
            isCancelling={cancelBatchJob.isPending}
          />

          {/* Compact Settings */}
          <CompactSettings
            brandVoices={brandVoices}
            selectedBrandVoice={selectedBrandVoice}
            setSelectedBrandVoice={setSelectedBrandVoice}
            tone={tone}
            setTone={setTone}
            audience={audience}
            setAudience={setAudience}
            targetLanguage={targetLanguage}
            setTargetLanguage={setTargetLanguage}
          />

          {/* Batch History */}
          <BatchHistoryPanel
            batchJobs={batchJobs || []}
            selectedBatchId={selectedBatchId}
            onSelectBatch={setSelectedBatchId}
            isLoading={isLoading}
          />
        </div>

        {/* Right Column: Content Viewer */}
        <div className="lg:col-span-2">
          <BatchContentViewer
            batchJob={selectedBatch}
            isProcessing={activeJob?.id === selectedBatchId}
          />
        </div>
      </div>
    </div>
  );
}
