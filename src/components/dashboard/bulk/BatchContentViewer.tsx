import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  ChevronLeft, 
  ChevronRight, 
  Copy, 
  Check, 
  Twitter, 
  Linkedin, 
  Film, 
  FileText,
  FileX,
  Loader2,
  Video
} from "lucide-react";
import { BatchJob } from "@/hooks/use-bulk-process";
import { trackCopyContent } from "@/lib/posthog";

interface BatchContentViewerProps {
  batchJob: BatchJob | null;
  isProcessing?: boolean;
}

interface Generation {
  id: string;
  video_title: string | null;
  twitter_hooks: unknown;
  linkedin_post: string | null;
  short_form_scripts: unknown;
  blog_post: string | null;
  target_language: string | null;
  youtube_url: string | null;
}

// Type guards for JSON fields
function parseTwitterHooks(hooks: unknown): string[] | null {
  if (Array.isArray(hooks) && hooks.every(h => typeof h === "string")) {
    return hooks;
  }
  return null;
}

function parseShortFormScripts(scripts: unknown): Array<{ title: string; script: string; duration: string }> | null {
  if (Array.isArray(scripts)) {
    return scripts.filter(s => 
      typeof s === "object" && s !== null && 
      "title" in s && "script" in s && "duration" in s
    ) as Array<{ title: string; script: string; duration: string }>;
  }
  return null;
}

