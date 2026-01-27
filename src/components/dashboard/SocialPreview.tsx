import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Smartphone } from "lucide-react";
import type { GeneratedContent } from "@/pages/Dashboard";

interface SocialPreviewProps {
  content: GeneratedContent | null;
  platform: "twitter" | "linkedin" | "shorts";
}

function PhoneMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-[280px] h-[560px] bg-black rounded-[3rem] p-3 shadow-2xl">
      {/* Notch */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-10" />
      
      {/* Screen */}
      <div className="w-full h-full bg-background rounded-[2.5rem] overflow-hidden relative">
        {/* Status bar */}
        <div className="absolute top-0 left-0 right-0 h-10 bg-background/80 backdrop-blur flex items-center justify-between px-6 text-xs z-10">
          <span>9:41</span>
          <div className="flex gap-1">
            <span>📶</span>
            <span>🔋</span>
          </div>
        </div>
        
        {/* Content area */}
        <div className="pt-12 px-3 pb-4 h-full overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

function XPreview({ hooks }: { hooks: string[] }) {
  return (
    <PhoneMockup>
      <div className="space-y-3">
        {/* X Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/20" />
          <div>
            <p className="font-semibold text-sm">Your Brand</p>
            <p className="text-xs text-muted-foreground">@yourbrand</p>
          </div>
        </div>
        
        {/* Thread */}
        {hooks.slice(0, 3).map((hook, i) => (
          <div key={i} className="relative pl-4 border-l-2 border-primary/30 pb-3">
            {i === 0 && (
              <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-primary" />
            )}
            <p className="text-sm">{hook}</p>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span>💬 12</span>
              <span>🔄 45</span>
              <span>❤️ 234</span>
            </div>
          </div>
        ))}
      </div>
    </PhoneMockup>
  );
}

function LinkedInPreview({ post }: { post: string }) {
  const [expanded, setExpanded] = useState(false);
  const truncatedPost = post.substring(0, 200);
  
  return (
    <PhoneMockup>
      <div className="space-y-3">
        {/* LinkedIn Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/20" />
          <div>
            <p className="font-semibold text-sm">Your Name</p>
            <p className="text-xs text-muted-foreground">CEO at YourCompany • 1h</p>
          </div>
        </div>
        
        {/* Post content */}
        <div className="text-sm whitespace-pre-wrap">
          {expanded ? post : truncatedPost}
          {!expanded && post.length > 200 && (
            <>
              <span>...</span>
              <button 
                onClick={() => setExpanded(true)}
                className="text-muted-foreground hover:text-primary block mt-1"
              >
                ...see more
              </button>
            </>
          )}
        </div>
        
        {/* Engagement */}
        <div className="border-t border-border pt-2 flex justify-around text-xs text-muted-foreground">
          <span>👍 1,234</span>
          <span>💬 89</span>
          <span>🔄 45</span>
        </div>
      </div>
    </PhoneMockup>
  );
}

function TikTokPreview({ script }: { script: { title: string; script: string } }) {
  return (
    <PhoneMockup>
      <div className="relative h-full flex flex-col">
        {/* Video background simulation */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-background rounded-lg" />
        
        {/* Overlay content */}
        <div className="relative flex-1 flex flex-col justify-end p-3">
          {/* User info */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-primary" />
              <span className="font-semibold text-sm">@yourbrand</span>
              <Button size="sm" variant="outline" className="h-6 text-xs">Follow</Button>
            </div>
            
            <h3 className="font-bold text-sm mb-1">{script.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-3">
              {script.script.substring(0, 100)}...
            </p>
          </div>
          
          {/* Bottom bar */}
          <div className="flex items-center gap-2 text-xs">
            <span>🎵</span>
            <span className="text-muted-foreground">Original Sound - yourbrand</span>
          </div>
        </div>
        
        {/* Side actions */}
        <div className="absolute right-2 bottom-20 flex flex-col gap-4 items-center">
          <div className="text-center">
            <div className="w-8 h-8 rounded-full bg-background/50 flex items-center justify-center">❤️</div>
            <span className="text-xs">12.5K</span>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 rounded-full bg-background/50 flex items-center justify-center">💬</div>
            <span className="text-xs">234</span>
          </div>
          <div className="text-center">
            <div className="w-8 h-8 rounded-full bg-background/50 flex items-center justify-center">🔖</div>
            <span className="text-xs">Save</span>
          </div>
        </div>
      </div>
    </PhoneMockup>
  );
}

export function SocialPreviewToggle({ 
  showPreview, 
  onToggle 
}: { 
  showPreview: boolean; 
  onToggle: () => void;
}) {
  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={onToggle}
      className="gap-2"
    >
      {showPreview ? (
        <>
          <EyeOff className="h-4 w-4" />
          Hide Preview
        </>
      ) : (
        <>
          <Smartphone className="h-4 w-4" />
          Preview Mode
        </>
      )}
    </Button>
  );
}

export function SocialPreview({ content, platform }: SocialPreviewProps) {
  if (!content) return null;

  return (
    <div className="py-6 flex justify-center bg-muted/20 rounded-lg">
      {platform === "twitter" && <XPreview hooks={content.twitterHooks} />}
      {platform === "linkedin" && <LinkedInPreview post={content.linkedinPost} />}
      {platform === "shorts" && content.shortFormScripts[0] && (
        <TikTokPreview script={content.shortFormScripts[0]} />
      )}
    </div>
  );
}
