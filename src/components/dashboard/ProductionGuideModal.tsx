import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Mic, Film, Eye, ArrowRight } from "lucide-react";

interface ProductionGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  {
    icon: Mic,
    title: "Voice Mode → ElevenLabs",
    content: [
      "Copy your Voice-Optimized script into ElevenLabs Speech Synthesis.",
      "Ellipses (...) create natural pauses — keep them in the text.",
      'Use the "Pause" SSML tag for longer beats between sections.',
      "Match the voice style to your Tone setting (e.g. hype = energetic voice).",
    ],
  },
  {
    icon: Film,
    title: "Scene Blueprint → CapCut",
    content: [
      "Each scene card is one shot in your timeline — treat it as a shot-list.",
      "Match the suggested duration to your clip length in CapCut.",
      "Use the Visual Direction notes for framing, angles, and transitions.",
      "Layer your ElevenLabs audio on the main track, then sync visuals.",
    ],
  },
  {
    icon: Eye,
    title: "Overlays → First 2 Seconds",
    content: [
      "Paste the Overlay text as a bold text layer at the very start of your video.",
      "Keep it on screen for the first 1–2 seconds to stop the scroll.",
      "Use large, centered text with a contrasting background or shadow.",
      "Pair with a strong visual cut or zoom to maximize hook retention.",
    ],
  },
];

export function ProductionGuideModal({ open, onOpenChange }: ProductionGuideModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ArrowRight className="h-5 w-5 text-primary" />
            Your Production Roadmap
          </DialogTitle>
          <DialogDescription>
            Follow these steps to turn your generated script into a published short-form video.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-2 min-w-0">
                <h3 className="font-semibold text-sm text-foreground">{step.title}</h3>
                <ul className="space-y-1.5">
                  {step.content.map((line, j) => (
                    <li key={j} className="text-sm text-muted-foreground leading-relaxed flex gap-2">
                      <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
