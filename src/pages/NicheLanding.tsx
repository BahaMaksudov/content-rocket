import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CanonicalHead } from "@/components/seo/CanonicalHead";
import { ArrowRight, Sparkles, Target, TrendingUp, Zap, Check } from "lucide-react";

interface NicheData {
  title: string;
  subtitle: string;
  description: string;
  metaDescription: string;
  exampleHooks: string[];
  benefits: string[];
  cta: string;
}

const NICHE_DATA: Record<string, NicheData> = {
  "real-estate": {
    title: "AI Viral Scripts for Real Estate Agents",
    subtitle: "Turn property listings into scroll-stopping content",
    description: "Generate viral TikTok, Reels, and YouTube Shorts scripts tailored for real estate. Showcase listings, market updates, and tips that attract buyers and sellers.",
    metaDescription: "Generate viral video scripts for real estate with VidLogic AI. Create TikTok, Reels & Shorts content that sells properties and builds your brand.",
    exampleHooks: [
      "This $2M listing has a secret room nobody knows about…",
      "3 things your realtor will NEVER tell you about buying a home",
      "POV: You just found the most underpriced house in the neighborhood",
    ],
    benefits: ["Showcase listings with viral hooks", "Build authority with market insights", "Attract buyer & seller leads on autopilot"],
    cta: "Start Creating Real Estate Content",
  },
  saas: {
    title: "AI Viral Scripts for SaaS Founders",
    subtitle: "Turn product features into viral growth content",
    description: "Generate attention-grabbing scripts that explain your SaaS product, share founder stories, and drive signups through short-form video content.",
    metaDescription: "Generate viral video scripts for SaaS products with VidLogic AI. Create engaging TikTok & Reels content that drives signups and builds your brand.",
    exampleHooks: [
      "I built a SaaS that makes $50K/month. Here's the feature nobody uses…",
      "Stop paying for tools that do THIS. Use this free alternative instead.",
      "The #1 reason your SaaS demo isn't converting (it's not your product)",
    ],
    benefits: ["Explain complex features simply", "Share founder journey content", "Drive product-led growth through video"],
    cta: "Start Creating SaaS Content",
  },
  fitness: {
    title: "AI Viral Scripts for Fitness Creators",
    subtitle: "Turn workouts into viral content machines",
    description: "Generate high-energy scripts for workout tutorials, nutrition tips, and transformation stories that grow your fitness brand on social media.",
    metaDescription: "Generate viral fitness video scripts with VidLogic AI. Create TikTok, Reels & Shorts content for workouts, nutrition tips, and transformations.",
    exampleHooks: [
      "I did 100 pushups a day for 30 days. The results shocked me.",
      "This ONE exercise replaces your entire ab routine",
      "Your trainer is lying to you about protein. Here's the truth.",
    ],
    benefits: ["Create engaging workout content", "Build a loyal fitness community", "Monetize your expertise through video"],
    cta: "Start Creating Fitness Content",
  },
  ecommerce: {
    title: "AI Viral Scripts for E-Commerce Brands",
    subtitle: "Turn products into must-have viral moments",
    description: "Generate scroll-stopping scripts for product showcases, unboxings, and behind-the-scenes content that drives sales through short-form video.",
    metaDescription: "Generate viral e-commerce video scripts with VidLogic AI. Create TikTok & Reels content that drives sales and builds brand awareness.",
    exampleHooks: [
      "This product sold out 3 times. Here's why everyone's obsessed.",
      "POV: You just found the internet's best-kept shopping secret",
      "I tested every viral product on TikTok. Only these 3 are worth it.",
    ],
    benefits: ["Showcase products with viral hooks", "Drive impulse purchases through video", "Build brand awareness at scale"],
    cta: "Start Creating E-Commerce Content",
  },
  "personal-brand": {
    title: "AI Viral Scripts for Personal Brands",
    subtitle: "Turn your expertise into a viral content empire",
    description: "Generate authentic, authority-building scripts that position you as a thought leader. Perfect for coaches, consultants, and creators.",
    metaDescription: "Generate viral personal brand video scripts with VidLogic AI. Build thought leadership with TikTok, Reels & Shorts content.",
    exampleHooks: [
      "I went from 0 to 100K followers in 90 days. Here's my exact playbook.",
      "The advice that changed my career forever (and nobody talks about it)",
      "Stop doing THIS on LinkedIn. It's killing your personal brand.",
    ],
    benefits: ["Build thought leadership content", "Attract clients and opportunities", "Grow your audience consistently"],
    cta: "Start Building Your Brand",
  },
};

