import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, Code } from "lucide-react";
import { toast } from "sonner";

interface EmbedGeneratorProps {
  userId: string;
}

export function EmbedGenerator({ userId }: EmbedGeneratorProps) {
  const [copied, setCopied] = useState<"iframe" | "script" | null>(null);

  const embedUrl = `${window.location.origin}/embed/${userId}`;

  const iframeCode = `<iframe
  src="${embedUrl}"
  width="100%"
  height="600"
  frameborder="0"
  style="border: none; border-radius: 12px;"
></iframe>`;

  const scriptCode = `<div id="wall-of-love" data-user="${userId}"></div>
<script>
  (function() {
    var d = document.getElementById('wall-of-love');
    var f = document.createElement('iframe');
    f.src = '${embedUrl}';
    f.style.cssText = 'width:100%;height:600px;border:none;border-radius:12px;';
    d.appendChild(f);
  })();
</script>`;

  const copyToClipboard = (text: string, type: "iframe" | "script") => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Card className="premium-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Code className="h-5 w-5 text-primary" />
          Embed Code
        </CardTitle>
        <p className="text-xs text-muted-foreground">Copy and paste this into your website to display your Wall of Love.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">iFrame Embed</p>
          <Textarea readOnly value={iframeCode} rows={5} className="font-mono text-xs bg-muted/50" />
          <Button size="sm" variant="outline" onClick={() => copyToClipboard(iframeCode, "iframe")} className="w-full">
            {copied === "iframe" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied === "iframe" ? "Copied!" : "Copy iFrame"}
          </Button>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Script Embed</p>
          <Textarea readOnly value={scriptCode} rows={3} className="font-mono text-xs bg-muted/50" />
          <Button size="sm" variant="outline" onClick={() => copyToClipboard(scriptCode, "script")} className="w-full">
            {copied === "script" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied === "script" ? "Copied!" : "Copy Script"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
