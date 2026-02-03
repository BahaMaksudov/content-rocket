import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Twitter,
  Linkedin,
  Share2,
  Send,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface SocialActionBarProps {
  content: string;
  platform: "blog" | "twitter" | "linkedin" | "shorts";
  youtubeUrl?: string | null;
}

// Brand colors for social platforms
const PLATFORM_STYLES = {
  twitter: {
    bg: "bg-[#1DA1F2] hover:bg-[#1a8cd8]",
    icon: Twitter,
    label: "Post to X",
  },
  linkedin: {
    bg: "bg-[#0A66C2] hover:bg-[#004182]",
    icon: Linkedin,
    label: "Share on LinkedIn",
  },
  buffer: {
    bg: "bg-[#231F20] hover:bg-[#3d3639]",
    icon: Share2,
    label: "Buffer Share",
  },
};

// Truncate text to nearest sentence under 280 chars for Twitter
function truncateForTwitter(text: string, url?: string): string {
  const urlLength = url ? url.length + 1 : 0; // +1 for space
  const maxLength = 280 - urlLength;
  
  if (text.length <= maxLength) {
    return url ? `${text} ${url}` : text;
  }
  
  // Find sentence boundaries
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let result = "";
  
  for (const sentence of sentences) {
    if ((result + sentence).trim().length <= maxLength) {
      result += sentence;
    } else {
      break;
    }
  }
  
  // If no complete sentence fits, truncate with ellipsis
  if (!result.trim()) {
    result = text.substring(0, maxLength - 3) + "...";
  }
  
  return url ? `${result.trim()} ${url}` : result.trim();
}

export function SocialActionBar({ content, platform, youtubeUrl }: SocialActionBarProps) {
  const { toast } = useToast();
  const { tier } = useSubscription();
  const { session } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  
  const isPro = tier === "pro" || tier === "agency";
  const isAgency = tier === "agency";
  
  // Don't render for free users
  if (!isPro) {
    return null;
  }
  
  const handlePostToTwitter = () => {
    const tweetText = truncateForTwitter(content, youtubeUrl || undefined);
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(url, "_blank", "width=550,height=420");
  };
  
  const handleShareLinkedIn = () => {
    // LinkedIn share with full content - URL is shared separately
    const shareUrl = youtubeUrl || window.location.href;
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "width=550,height=520");
    
    // Copy content to clipboard for easy paste
    navigator.clipboard.writeText(content);
    toast({
      title: "Content copied!",
      description: "Paste your summary in the LinkedIn post.",
    });
  };
  
  const handleBufferShare = () => {
    const text = platform === "twitter" 
      ? truncateForTwitter(content, undefined)
      : content;
    const shareUrl = youtubeUrl || "";
    const url = `https://buffer.com/add?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank");
  };
  
  const handleBufferSync = async () => {
    if (!session?.access_token) {
      toast({
        variant: "destructive",
        title: "Not authenticated",
        description: "Please log in to sync to Buffer.",
      });
      return;
    }
    
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("buffer-sync", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          content: platform === "twitter" 
            ? truncateForTwitter(content, youtubeUrl || undefined)
            : content,
          platform,
          youtubeUrl,
        },
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: "Added to Buffer Queue!",
          description: "Your post has been scheduled.",
        });
      } else if (data?.needsApiKey) {
        toast({
          variant: "destructive",
          title: "Buffer API Key Required",
          description: "Add your Buffer API key in Settings → Integrations.",
        });
      } else {
        throw new Error(data?.error || "Failed to sync to Buffer");
      }
    } catch (error: any) {
      console.error("Buffer sync error:", error);
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message || "Could not add to Buffer queue.",
      });
    } finally {
      setIsSyncing(false);
    }
  };
  
  return (
    <div className="sticky bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-t border-border">
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">
          Publishing
        </span>
        
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Post to X */}
          <Button
            size="sm"
            onClick={handlePostToTwitter}
            className={`${PLATFORM_STYLES.twitter.bg} text-white gap-2`}
          >
            <Twitter className="h-4 w-4" />
            <span className="hidden sm:inline">Post to X</span>
          </Button>
          
          {/* Share on LinkedIn */}
          <Button
            size="sm"
            onClick={handleShareLinkedIn}
            className={`${PLATFORM_STYLES.linkedin.bg} text-white gap-2`}
          >
            <Linkedin className="h-4 w-4" />
            <span className="hidden sm:inline">LinkedIn</span>
          </Button>
          
          {/* Buffer Share (Pro) */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleBufferShare}
            className="gap-2"
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Buffer</span>
            <ExternalLink className="h-3 w-3" />
          </Button>
          
          {/* Sync to Buffer Queue (Agency Only) */}
          {isAgency && (
            <Button
              size="sm"
              onClick={handleBufferSync}
              disabled={isSyncing}
              className="bg-primary text-primary-foreground gap-2"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Sync to Buffer</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