function CopyButton({ text, contentType, platform }: { text: string; contentType?: string; platform?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    trackCopyContent(contentType || "content", platform);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button size="sm" variant="ghost" onClick={handleCopy}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

export function BatchContentViewer({ batchJob, isProcessing }: BatchContentViewerProps) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("twitter");

  // Get generation IDs from batch job
  const generationIds = batchJob?.video_urls
    ?.filter(v => v.status === "completed" && v.generationId)
    ?.map(v => v.generationId) || [];

  // Fetch generations for this batch
  const { data: generations, isLoading } = useQuery({
    queryKey: ["batch-generations", generationIds],
    queryFn: async () => {
      if (generationIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("generations")
        .select("*")
        .in("id", generationIds);
      
      if (error) throw error;
      return data as Generation[];
    },
    enabled: generationIds.length > 0,
  });

  // Reset index when batch changes
  useEffect(() => {
    setCurrentVideoIndex(0);
  }, [batchJob?.id]);

  const currentGeneration = generations?.[currentVideoIndex];
  const totalVideos = generations?.length || 0;
  const hasContent = totalVideos > 0;

  // Empty state
  if (!batchJob) {
    return (
      <Card className="border-border bg-card min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-3 p-8">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Video className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">No Batch Selected</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Start a new bulk upload or select a batch from history to view generated content
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Processing state
  if (isProcessing || batchJob.status === "processing" || batchJob.status === "pending") {
    return (
      <Card className="border-primary/50 bg-card min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div>
            <h3 className="font-semibold mb-1">Processing Batch...</h3>
            <p className="text-sm text-muted-foreground">
              {batchJob.completed_videos + batchJob.failed_videos} of {batchJob.total_videos} videos processed
            </p>
          </div>
          <div className="flex justify-center gap-4 text-sm">
            <span className="text-primary">{batchJob.completed_videos} completed</span>
            {batchJob.failed_videos > 0 && (
              <span className="text-destructive">{batchJob.failed_videos} failed</span>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // No content generated
  if (!hasContent && !isLoading) {
    return (
      <Card className="border-border bg-card min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-3 p-8">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <FileX className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">No Content Generated</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {batchJob.failed_videos > 0 
                ? `All ${batchJob.failed_videos} video(s) failed to process. Check the video URLs and try again.`
                : "No videos were processed in this batch."
              }
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="border-border bg-card min-h-[400px]">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      {/* Pagination Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Content Preview
          </CardTitle>
          
          {/* Pagination Controls */}
          {totalVideos > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentVideoIndex(prev => Math.max(0, prev - 1))}
                disabled={currentVideoIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Previous</span>
              </Button>
              
              <Badge variant="secondary" className="px-3 py-1">
                Video {currentVideoIndex + 1} of {totalVideos}
              </Badge>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentVideoIndex(prev => Math.min(totalVideos - 1, prev + 1))}
                disabled={currentVideoIndex === totalVideos - 1}
              >
                <span className="hidden sm:inline mr-1">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        {/* Video Title */}
        {currentGeneration && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
            {currentGeneration.video_title || "Untitled Video"}
          </p>
        )}
      </CardHeader>

      <CardContent>
        {currentGeneration && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="twitter" className="flex items-center gap-1.5 bg-slate-800/50 text-slate-400 hover:text-slate-200 data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                <Twitter className="h-4 w-4" />
                <span className="hidden sm:inline">Hooks</span>
              </TabsTrigger>
              <TabsTrigger value="linkedin" className="flex items-center gap-1.5 bg-slate-800/50 text-slate-400 hover:text-slate-200 data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                <Linkedin className="h-4 w-4" />
                <span className="hidden sm:inline">LinkedIn</span>
              </TabsTrigger>
              <TabsTrigger value="shorts" className="flex items-center gap-1.5 bg-slate-800/50 text-slate-400 hover:text-slate-200 data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                <Film className="h-4 w-4" />
                <span className="hidden sm:inline">Scripts</span>
              </TabsTrigger>
              <TabsTrigger value="blog" className="flex items-center gap-1.5 bg-slate-800/50 text-slate-400 hover:text-slate-200 data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-950 data-[state=active]:shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Blog</span>
              </TabsTrigger>
            </TabsList>

            {/* Twitter Hooks */}
            <TabsContent value="twitter" className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {(() => {
                const hooks = parseTwitterHooks(currentGeneration.twitter_hooks);
                if (!hooks || hooks.length === 0) {
                  return <p className="text-sm text-muted-foreground italic">No hooks generated</p>;
                }
                return hooks.map((hook, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-muted/50 border border-border group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <Badge variant="secondary" className="mb-2 text-[10px]">
                          Hook {idx + 1}
                        </Badge>
                        <p className="text-sm">{hook}</p>
                      </div>
                      <CopyButton text={hook} contentType="twitter_hook" platform="twitter" />
                    </div>
                  </div>
                ));
              })()}
            </TabsContent>

            {/* LinkedIn Post */}
            <TabsContent value="linkedin" className="max-h-[400px] overflow-y-auto pr-2">
              {currentGeneration.linkedin_post ? (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="secondary" className="text-[10px]">LinkedIn Post</Badge>
                    <CopyButton text={currentGeneration.linkedin_post} contentType="linkedin_post" platform="linkedin" />
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{currentGeneration.linkedin_post}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No LinkedIn post generated</p>
              )}
            </TabsContent>

            {/* Short-form Scripts */}
            <TabsContent value="shorts" className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {(() => {
                const scripts = parseShortFormScripts(currentGeneration.short_form_scripts);
                if (!scripts || scripts.length === 0) {
                  return <p className="text-sm text-muted-foreground italic">No scripts generated</p>;
                }
                return scripts.map((script, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-muted/50 border border-border"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          Script {idx + 1}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {script.duration}
                        </Badge>
                      </div>
                      <CopyButton 
                        text={`${script.title}\n\n${script.script}`} 
                        contentType="short_form_script" 
                        platform="shorts" 
                      />
                    </div>
                    <h4 className="font-medium text-sm mb-2">{script.title}</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{script.script}</p>
                  </div>
                ));
              })()}
            </TabsContent>

            {/* Blog Post */}
            <TabsContent value="blog" className="max-h-[400px] overflow-y-auto pr-2">
              {currentGeneration.blog_post ? (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="secondary" className="text-[10px]">Blog Post</Badge>
                    <CopyButton text={currentGeneration.blog_post} contentType="blog_post" platform="blog" />
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{currentGeneration.blog_post}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No blog post generated</p>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
