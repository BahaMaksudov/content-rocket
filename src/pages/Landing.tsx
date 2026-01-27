import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { 
  Rocket, Zap, Globe, Image, Eye, ArrowRight, Check, 
  Play, Clock, Users, TrendingUp, Sparkles, Twitter,
  Linkedin, Video, FileText, ChevronRight, Star
} from "lucide-react";

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

// Sticky Navigation
function StickyNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-background/95 backdrop-blur-lg border-b border-border shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-rocket flex items-center justify-center">
            <Rocket className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">Rocket Content</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#demo" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Demo</a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link to="/auth">Log in</Link>
          </Button>
          <Button asChild className="gradient-primary text-primary-foreground shadow-lg shadow-primary/25">
            <Link to="/auth">Get Started Free</Link>
          </Button>
        </div>
      </div>
    </motion.nav>
  );
}

// Hero Section
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(217_91%_60%_/_0.3),transparent)]" />
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse-slow" />
      <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-rocket/15 rounded-full blur-[100px] animate-pulse-slow" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black_40%,transparent_100%)] opacity-20" />

      <div className="relative container mx-auto px-4 py-20 lg:py-32">
        <motion.div 
          className="max-w-4xl mx-auto text-center"
          initial="initial"
          animate="animate"
          variants={staggerContainer}
        >
          {/* Trust badge */}
          <motion.div variants={fadeInUp} className="mb-6">
            <Badge variant="secondary" className="px-4 py-2 text-sm font-medium bg-primary/10 text-primary border-primary/20">
              <Sparkles className="h-4 w-4 mr-2" />
              Trusted by 10,000+ creators worldwide
            </Badge>
          </motion.div>

          {/* Main headline */}
          <motion.h1 
            variants={fadeInUp}
            className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6 tracking-tight"
          >
            Turn 1 Video into a
            <span className="block mt-2 bg-gradient-to-r from-primary via-electric to-rocket bg-clip-text text-transparent">
              Month of Content
            </span>
            <span className="block mt-2">in 60 Seconds</span>
          </motion.h1>
          
          {/* Subheadline */}
          <motion.p 
            variants={fadeInUp}
            className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Stop spending hours writing threads, posts, and blogs. Our AI transforms any YouTube video 
            into viral-ready content for every platform—automatically.
          </motion.p>

          {/* CTA buttons */}
          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Button asChild size="lg" className="gradient-primary text-primary-foreground text-lg px-8 h-14 shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-shadow">
              <Link to="/auth" className="flex items-center gap-2">
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 h-14 border-border hover:bg-card">
              <a href="#demo" className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Watch Demo
              </a>
            </Button>
          </motion.div>

          {/* Trust caption */}
          <motion.p variants={fadeInUp} className="text-sm text-muted-foreground">
            No credit card required • Free forever plan available
          </motion.p>

          {/* Stats */}
          <motion.div 
            variants={fadeInUp}
            className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto"
          >
            {[
              { value: "10K+", label: "Creators" },
              { value: "1M+", label: "Content Pieces" },
              { value: "50hrs", label: "Saved Weekly" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gradient">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div 
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-muted-foreground/50 rounded-full" />
        </div>
      </motion.div>
    </section>
  );
}

// Problem Section
function ProblemSection() {
  const problems = [
    { icon: Clock, title: "Hours of Manual Work", desc: "Writing threads, posts, and blogs from scratch takes forever" },
    { icon: Users, title: "Inconsistent Posting", desc: "Running out of content ideas leads to weeks of silence" },
    { icon: TrendingUp, title: "Missed Opportunities", desc: "Your videos have goldmine content going to waste" },
  ];

  return (
    <section className="py-20 lg:py-32 relative">
      <div className="container mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4 text-rocket border-rocket/30">
            The Problem
          </Badge>
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Creating Content is a
            <span className="text-rocket"> Full-Time Job</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            You spend hours recording videos, but then spend even more hours turning that content 
            into posts, threads, and articles. Sound familiar?
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {problems.map((problem, index) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full border-destructive/20 bg-destructive/5 hover:border-destructive/40 transition-colors">
                <CardContent className="p-6 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4 mx-auto">
                    <problem.icon className="h-7 w-7 text-destructive" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{problem.title}</h3>
                  <p className="text-muted-foreground">{problem.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Solution Section (The Big Four)
function SolutionSection() {
  const features = [
    {
      icon: Zap,
      title: "Batch Processing",
      description: "One click generates X threads, LinkedIn posts, TikTok scripts, and SEO blogs simultaneously.",
      color: "primary",
      gradient: "from-primary to-electric"
    },
    {
      icon: Globe,
      title: "Global Reach",
      description: "Instantly translate all content to Spanish, Hindi, or Mandarin while keeping your brand voice.",
      color: "success",
      gradient: "from-success to-emerald-400"
    },
    {
      icon: Image,
      title: "AI Visuals",
      description: "Generate scroll-stopping thumbnails and hero images that match your content perfectly.",
      color: "rocket",
      gradient: "from-rocket to-warning"
    },
    {
      icon: Eye,
      title: "Social Previews",
      description: "See exactly how your content looks on X, LinkedIn, and TikTok before you post.",
      color: "info",
      gradient: "from-info to-primary"
    },
  ];

  return (
    <section id="features" className="py-20 lg:py-32 bg-card/30 relative">
      {/* Background accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
      
      <div className="container mx-auto px-4 relative">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4 text-primary border-primary/30">
            The Solution
          </Badge>
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Four Superpowers,
            <span className="text-gradient"> One Platform</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Rocket Content doesn't just repurpose—it amplifies. Every feature is designed 
            to multiply your reach with minimal effort.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
            >
              <Card className="h-full border-border hover:border-primary/50 transition-all duration-300 group overflow-hidden">
                <CardContent className="p-8">
                  <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Interactive Demo Section
function DemoSection() {
  const [showOutput, setShowOutput] = useState(false);

  return (
    <section id="demo" className="py-20 lg:py-32 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4 text-rocket border-rocket/30">
            See It In Action
          </Badge>
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            From YouTube URL to
            <span className="text-gradient"> Viral Content</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Watch how Rocket Content transforms a single video into platform-optimized content in seconds.
          </p>
        </motion.div>

        {/* Demo mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-5xl mx-auto"
        >
          <div className="rounded-2xl border border-border bg-card p-6 lg:p-8 shadow-2xl shadow-primary/5">
            {/* URL Input mockup */}
            <div className="mb-8">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <Play className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <input 
                    type="text" 
                    readOnly
                    value="https://youtube.com/watch?v=your-awesome-video"
                    className="w-full bg-transparent text-foreground text-sm lg:text-base focus:outline-none"
                  />
                </div>
                <Button 
                  onClick={() => setShowOutput(true)}
                  className="gradient-primary text-primary-foreground"
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  Generate All
                </Button>
              </div>
            </div>

            {/* Output preview */}
            <motion.div 
              initial={false}
              animate={{ opacity: showOutput ? 1 : 0.3 }}
              className="grid lg:grid-cols-2 gap-6"
            >
              {/* X Thread preview */}
              <div className="rounded-xl border border-border bg-background p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Twitter className="h-5 w-5 text-primary" />
                  <span className="font-medium">X Thread</span>
                  {showOutput && (
                    <Badge className="ml-auto bg-success/10 text-success border-success/30">Generated</Badge>
                  )}
                </div>
                <div className="space-y-3">
                  {[
                    "🧵 The secret to 10x productivity that nobody talks about...",
                    "1/ Most people think working harder is the answer. They're wrong.",
                    "2/ After interviewing 100+ top performers, I found ONE thing in common..."
                  ].map((tweet, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: showOutput ? 1 : 0.5, x: 0 }}
                      transition={{ delay: showOutput ? i * 0.2 : 0 }}
                      className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 border-l-2 border-primary"
                    >
                      {tweet}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* LinkedIn preview */}
              <div className="rounded-xl border border-border bg-background p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Linkedin className="h-5 w-5 text-info" />
                  <span className="font-medium">LinkedIn Post</span>
                  {showOutput && (
                    <Badge className="ml-auto bg-success/10 text-success border-success/30">Generated</Badge>
                  )}
                </div>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: showOutput ? 1 : 0.5 }}
                  transition={{ delay: showOutput ? 0.4 : 0 }}
                  className="text-sm text-muted-foreground"
                >
                  <p className="mb-3">
                    <strong>I used to work 80-hour weeks.</strong>
                  </p>
                  <p className="mb-3">
                    Then I discovered a system that changed everything.
                  </p>
                  <p className="text-primary">... see more</p>
                </motion.div>
              </div>

              {/* TikTok Script preview */}
              <div className="rounded-xl border border-border bg-background p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Video className="h-5 w-5 text-rocket" />
                  <span className="font-medium">TikTok Script</span>
                  {showOutput && (
                    <Badge className="ml-auto bg-success/10 text-success border-success/30">Generated</Badge>
                  )}
                </div>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: showOutput ? 1 : 0.5 }}
                  transition={{ delay: showOutput ? 0.6 : 0 }}
                  className="text-sm space-y-2"
                >
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">0:00</Badge>
                    <span className="text-muted-foreground">Hook: "Stop scrolling. This changed my life."</span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">0:05</Badge>
                    <span className="text-muted-foreground">Point 1: The productivity myth...</span>
                  </div>
                </motion.div>
              </div>

              {/* Blog preview */}
              <div className="rounded-xl border border-border bg-background p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-success" />
                  <span className="font-medium">SEO Blog Post</span>
                  {showOutput && (
                    <Badge className="ml-auto bg-success/10 text-success border-success/30">Generated</Badge>
                  )}
                </div>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: showOutput ? 1 : 0.5 }}
                  transition={{ delay: showOutput ? 0.8 : 0 }}
                  className="text-sm text-muted-foreground"
                >
                  <h4 className="font-semibold text-foreground mb-2">
                    The Ultimate Guide to 10x Productivity
                  </h4>
                  <p>
                    In today's fast-paced world, productivity isn't just about working harder—it's about working smarter...
                  </p>
                </motion.div>
              </div>
            </motion.div>

            {!showOutput && (
              <div className="text-center mt-8">
                <Button 
                  size="lg"
                  onClick={() => setShowOutput(true)}
                  className="gradient-primary text-primary-foreground"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Click to See the Magic
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// Pricing Section
function PricingSection() {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for trying out Rocket Content",
      features: [
        "5 generations per month",
        "X threads & LinkedIn posts",
        "Basic brand voice",
        "Community support"
      ],
      cta: "Start Free",
      popular: false
    },
    {
      name: "Pro",
      price: "$29",
      period: "/month",
      description: "For creators serious about growth",
      features: [
        "Unlimited generations",
        "All 4 platform outputs",
        "AI-powered visuals",
        "Global translation (3 languages)",
        "Social previews",
        "Priority support",
        "API access"
      ],
      cta: "Get Pro",
      popular: true
    },
    {
      name: "Agency",
      price: "$99",
      period: "/month",
      description: "For teams managing multiple clients",
      features: [
        "Everything in Pro",
        "10 team members",
        "Unlimited brand voices",
        "White-label exports",
        "Dedicated account manager",
        "Custom integrations",
        "SSO & advanced security"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  return (
    <section id="pricing" className="py-20 lg:py-32 bg-card/30 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      
      <div className="container mx-auto px-4 relative">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4 text-primary border-primary/30">
            Simple Pricing
          </Badge>
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Choose Your
            <span className="text-gradient"> Launch Plan</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free and upgrade when you're ready. No hidden fees, cancel anytime.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative"
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-primary to-rocket text-white shadow-lg">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Most Popular
                  </Badge>
                </div>
              )}
              <Card className={`h-full ${plan.popular ? 'border-primary ring-2 ring-primary/20' : 'border-border'} transition-all duration-300 hover:border-primary/50`}>
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    asChild 
                    className={`w-full ${plan.popular ? 'gradient-primary text-primary-foreground' : ''}`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    <Link to="/auth">
                      {plan.cta}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// FAQ Section
function FAQSection() {
  const faqs = [
    {
      question: "How does Rocket Content work?",
      answer: "Simply paste a YouTube URL and our AI analyzes the transcript to generate platform-optimized content. You get X threads, LinkedIn posts, TikTok scripts, and SEO blog posts—all from one video."
    },
    {
      question: "What languages do you support for translation?",
      answer: "Currently, we support translation to Spanish, Hindi, and Mandarin. More languages are coming soon. Our AI maintains your brand voice across all translations."
    },
    {
      question: "Can I customize the generated content?",
      answer: "Absolutely! All generated content is fully editable. You can also save Brand Voices to ensure consistent tone and style across all your content."
    },
    {
      question: "Do I own the content generated?",
      answer: "Yes, 100%. All content generated through Rocket Content is yours to use however you like—no attribution required."
    },
    {
      question: "What if I'm not satisfied?",
      answer: "We offer a 14-day money-back guarantee on all paid plans. If Rocket Content isn't right for you, just reach out and we'll refund you—no questions asked."
    },
    {
      question: "Is there an API available?",
      answer: "Yes! Pro and Agency plans include API access so you can integrate Rocket Content into your existing workflows and tools."
    }
  ];

  return (
    <section id="faq" className="py-20 lg:py-32 relative">
      <div className="container mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4 text-primary border-primary/30">
            FAQ
          </Badge>
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Got Questions?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about Rocket Content.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="border border-border rounded-xl px-6 data-[state=open]:border-primary/50 transition-colors"
              >
                <AccordionTrigger className="text-left hover:no-underline py-5">
                  <span className="font-medium">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}

// Trust Section
function TrustSection() {
  const logos = [
    "Creator Academy", "Social Surge", "Content Labs", "Viral Media", "Growth Hub"
  ];

  return (
    <section className="py-16 border-t border-b border-border bg-card/30">
      <div className="container mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="text-sm text-muted-foreground mb-8">TRUSTED BY LEADING CREATORS AND AGENCIES</p>
          <div className="flex flex-wrap justify-center items-center gap-8 lg:gap-16">
            {logos.map((logo) => (
              <div 
                key={logo} 
                className="text-xl font-bold text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              >
                {logo}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// CTA Section
function CTASection() {
  return (
    <section className="py-20 lg:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-rocket/10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[100px]" />
      
      <div className="container mx-auto px-4 relative">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Ready to 10x Your
            <span className="text-gradient"> Content Output?</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-10">
            Join thousands of creators who are saving hours every week. 
            Start for free—no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="gradient-primary text-primary-foreground text-lg px-10 h-14 shadow-xl shadow-primary/25">
              <Link to="/auth" className="flex items-center gap-2">
                Get Started Free
                <Rocket className="h-5 w-5" />
              </Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Free forever plan • No credit card required • Cancel anytime
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// Footer
function Footer() {
  return (
    <footer className="py-12 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-rocket flex items-center justify-center">
              <Rocket className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold">Rocket Content</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="mailto:support@rocketcontent.app" className="hover:text-foreground transition-colors">Contact</a>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2025 Rocket Content. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

// Main Landing Page
export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <StickyNav />
      <HeroSection />
      <TrustSection />
      <ProblemSection />
      <SolutionSection />
      <DemoSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
}
