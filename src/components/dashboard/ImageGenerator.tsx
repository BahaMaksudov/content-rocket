import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, Loader2, Download } from "lucide-react";

interface ImageGeneratorProps {
  textContent: string;
  platform: "twitter" | "linkedin" | "shorts" | "blog";
  onImageGenerated?: (imageUrl: string) => void;
}

export function ImageGenerator({ textContent, platform, onImageGenerated }: ImageGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const platformLabels = {
    twitter: "X Post Thumbnail",
    linkedin: "LinkedIn Banner",
    shorts: "Video Thumbnail",
    blog: "Blog Hero Image",
  };

  const handleGenerate = async () => {
    if (!textContent) {
      toast({
        variant: "destructive",
        title: "No content",
        description: "Generate text content first before creating an image.",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: {
          textContent: textContent.substring(0, 500),
          platform,
        },
      });

      if (error) throw error;

      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        onImageGenerated?.(data.imageUrl);
        toast({
          title: "Image generated!",
          description: `Your ${platformLabels[platform]} is ready.`,
        });
      }
    } catch (error: any) {
      console.error("Image generation error:", error);
      toast({
        variant: "destructive",
        title: "Generation failed",
        description: error.message || "Failed to generate image. Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `${platform}-visual.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !textContent}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <ImagePlus className="h-4 w-4" />
            Generate AI Visual
          </>
        )}
      </Button>

      {generatedImage && (
        <div className="relative group rounded-lg overflow-hidden border border-border">
          <img
            src={generatedImage}
            alt={`Generated ${platformLabels[platform]}`}
            className="w-full h-auto max-h-64 object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button size="sm" variant="secondary" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground py-2 bg-muted/50">
            Suggested: {platformLabels[platform]}
          </p>
        </div>
      )}
    </div>
  );
}
