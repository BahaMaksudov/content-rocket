import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Flame, Mic, Clapperboard, FileText, Copy, Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const VIRAL_STORAGE_KEY = "vidlogic_viral_script";

export interface ViralScriptContent {
  hook: string;
  script: string;
  visualIdeas: string;
  captions: string;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied!" });
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button size="sm" variant="ghost" onClick={copy} className="shrink-0">
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

export function ViralScriptGenerator() {
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<ViralScriptContent | null>(() => {
    try {
      const raw = localStorage.getItem(VIRAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const outputRef = useRef<HTMLDivElement>(null);

  // Persist result to localStorage
  useEffect(() => {
    if (result) {
      localStorage.setItem(VIRAL_STORAGE_KEY, JSON.stringify(result));
    }
  }, [result]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({ variant: "destructive", title: "Enter a topic", description: "Please enter a topic or idea first." });
      return;
    }

    setIsGenerating(true);
    outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("generate-viral-script", {
          body: { topic: topic.trim() },
        });

        if (error) {
          const status = error?.context?.status;
          const message = typeof error?.message === "string" ? error.message : "";

          if (status === 402 || message.includes("AI_CREDITS_EXHAUSTED")) {
            toast({ variant: "destructive", title: "AI credits exhausted", description: "Please add more credits to continue." });
            return;
          }
          throw error;
        }

        if (data?.error) throw new Error(data.error);

        setResult(data as ViralScriptContent);
        toast({ title: "Script generated!", description: "Your viral video script is ready." });

        setTimeout(() => {
          outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      } catch (err: any) {
        console.error("Viral script error:", err);
        toast({ variant: "destructive", title: "Generation failed", description: err.message || "Please try again." });
      } finally {
        setIsGenerating(false);
      }
    }, 0);
  };

  const sections = result ? [
    { icon: Flame, emoji: "🔥", label: "Hook", content: result.hook, color: "text-orange-400" },
    { icon: Mic, emoji: "🎙️", label: "Script", content: result.script, color: "text-primary" },
    { icon: Clapperboard, emoji: "🎬", label: "Visual/Effect Ideas", content: result.visualIdeas, color: "text-violet-400" },
    { icon: FileText, emoji: "📝", label: "Captions", content: result.captions, color: "text-emerald-400" },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Input Card */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Viral Script Creator
          </CardTitle>
          <CardDescription>
            Enter a topic and generate a high-energy script optimized for TikTok, Reels & Shorts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder='e.g. "The future of AI agents" or "5 money habits that changed my life"'
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Script
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Output */}
      <div ref={outputRef}>
        {isGenerating && !result && (
          <Card className="border-border bg-card min-h-[400px] relative overflow-hidden">
            <div className="absolute inset-0 z-50 flex items-start justify-center pt-24 bg-background/80 backdrop-blur-sm rounded-[inherit]">
              <div className="text-center space-y-4">
                <Loader2 className="h-14 w-14 animate-spin text-primary mx-auto" />
                <div>
                  <p className="font-medium text-lg">Crafting your viral script…</p>
                  <p className="text-sm text-muted-foreground">Creating hook, script, visuals & captions</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {result && (
          <div className="relative">
            {isGenerating && (
              <div className="absolute inset-0 z-50 flex items-start justify-center pt-24 bg-background/80 backdrop-blur-sm rounded-xl">
                <div className="text-center space-y-4">
                  <Loader2 className="h-14 w-14 animate-spin text-primary mx-auto" />
                  <div>
                    <p className="font-medium text-lg">Crafting your viral script…</p>
                    <p className="text-sm text-muted-foreground">Creating hook, script, visuals & captions</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {sections.map(({ emoji, label, content, color }) => (
                <Card key={label} className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-sm">
                        <span className="mr-1.5">{emoji}</span>
                        {label}
                      </Badge>
                      <CopyBtn text={content} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {!result && !isGenerating && (
          <Card className="border-border bg-card min-h-[300px] flex items-center justify-center">
            <div className="text-center space-y-2 p-8">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium">No script generated yet</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Enter a topic above and click "Generate Script" to create a viral video script
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
