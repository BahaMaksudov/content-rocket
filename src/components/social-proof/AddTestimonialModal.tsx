import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star } from "lucide-react";

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
  }) => void;
  isSubmitting: boolean;
}

export function AddTestimonialModal({ open, onOpenChange, onSubmit, isSubmitting }: AddTestimonialModalProps) {
  const isMobile = useIsMobile();
  const [authorName, setAuthorName] = useState("");
  const [authorTitle, setAuthorTitle] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourcePlatform, setSourcePlatform] = useState("other");

  const handleSubmit = () => {
    if (!authorName.trim() || !content.trim()) return;
    onSubmit({
      author_name: authorName.trim(),
      author_title: authorTitle.trim(),
      content: content.trim(),
      rating,
      source_url: sourceUrl.trim(),
      source_platform: sourcePlatform,
    });
    // Reset
    setAuthorName("");
    setAuthorTitle("");
    setContent("");
    setRating(5);
    setSourceUrl("");
    setSourcePlatform("other");
  };

  const formContent = (
    <div className="space-y-4 p-1">
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
      <Button onClick={handleSubmit} disabled={!authorName.trim() || !content.trim() || isSubmitting} className="w-full">
        {isSubmitting ? "Adding..." : "Add Testimonial"}
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
