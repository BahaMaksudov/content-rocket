import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Rocket, Send } from "lucide-react";

interface ContactSalesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactSalesModal({ open, onOpenChange }: ContactSalesModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    companyName: "",
    videoVolume: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate submission (you can connect to an edge function later)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast.success("Thanks for your interest! Our team will reach out within 24 hours.");
    setFormData({ name: "", email: "", companyName: "", videoVolume: "", message: "" });
    onOpenChange(false);
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-rocket flex items-center justify-center">
              <Rocket className="h-4 w-4 text-white" />
            </div>
            Contact Sales
          </DialogTitle>
          <DialogDescription>
            Get a custom quote for your agency. Our team will reach out within 24 hours.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@agency.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name *</Label>
            <Input
              id="companyName"
              required
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="Your Agency Inc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="videoVolume">Estimated Monthly Video Volume *</Label>
            <Select
              value={formData.videoVolume}
              onValueChange={(value) => setFormData({ ...formData, videoVolume: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select volume" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10-50">10-50 videos/month</SelectItem>
                <SelectItem value="50-100">50-100 videos/month</SelectItem>
                <SelectItem value="100-500">100-500 videos/month</SelectItem>
                <SelectItem value="500+">500+ videos/month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Additional Notes (Optional)</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Tell us about your agency's needs..."
              rows={3}
            />
          </div>

          <Button
            type="submit"
            className="w-full gradient-primary text-primary-foreground"
            disabled={isSubmitting || !formData.videoVolume}
          >
            {isSubmitting ? (
              "Submitting..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Request
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
