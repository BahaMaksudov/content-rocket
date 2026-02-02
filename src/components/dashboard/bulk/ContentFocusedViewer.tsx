import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  Video,
  ExternalLink
} from "lucide-react";
import { BatchJob } from "@/hooks/use-bulk-process";
import { trackCopyContent } from "@/lib/posthog";

interface ContentFocusedViewerProps {
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

function CopyButton({ text, contentType, platform, label }: { text: string; contentType?: string; platform?: string; label?: string }) {
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
    <Button size="sm" variant="outline" onClick={handleCopy} className="gap-2">
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {label || "Copy"}
    </Button>
  );
}

export function ContentFocusedViewer({ batchJob, isProcessing }: ContentFocusedViewerProps) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("blog");

  const generationIds = batchJob?.video_urls
    ?.filter(v => v.status === "completed" && v.generationId)
    ?.map(v => v.generationId) || [];

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

  useEffect(() => {
    setCurrentVideoIndex(0);
  }, [batchJob?.id]);

  const currentGeneration = generations?.[currentVideoIndex];
  const totalVideos = generations?.length || 0;
  const hasContent = totalVideos > 0;

  // Empty state
  if (!batchJob) {
    return (
      <Card className="border-border bg-card/50 backdrop-blur min-h-[500px] flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto">
            <Video className="h-10 w-10 text-primary/60" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Ready to Process</h3>
            <p className="text-muted-foreground max-w-md">
              Paste YouTube URLs above to generate blog posts, Twitter threads, and LinkedIn content for multiple videos at once.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Processing state
  if (isProcessing || batchJob.status === "processing" || batchJob.status === "pending") {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent min-h-[500px] flex items-center justify-center">
        <div className="text-center space-y-6 p-8">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
              <Badge variant="secondary" className="text-xs">
                {batchJob.completed_videos + batchJob.failed_videos} / {batchJob.total_videos}
              </Badge>
            </div>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Generating Content...</h3>
            <p className="text-muted-foreground">
              Creating blog posts, threads, and summaries for your videos
            </p>
          </div>
          <div className="flex justify-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{batchJob.completed_videos}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-muted-foreground">
                {batchJob.total_videos - batchJob.completed_videos - batchJob.failed_videos}
              </p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            {batchJob.failed_videos > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-destructive">{batchJob.failed_videos}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // No content
  if (!hasContent && !isLoading) {
    return (
      <Card className="border-border bg-card min-h-[500px] flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <FileX className="h-10 w-10 text-destructive/60" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">No Content Generated</h3>
            <p className="text-muted-foreground max-w-md">
              {batchJob.failed_videos > 0 
                ? `All ${batchJob.failed_videos} video(s) failed to process. Check video URLs have captions enabled.`
                : "No videos were processed in this batch."
              }
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <Card className="border-border bg-card min-h-[500px]">
        <div className="p-6 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card overflow-hidden">
      {/* Descriptive Pagination Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-muted/30 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentVideoIndex(prev => Math.max(0, prev - 1))}
          disabled={currentVideoIndex === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        
        <div className="flex items-center gap-3 text-center">
          <Badge variant="outline" className="text-xs px-3 py-1">
            Video {currentVideoIndex + 1} of {totalVideos}
          </Badge>
          <span className="font-medium text-sm max-w-[300px] truncate">
            {currentGeneration?.video_title || "Untitled Video"}
          </span>
          {currentGeneration?.youtube_url && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => window.open(currentGeneration.youtube_url!, "_blank")}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentVideoIndex(prev => Math.min(totalVideos - 1, prev + 1))}
          disabled={currentVideoIndex === totalVideos - 1}
          className="gap-2"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Content Tabs */}
      <CardContent className="p-6">
        {currentGeneration && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 mb-6 h-12">
              <TabsTrigger value="blog" className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                Blog Post
              </TabsTrigger>
              <TabsTrigger value="twitter" className="flex items-center gap-2 text-sm">
                <Twitter className="h-4 w-4" />
                Twitter Thread
              </TabsTrigger>
              <TabsTrigger value="linkedin" className="flex items-center gap-2 text-sm">
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </TabsTrigger>
              <TabsTrigger value="shorts" className="flex items-center gap-2 text-sm">
                <Film className="h-4 w-4" />
                Video Scripts
              </TabsTrigger>
            </TabsList>

            {/* Blog Post */}
            <TabsContent value="blog" className="mt-0">
              {currentGeneration.blog_post ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge>SEO-Optimized Blog Post</Badge>
                    <CopyButton text={currentGeneration.blog_post} contentType="blog_post" platform="blog" label="Copy Post" />
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none max-h-[400px] overflow-y-auto p-4 rounded-lg bg-muted/30 border border-border">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{currentGeneration.blog_post}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-12">No blog post generated</p>
              )}
            </TabsContent>

            {/* Twitter Hooks */}
            <TabsContent value="twitter" className="mt-0">
              {(() => {
                const hooks = parseTwitterHooks(currentGeneration.twitter_hooks);
                if (!hooks || hooks.length === 0) {
                  return <p className="text-muted-foreground text-center py-12">No Twitter hooks generated</p>;
                }
                return (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {hooks.map((hook, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-muted/30 border border-border group hover:border-primary/30 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <Badge variant="secondary" className="mb-2 text-[10px]">Hook {idx + 1}</Badge>
                            <p className="text-sm">{hook}</p>
                          </div>
                          <CopyButton text={hook} contentType="twitter_hook" platform="twitter" />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </TabsContent>

            {/* LinkedIn Post */}
            <TabsContent value="linkedin" className="mt-0">
              {currentGeneration.linkedin_post ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge>LinkedIn Summary</Badge>
                    <CopyButton text={currentGeneration.linkedin_post} contentType="linkedin_post" platform="linkedin" label="Copy Post" />
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 border border-border max-h-[400px] overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{currentGeneration.linkedin_post}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-12">No LinkedIn post generated</p>
              )}
            </TabsContent>

            {/* Short-form Scripts */}
            <TabsContent value="shorts" className="mt-0">
              {(() => {
                const scripts = parseShortFormScripts(currentGeneration.short_form_scripts);
                if (!scripts || scripts.length === 0) {
                  return <p className="text-muted-foreground text-center py-12">No video scripts generated</p>;
                }
                return (
                  <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    {scripts.map((script, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-muted/30 border border-border">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">Script {idx + 1}</Badge>
                            <Badge variant="outline" className="text-[10px]">{script.duration}</Badge>
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
                    ))}
                  </div>
                );
              })()}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
