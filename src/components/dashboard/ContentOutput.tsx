import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Edit2, Save, Twitter, Linkedin, Film, FileText, Download, Loader2 } from "lucide-react";
import type { GeneratedContent } from "@/pages/Dashboard";
import { ImageGenerator } from "./ImageGenerator";
import { SocialPreview, SocialPreviewToggle } from "./SocialPreview";

interface ContentOutputProps {
  content: GeneratedContent | null;
  isGenerating: boolean;
  onUpdateContent: (content: GeneratedContent) => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button size="sm" variant="ghost" onClick={handleCopy}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

function EditableContent({
  content,
  onSave,
  placeholder = "Content will appear here...",
}: {
  content: string;
  onSave: (value: string) => void;
  placeholder?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(content);

  const handleSave = () => {
    onSave(value);
    setIsEditing(false);
  };

  if (!content && !isEditing) {
    return (
      <p className="text-muted-foreground text-sm italic">{placeholder}</p>
    );
  }

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={8}
          className="resize-none"
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <p className="whitespace-pre-wrap">{content}</p>
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => {
          setValue(content);
          setIsEditing(true);
        }}
      >
        <Edit2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ContentOutput({ content, isGenerating, onUpdateContent }: ContentOutputProps) {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("twitter");

  const handleExportAll = () => {
    if (!content) return;
    
    const markdown = `# Generated Content

## X (Twitter) Hooks

${content.twitterHooks.map((h, i) => `${i + 1}. ${h}`).join("\n\n")}

## LinkedIn Post

${content.linkedinPost}

## Short-form Video Scripts

${content.shortFormScripts.map((s, i) => `### Script ${i + 1}: ${s.title}
**Duration:** ${s.duration}

${s.script}`).join("\n\n")}

## Blog Post

${content.blogPost}
`;

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "generated-content.md";
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: "Content exported!", description: "Downloaded as Markdown file." });
  };

  if (isGenerating) {
    return (
      <Card className="border-border bg-card h-full flex items-center justify-center min-h-[500px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div>
            <p className="font-medium">Generating all platform assets...</p>
            <p className="text-sm text-muted-foreground">Creating X hooks, LinkedIn post, TikTok scripts, and blog post</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!content) {
    return (
      <Card className="border-border bg-card h-full flex items-center justify-center min-h-[500px]">
        <div className="text-center space-y-2 p-8">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="font-medium">No content generated yet</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Fetch a YouTube transcript and click "Generate All Assets" to create multi-platform content
          </p>
        </div>
      </Card>
    );
  }

  const currentPlatform = activeTab as "twitter" | "linkedin" | "shorts" | "blog";

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle>Generated Content</CardTitle>
        <div className="flex items-center gap-2">
          <SocialPreviewToggle 
            showPreview={showPreview} 
            onToggle={() => setShowPreview(!showPreview)} 
          />
          <Button onClick={handleExportAll} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="twitter" className="flex items-center gap-1">
              <Twitter className="h-4 w-4" />
              <span className="hidden sm:inline">X Hooks</span>
            </TabsTrigger>
            <TabsTrigger value="linkedin" className="flex items-center gap-1">
              <Linkedin className="h-4 w-4" />
              <span className="hidden sm:inline">LinkedIn</span>
            </TabsTrigger>
            <TabsTrigger value="shorts" className="flex items-center gap-1">
              <Film className="h-4 w-4" />
              <span className="hidden sm:inline">Scripts</span>
            </TabsTrigger>
            <TabsTrigger value="blog" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Blog</span>
            </TabsTrigger>
          </TabsList>

          {/* Social Preview */}
          {showPreview && currentPlatform !== "blog" && (
            <div className="mb-4">
              <SocialPreview content={content} platform={currentPlatform} />
            </div>
          )}

          {/* Twitter Hooks */}
          <TabsContent value="twitter" className="space-y-3">
            <div className="mb-4">
              <ImageGenerator 
                textContent={content.twitterHooks.join(" ")} 
                platform="twitter"
              />
            </div>
            {content.twitterHooks.map((hook, index) => (
              <div
                key={index}
                className="p-4 rounded-lg bg-muted/50 border border-border group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <Badge variant="secondary" className="mb-2">
                      Hook {index + 1}
                    </Badge>
                    <EditableContent
                      content={hook}
                      onSave={(value) => {
                        const updated = [...content.twitterHooks];
                        updated[index] = value;
                        onUpdateContent({ ...content, twitterHooks: updated });
                      }}
                    />
                  </div>
                  <CopyButton text={hook} />
                </div>
              </div>
            ))}
          </TabsContent>

          {/* LinkedIn Post */}
          <TabsContent value="linkedin">
            <div className="mb-4">
              <ImageGenerator 
                textContent={content.linkedinPost} 
                platform="linkedin"
              />
            </div>
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-start justify-between gap-2 mb-2">
                <Badge variant="secondary">Problem-Agitation-Solution</Badge>
                <CopyButton text={content.linkedinPost} />
              </div>
              <EditableContent
                content={content.linkedinPost}
                onSave={(value) => onUpdateContent({ ...content, linkedinPost: value })}
              />
            </div>
          </TabsContent>

          {/* Short-form Scripts */}
          <TabsContent value="shorts" className="space-y-4">
            <div className="mb-4">
              <ImageGenerator 
                textContent={content.shortFormScripts.map(s => s.title).join(" ")} 
                platform="shorts"
              />
            </div>
            {content.shortFormScripts.map((script, index) => (
              <div
                key={index}
                className="p-4 rounded-lg bg-muted/50 border border-border"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <Badge variant="secondary" className="mr-2">
                      Script {index + 1}
                    </Badge>
                    <Badge variant="outline">{script.duration}</Badge>
                  </div>
                  <CopyButton text={`${script.title}\n\n${script.script}`} />
                </div>
                <h4 className="font-semibold mb-2">{script.title}</h4>
                <EditableContent
                  content={script.script}
                  onSave={(value) => {
                    const updated = [...content.shortFormScripts];
                    updated[index] = { ...script, script: value };
                    onUpdateContent({ ...content, shortFormScripts: updated });
                  }}
                />
              </div>
            ))}
          </TabsContent>

          {/* Blog Post */}
          <TabsContent value="blog">
            <div className="mb-4">
              <ImageGenerator 
                textContent={content.blogPost.substring(0, 300)} 
                platform="blog"
              />
            </div>
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-start justify-between gap-2 mb-2">
                <Badge variant="secondary">SEO-Optimized Blog Post</Badge>
                <CopyButton text={content.blogPost} />
              </div>
              <EditableContent
                content={content.blogPost}
                onSave={(value) => onUpdateContent({ ...content, blogPost: value })}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
