import { useState, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Upload, X, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AddTestimonialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    author_name: string;
    author_title: string;
    content: string;
    rating: number;
    source_url: string;
    source_platform: string;
    avatar_url?: string;
  }) => void;
  isSubmitting: boolean;
}

export function AddTestimonialModal({ open, onOpenChange, onSubmit, isSubmitting }: AddTestimonialModalProps) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [authorName, setAuthorName] = useState("");
  const [authorTitle, setAuthorTitle] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourcePlatform, setSourcePlatform] = useState("other");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const clearAvatar = () => {
    setAvatarFile(null);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadAvatar = async (): Promise<string | undefined> => {
    if (!avatarFile || !user) return undefined;
    const ext = avatarFile.name.split(".").pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("testimonial-avatars")
      .upload(path, avatarFile, { upsert: true });
    if (error) {
      toast.error("Failed to upload avatar");
      throw error;
    }
    const { data: urlData } = supabase.storage
      .from("testimonial-avatars")
      .getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    if (!authorName.trim() || !content.trim()) return;
    setUploading(true);
    try {
      const avatarUrl = await uploadAvatar();
      onSubmit({
        author_name: authorName.trim(),
        author_title: authorTitle.trim(),
        content: content.trim(),
        rating,
        source_url: sourceUrl.trim(),
        source_platform: sourcePlatform,
        avatar_url: avatarUrl,
      });
      // Reset
      setAuthorName("");
      setAuthorTitle("");
      setContent("");
      setRating(5);
      setSourceUrl("");
      setSourcePlatform("other");
      clearAvatar();
    } catch {
      // error already toasted
    } finally {
      setUploading(false);
    }
  };

  const formContent = (
    <div className="space-y-4 p-1">
      {/* Avatar upload */}
      <div className="space-y-2">
        <Label>Author Photo</Label>
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14 rounded-full bg-muted/50 border border-border flex items-center justify-center overflow-hidden shrink-0">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Preview" className="h-full w-full object-cover" />
            ) : (
              <User className="h-6 w-6 text-muted-foreground/50" />
            )}
          </div>
          <div className="flex gap-2">
            <label
              htmlFor="avatar-upload"
              className="inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 cursor-pointer transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              {avatarPreview ? "Change" : "Upload"}
            </label>
            {avatarPreview && (
              <Button type="button" variant="ghost" size="sm" onClick={clearAvatar}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <input id="avatar-upload" ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Author Name *</Label>
        <Input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Jane Doe" />
      </div>
      <div className="space-y-2">
        <Label>Title / Role</Label>
        <Input value={authorTitle} onChange={(e) => setAuthorTitle(e.target.value)} placeholder="CEO at Acme Inc." />
      </div>
      <div className="space-y-2">
        <Label>Testimonial Content *</Label>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="This product changed everything..." rows={4} />
      </div>
      <div className="space-y-2">
        <Label>Rating</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} type="button" onClick={() => setRating(star)} className="p-0.5">
              <Star className={`h-6 w-6 transition-colors ${star <= rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Platform</Label>
          <Select value={sourcePlatform} onValueChange={setSourcePlatform}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="twitter">Twitter / X</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
              <SelectItem value="google">Google</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Source URL</Label>
          <Input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." />
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={!authorName.trim() || !content.trim() || isSubmitting || uploading} className="w-full">
        {uploading ? "Uploading..." : isSubmitting ? "Adding..." : "Add Testimonial"}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="px-4 pb-8">
          <DrawerHeader className="px-0">
            <DrawerTitle>Add Testimonial</DrawerTitle>
          </DrawerHeader>
          {formContent}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Testimonial</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
