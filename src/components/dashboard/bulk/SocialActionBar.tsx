import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Twitter,
  Linkedin,
  Share2,
  Send,
  Loader2,
  ExternalLink,
  Settings,
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

// Extract YouTube channel name from content or return generic attribution
function extractChannelAttribution(content: string, youtubeUrl?: string | null): string {
  // Try to extract channel name from common patterns in the content
  // For now, we'll use a generic attribution that includes the URL
  if (youtubeUrl) {
    return `\n\n---\nSource: Inspired by YouTube creator via VidLogic AI`;
  }
  return `\n\n---\nSource: Content generated via VidLogic AI`;
}

// Append credit line to content for sharing
function appendCreditLine(content: string, youtubeUrl?: string | null): string {
  const creditLine = extractChannelAttribution(content, youtubeUrl);
  return content + creditLine;
}

// Truncate text to 250 chars and add ellipsis for Twitter
function truncateForTwitter(text: string): string {
  const maxLength = 250;
  
  if (text.length <= maxLength) {
    return text;
  }
  
  // Find sentence boundaries within limit
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
  } else if (result.trim().length < text.length) {
    result = result.trim() + "...";
  }
  
  return result.trim();
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy copy for browsers with flaky async clipboard support.
    }
  }

  if (typeof document === "undefined") {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  const didCopy = document.execCommand("copy");
  document.body.removeChild(textarea);

  return didCopy;
}

export function SocialActionBar({ content, platform, youtubeUrl }: SocialActionBarProps) {
  const { toast } = useToast();
  const { tier } = useSubscription();
  const { session, user } = useAuth();
  const navigate = useNavigate();
  const [isSyncing, setIsSyncing] = useState(false);
  
  const isPro = tier === "pro" || tier === "agency";
  const isAgency = tier === "agency";
  
  // Query for Buffer integration status
  const { data: bufferIntegration, isLoading: isLoadingIntegration } = useQuery({
    queryKey: ["user-integrations", "buffer", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_integrations")
        .select("*")
        .eq("user_id", user!.id)
        .eq("service", "buffer")
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAgency,
  });
  
  const hasBufferKey = !!bufferIntegration?.api_key;
  
  // Don't render for free users
  if (!isPro) {
    return null;
  }
  
  const handlePostToTwitter = async () => {
    // Append credit line to the full content for clipboard
    const contentWithCredit = appendCreditLine(content, youtubeUrl);
    const truncatedText = truncateForTwitter(content);
    
    // Copy full content WITH credit to clipboard
    await navigator.clipboard.writeText(contentWithCredit);
    
    // Build URL with text and url as separate params
    const params = new URLSearchParams();
    params.set("text", truncatedText);
    if (youtubeUrl) {
      params.set("url", youtubeUrl);
    }
    
    const url = `https://twitter.com/intent/tweet?${params.toString()}`;
    
    toast({
      title: "Text copied & opening X (Twitter)...",
      description: "Content with source credit copied to clipboard.",
    });
    
    window.open(url, "_blank", "width=550,height=420");
  };
  
  const handleShareLinkedIn = async () => {
    const contentWithCredit = appendCreditLine(content, youtubeUrl);
    const shareUrl = youtubeUrl
      ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(youtubeUrl)}`
      : "https://www.linkedin.com/feed/?shareActive=true";

    const popup = window.open("", "_blank");
    const copied = await copyTextToClipboard(contentWithCredit);

    toast({
      title: copied ? "Content copied!" : "LinkedIn opened",
      description: copied
        ? "Just paste (Cmd+V / Ctrl+V) it into the LinkedIn window."
        : "Your browser blocked clipboard access, so please copy the post manually after LinkedIn opens.",
    });

    if (popup) {
      popup.opener = null;
      popup.location.replace(shareUrl);
      return;
    }

    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };
  
  const handleBufferShare = async () => {
    // Append credit line for Buffer
    const contentWithCredit = appendCreditLine(content, youtubeUrl);
    const text = platform === "twitter" 
      ? truncateForTwitter(content)
      : contentWithCredit;
    const shareUrl = youtubeUrl || "";
    
    // Copy full content WITH credit to clipboard
    await navigator.clipboard.writeText(contentWithCredit);
    
    const url = `https://buffer.com/add?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    
    toast({
      title: "Text copied & opening Buffer...",
      description: "Content with source credit copied to clipboard.",
    });
    
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
      // Append credit line for Buffer sync
      const contentWithCredit = appendCreditLine(content, youtubeUrl);
      const { data, error } = await supabase.functions.invoke("buffer-sync", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          content: platform === "twitter" 
            ? truncateForTwitter(content)
            : contentWithCredit,
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
  
  const handleGoToSettings = () => {
    navigate("/settings?tab=integrations");
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
            <>
              {hasBufferKey ? (
                <Button
                  size="sm"
                  onClick={handleBufferSync}
                  disabled={isSyncing || isLoadingIntegration}
                  className="bg-primary text-primary-foreground gap-2"
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Sync to Buffer</span>
                </Button>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 border-dashed"
                      disabled={isLoadingIntegration}
                    >
                      <Send className="h-4 w-4 text-muted-foreground" />
                      <span className="hidden sm:inline text-muted-foreground">Sync to Buffer</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    side="top" 
                    align="end" 
                    className="w-72 p-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                          <Share2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="font-medium text-sm">Connect Buffer</p>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Connect your Buffer account to enable one-click syncing to your publishing queue.
                      </p>
                      <Button
                        size="sm"
                        variant="link"
                        onClick={handleGoToSettings}
                        className="h-auto p-0 text-primary gap-1"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        Go to Integrations Settings →
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
