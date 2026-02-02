// Re-export the new BulkWorkspace for backwards compatibility
// This file is kept for any existing imports

import { BulkWorkspace } from "./bulk";

interface BulkUploadProps {
  tone?: string;
  audience?: string;
  brandVoice?: any;
  targetLanguage?: string;
}

export function BulkUpload({ tone, audience, brandVoice, targetLanguage }: BulkUploadProps) {
  // The new BulkWorkspace handles all settings internally
  // We pass through any external settings for compatibility
  return (
    <BulkWorkspace
      tone={tone}
      audience={audience}
      targetLanguage={targetLanguage}
    />
  );
}