const ALL_NICHES = Object.keys(NICHE_DATA);

export default function NicheLanding() {
  const { niche } = useParams<{ niche: string }>();
  const data = niche ? NICHE_DATA[niche] : null;

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Niche not found</h1>
          <p className="text-muted-foreground">Try one of our supported niches:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {ALL_NICHES.map((n) => (
              <Button key={n} variant="outline" size="sm" asChild>
                <Link to={`/for/${n}`}>{n.replace(/-/g, " ")}</Link>
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CanonicalHead
        title={`${data.title} | VidLogic AI`}
        description={data.metaDescription}
      />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/vidlogic-logo.png" alt="VidLogic AI" className="h-8 w-8 object-contain" />
            <span className="font-bold text-lg">VidLogic <span className="text-primary">AI</span></span>
          </Link>
          <Button asChild className="gradient-primary text-primary-foreground btn-glow">
            <Link to="/auth">Get Started Free</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm bg-primary/10 text-primary border-primary/20">
              <Target className="h-3.5 w-3.5 mr-1.5" />
              {niche?.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())} Niche
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 tracking-tight leading-tight">
              {data.title}
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">{data.description}</p>
            <Button asChild size="lg" className="gradient-primary text-primary-foreground shadow-xl btn-glow h-14 px-10 text-lg">
              <Link to="/auth" className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                {data.cta}
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Example Hooks */}
      <section className="py-16 px-4 bg-card/30 border-y border-border" style={{ contentVisibility: "auto", containIntrinsicSize: "0 500px" }}>
        <div className="container mx-auto max-w-3xl">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.1 }}>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">
              <Zap className="h-6 w-6 inline-block text-primary mr-2" />
              Example Viral Hooks
            </h2>
            <p className="text-center text-muted-foreground mb-8">AI-generated hooks tailored to your niche</p>
            <div className="space-y-4">
              {data.exampleHooks.map((hook, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="bg-card border-border hover:border-primary/30 transition-colors">
                    <CardContent className="p-5 flex items-start gap-3">
                      <span className="text-primary font-bold text-lg shrink-0">#{i + 1}</span>
                      <p className="text-foreground text-base leading-relaxed">"{hook}"</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-4" style={{ contentVisibility: "auto", containIntrinsicSize: "0 400px" }}>
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
            <TrendingUp className="h-6 w-6 inline-block text-primary mr-2" />
            Why VidLogic AI for {niche?.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {data.benefits.map((benefit, i) => (
              <Card key={i} className="bg-card border-border text-center">
                <CardContent className="p-6 space-y-3">
                  <div className="h-10 w-10 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium">{benefit}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-card/30 border-t border-border">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to go viral in {niche?.replace(/-/g, " ")}?</h2>
          <p className="text-muted-foreground mb-8">Join thousands of creators using AI to dominate their niche.</p>
          <Button asChild size="lg" className="gradient-primary text-primary-foreground shadow-xl btn-glow h-14 px-10 text-lg">
            <Link to="/auth" className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Start Free — No Card Required
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} VidLogic AI. All rights reserved.</p>
        <div className="flex justify-center gap-4 mt-3">
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
        </div>
      </footer>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: data.title,
            description: data.metaDescription,
            url: `https://vidlogicai.com/for/${niche}`,
            isPartOf: { "@type": "WebSite", name: "VidLogic AI", url: "https://vidlogicai.com" },
          }),
        }}
      />
    </div>
  );
}

export { ALL_NICHES, NICHE_DATA };
