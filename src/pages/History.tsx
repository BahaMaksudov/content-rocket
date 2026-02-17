import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { History as HistoryIcon, ExternalLink, Trash2, Copy, Check, Twitter, Linkedin, Film, FileText } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ImageGenerator } from "@/components/dashboard/ImageGenerator";
import { trackCopyContent } from "@/lib/posthog";
import { SocialActionBar } from "@/components/dashboard/bulk/SocialActionBar";

interface Generation {
  id: string;
  youtube_url: string | null;
  video_title: string | null;
  transcript_method: string | null;
  tone: string | null;
  audience: string | null;
  twitter_hooks: unknown;
  linkedin_post: string | null;
  short_form_scripts: unknown;
  blog_post: string | null;
  created_at: string;
  target_language: string | null;
}

function CopyButton({ text, contentType, platform }: { text: string; contentType?: string; platform?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    
    // Track copy event
    trackCopyContent(contentType || "content", platform);
    
    toast({ title: "Copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button size="icon" variant="ghost" onClick={handleCopy}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

export default function History() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);

  const { data: generations, isLoading, refetch } = useQuery({
    queryKey: ["generations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generations")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Generation[];
    },
    enabled: !!user,
  });

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("generations").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Generation deleted" });
      refetch();
      setSelectedGeneration(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to delete", description: error.message });
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <HistoryIcon className="h-8 w-8 text-primary" />
            Generation History
          </h1>
          <p className="text-muted-foreground">
            Browse and revisit your previously generated content
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border bg-card">
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : generations?.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="p-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <HistoryIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">No generations yet</h3>
              <p className="text-muted-foreground">
                Generate content from the dashboard to see it here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {generations?.map((gen) => (
              <Card
                key={gen.id}
                className="border-border bg-card hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => setSelectedGeneration(gen)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1 line-clamp-1">
                        {gen.video_title || "Untitled Generation"}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {formatDistanceToNow(new Date(gen.created_at), { addSuffix: true })}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {gen.transcript_method && (
                          <Badge variant="secondary">{gen.transcript_method}</Badge>
                        )}
                        {gen.tone && <Badge variant="outline">{gen.tone}</Badge>}
                        {gen.audience && <Badge variant="outline">{gen.audience}</Badge>}
                      </div>
                    </div>
                    {gen.youtube_url && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(gen.youtube_url!, "_blank");
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!selectedGeneration} onOpenChange={() => setSelectedGeneration(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="pr-8">
                {selectedGeneration?.video_title || "Generation Details"}
              </DialogTitle>
            </DialogHeader>

            {selectedGeneration && (
              <Tabs defaultValue="twitter" className="w-full">
                <TooltipProvider>
                  <TabsList className="grid grid-cols-4 mb-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger value="twitter"><Twitter className="h-4 w-4" /></TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>X Thread</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger value="linkedin"><Linkedin className="h-4 w-4" /></TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>LinkedIn Post</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger value="shorts"><Film className="h-4 w-4" /></TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>TikTok Script</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger value="blog"><FileText className="h-4 w-4" /></TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>SEO Blog Post</TooltipContent>
                    </Tooltip>
                  </TabsList>
                </TooltipProvider>

                <TabsContent value="twitter" className="space-y-3">
                  <div className="mb-4">
                    <ImageGenerator 
                      textContent={(selectedGeneration.twitter_hooks as string[] | null)?.join(" ") || ""} 
                      platform="twitter"
                      targetLanguage={selectedGeneration.target_language}
                    />
                  </div>
                  {(selectedGeneration.twitter_hooks as string[] | null)?.map((hook, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/50 flex justify-between items-start gap-2">
                      <p className="flex-1">{hook}</p>
                      <CopyButton text={hook} contentType="twitter_hook" platform="twitter" />
                    </div>
                  ))}
                  <SocialActionBar 
                    content={(selectedGeneration.twitter_hooks as string[] | null)?.join("\n\n") || ""} 
                    platform="twitter" 
                    youtubeUrl={selectedGeneration.youtube_url} 
                  />
                </TabsContent>

                <TabsContent value="linkedin">
                  <div className="mb-4">
                    <ImageGenerator 
                      textContent={selectedGeneration.linkedin_post || ""} 
                      platform="linkedin"
                      targetLanguage={selectedGeneration.target_language}
                    />
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex justify-end mb-2">
                      <CopyButton text={selectedGeneration.linkedin_post || ""} contentType="linkedin_post" platform="linkedin" />
                    </div>
                    <p className="whitespace-pre-wrap">{selectedGeneration.linkedin_post}</p>
                  </div>
                  <SocialActionBar 
                    content={selectedGeneration.linkedin_post || ""} 
                    platform="linkedin" 
                    youtubeUrl={selectedGeneration.youtube_url} 
                  />
                </TabsContent>

                <TabsContent value="shorts" className="space-y-4">
                  <div className="mb-4">
                    <ImageGenerator 
                      textContent={(selectedGeneration.short_form_scripts as Array<{ title: string; script: string; duration: string }> | null)?.map(s => s.title).join(" ") || ""} 
                      platform="shorts"
                      targetLanguage={selectedGeneration.target_language}
                    />
                  </div>
                  {(selectedGeneration.short_form_scripts as Array<{ title: string; script: string; duration: string }> | null)?.map((script, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <Badge className="mr-2">{script.title}</Badge>
                          <Badge variant="outline">{script.duration}</Badge>
                        </div>
                        <CopyButton text={script.script} contentType="short_form_script" platform="shorts" />
                      </div>
                      <p className="whitespace-pre-wrap">{script.script}</p>
                    </div>
                  ))}
                  <SocialActionBar 
                    content={(selectedGeneration.short_form_scripts as Array<{ title: string; script: string; duration: string }> | null)?.map(s => `${s.title}\n\n${s.script}`).join("\n\n---\n\n") || ""} 
                    platform="shorts" 
                    youtubeUrl={selectedGeneration.youtube_url} 
                  />
                </TabsContent>

                <TabsContent value="blog">
                  <div className="mb-4">
                    <ImageGenerator 
                      textContent={selectedGeneration.blog_post?.substring(0, 300) || ""} 
                      platform="blog"
                      targetLanguage={selectedGeneration.target_language}
                    />
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex justify-end mb-2">
                      <CopyButton text={selectedGeneration.blog_post || ""} contentType="blog_post" platform="blog" />
                    </div>
                    <p className="whitespace-pre-wrap">{selectedGeneration.blog_post}</p>
                  </div>
                  <SocialActionBar 
                    content={selectedGeneration.blog_post || ""} 
                    platform="blog" 
                    youtubeUrl={selectedGeneration.youtube_url} 
                  />
                </TabsContent>
              </Tabs>
            )}

            <div className="flex justify-end mt-4 pt-4 border-t border-border">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(selectedGeneration!.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
