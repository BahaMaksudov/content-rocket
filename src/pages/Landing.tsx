import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Zap, Target, Edit3, Download, Mic } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "AI-Powered Generation",
    description: "Transform any YouTube video into viral content across multiple platforms in seconds.",
  },
  {
    icon: Target,
    title: "Multi-Platform Output",
    description: "Get X hooks, LinkedIn posts, TikTok scripts, and SEO blog posts from one video.",
  },
  {
    icon: Mic,
    title: "Brand Voice Presets",
    description: "Save your unique writing style and apply it to all future generations.",
  },
  {
    icon: Edit3,
    title: "Inline Editing",
    description: "Refine and customize every piece of content before publishing.",
  },
  {
    icon: Download,
    title: "Export Anywhere",
    description: "Download your content as PDF or Markdown for easy sharing.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Gradient background effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        
        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-3xl mx-auto text-center">
            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary animate-glow">
                <Sparkles className="h-7 w-7 text-primary-foreground" />
              </div>
            </div>

            <h1 className="text-4xl lg:text-6xl font-bold mb-6 animate-fade-in">
              Turn YouTube Videos into
              <span className="text-gradient block mt-2">Viral Content</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in">
              Transform any YouTube video into engaging X hooks, LinkedIn posts, TikTok scripts, 
              and SEO-optimized blog posts with AI-powered content repurposing.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
              <Button asChild size="lg" className="gradient-primary text-primary-foreground text-lg px-8">
                <Link to="/auth">Get Started Free</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8">
                <Link to="/auth">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="py-20 lg:py-32 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Everything You Need to Repurpose Content
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our platform automates the entire content transformation process, 
              so you can focus on creating more value.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <Card
                key={feature.title}
                className="border-border bg-card hover:border-primary/50 transition-colors group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-lg gradient-primary flex items-center justify-center mb-4 group-hover:animate-glow transition-all">
                    <feature.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Output Types Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              What You'll Get
            </h2>
            <p className="text-lg text-muted-foreground">
              From one YouTube video, generate all this content:
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { count: "5", label: "X (Twitter) Hooks", desc: "Viral opening lines" },
              { count: "1", label: "LinkedIn Post", desc: "Problem-Agitation-Solution" },
              { count: "3", label: "Short-form Scripts", desc: "TikTok/Reels ready" },
              { count: "1", label: "Blog Post", desc: "500-word SEO optimized" },
            ].map((item) => (
              <Card key={item.label} className="text-center border-border bg-card">
                <CardContent className="p-6">
                  <div className="text-4xl font-bold text-gradient mb-2">{item.count}</div>
                  <div className="font-semibold mb-1">{item.label}</div>
                  <div className="text-sm text-muted-foreground">{item.desc}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-card/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Ready to 10x Your Content Output?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Join creators who are saving hours every week by repurposing their YouTube content.
          </p>
          <Button asChild size="lg" className="gradient-primary text-primary-foreground text-lg px-10">
            <Link to="/auth">Start Repurposing Now</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 Repurpose. Transform your content, amplify your reach.</p>
        </div>
      </footer>
    </div>
  );
}
