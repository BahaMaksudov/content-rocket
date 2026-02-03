import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, Share2, Loader2 } from "lucide-react";
import { BatchJob } from "@/hooks/use-bulk-process";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";

interface FloatingActionsProps {
  batchJob: BatchJob | null;
  hasContent: boolean;
}

interface Generation {
  id: string;
  video_title: string | null;
  twitter_hooks: unknown;
  linkedin_post: string | null;
  short_form_scripts: unknown;
  blog_post: string | null;
  youtube_url: string | null;
}

function parseTwitterHooks(hooks: unknown): string[] | null {
  if (Array.isArray(hooks) && hooks.every((h) => typeof h === "string")) {
    return hooks;
  }
  return null;
}

function parseShortFormScripts(scripts: unknown): Array<{ title: string; script: string; duration: string }> | null {
  if (Array.isArray(scripts)) {
    return scripts.filter(
      (s) => typeof s === "object" && s !== null && "title" in s && "script" in s && "duration" in s,
    ) as Array<{ title: string; script: string; duration: string }>;
  }
  return null;
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-z0-9\s-]/gi, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
}

export function FloatingActions({ batchJob, hasContent }: FloatingActionsProps) {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleBulkDownload = async () => {
    if (!batchJob || !hasContent) return;
    
    setIsDownloading(true);
    
    toast({
      title: "Compiling content...",
      description: "Preparing your ZIP file for download.",
    });

    try {
      // Get all generation IDs from the batch job
      const generationIds = batchJob.video_urls
        .filter(v => v.generationId)
        .map(v => v.generationId as string);

      if (generationIds.length === 0) {
        toast({
          title: "No content to download",
          description: "There are no completed generations in this batch.",
          variant: "destructive",
        });
        setIsDownloading(false);
        return;
      }

      // Fetch all generations
      const { data: generations, error } = await supabase
        .from("generations")
        .select("id, video_title, twitter_hooks, linkedin_post, short_form_scripts, blog_post, youtube_url")
        .in("id", generationIds);

      if (error) throw error;

      if (!generations || generations.length === 0) {
        toast({
          title: "No content found",
          description: "Could not find any generated content.",
          variant: "destructive",
        });
        setIsDownloading(false);
        return;
      }

      // Create ZIP file
      const zip = new JSZip();
      
      // Create a folder for each video
      generations.forEach((gen: Generation, index: number) => {
        const videoTitle = gen.video_title || `Video_${index + 1}`;
        const folderName = sanitizeFilename(videoTitle);
        const folder = zip.folder(folderName);
        
        if (!folder) return;

        // Add Twitter/X hooks
        const twitterHooks = parseTwitterHooks(gen.twitter_hooks);
        if (twitterHooks && twitterHooks.length > 0) {
          const twitterContent = twitterHooks.map((hook, i) => `--- Tweet ${i + 1} ---\n\n${hook}`).join('\n\n\n');
          folder.file("twitter_x_thread.txt", `# Twitter/X Thread for: ${videoTitle}\n\n${twitterContent}`);
        }

        // Add LinkedIn post
        if (gen.linkedin_post) {
          folder.file("linkedin_post.txt", `# LinkedIn Post for: ${videoTitle}\n\n${gen.linkedin_post}`);
        }

        // Add Short form scripts
        const shortFormScripts = parseShortFormScripts(gen.short_form_scripts);
        if (shortFormScripts && shortFormScripts.length > 0) {
          const scriptsContent = shortFormScripts.map((script, i) => 
            `--- Script ${i + 1}: ${script.title} ---\nDuration: ${script.duration}\n\n${script.script}`
          ).join('\n\n\n');
          folder.file("tiktok_shorts_scripts.txt", `# TikTok/Shorts Scripts for: ${videoTitle}\n\n${scriptsContent}`);
        }

        // Add Blog post
        if (gen.blog_post) {
          folder.file("blog_post.md", `# Blog Post for: ${videoTitle}\n\n${gen.blog_post}`);
        }

        // Add metadata file
        const metadata = {
          video_title: videoTitle,
          youtube_url: gen.youtube_url,
          generated_at: new Date().toISOString(),
          content_types: {
            twitter_hooks: twitterHooks?.length || 0,
            linkedin_post: gen.linkedin_post ? 1 : 0,
            short_form_scripts: shortFormScripts?.length || 0,
            blog_post: gen.blog_post ? 1 : 0,
          }
        };
        folder.file("metadata.json", JSON.stringify(metadata, null, 2));
      });

      // Generate and download the ZIP
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `batch_content_${batchJob.id.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download complete!",
        description: `Successfully downloaded ${generations.length} video content packages.`,
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "There was an error creating your ZIP file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
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
        {isDownloading ? "Creating ZIP..." : "Download All"}
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
