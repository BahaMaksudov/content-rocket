import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CanonicalHead } from "@/components/seo/CanonicalHead";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <CanonicalHead
        title="Privacy Policy | VidLogic AI"
        description="Learn how VidLogic AI collects, uses, and protects your personal information. Our AI Content Agent and Viral Script Generator are built with privacy in mind."
      />
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/vidlogic-logo.png" alt="VidLogic AI" className="h-9 w-9 object-contain" />
            <span className="font-bold text-lg">VidLogic AI</span>
          </Link>
          <Button variant="ghost" asChild>
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <article className="prose prose-invert prose-lg max-w-none">
          <h1 className="text-4xl font-bold mb-2 text-foreground">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 27, 2026</p>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to VidLogic AI ("we," "our," or "us"). We are committed to protecting your privacy and ensuring
              the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and
              safeguard your information when you use our AI-powered content repurposing platform.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">
              2. Information We Collect
            </h2>
            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">2.1 Account Information</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you create an account, we collect your name, email address, and password. If you sign up using a
              third-party service (like Google), we receive basic profile information from that provider.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">2.2 Content Data</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We process YouTube video URLs and transcripts that you submit for content generation. This includes the
              video metadata, transcripts, and any generated content (threads, posts, blogs, images).
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">2.3 Payment Information</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Payment processing is handled securely by Stripe. We do not store your full credit card number, CVV, or
              other sensitive payment details on our servers. Stripe may share limited transaction information with us,
              such as the last four digits of your card and billing address for record-keeping.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">2.4 Usage Data</h3>
            <p className="text-muted-foreground leading-relaxed">
              We automatically collect information about how you interact with our service, including pages visited,
              features used, generation history, and technical data like browser type, device information, and IP
              address.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">
              3. How We Use Your Information
            </h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>To provide and maintain our AI content generation services</li>
              <li>To process your transactions and manage your subscription</li>
              <li>To personalize your experience and improve our algorithms</li>
              <li>To communicate with you about updates, features, and support</li>
              <li>To detect, prevent, and address technical issues or fraud</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">
              4. AI Processing
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              VidLogic AI uses artificial intelligence to analyze video content and generate text and images. Your
              submitted content is processed by our AI systems and may be temporarily stored for processing purposes.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We do not use your personal content to train our AI models without your explicit consent. Generated
              content belongs to you and can be deleted from our systems upon request.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">
              5. Data Sharing & Disclosure
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We do not sell your personal information. We may share data with:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>
                <strong className="text-foreground">Service Providers:</strong> Stripe (payments), cloud hosting
                providers, and analytics services
              </li>
              <li>
                <strong className="text-foreground">Legal Requirements:</strong> When required by law or to protect our
                rights
              </li>
              <li>
                <strong className="text-foreground">Business Transfers:</strong> In connection with a merger,
                acquisition, or sale of assets
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">
              6. Data Security
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures including encryption, secure servers, and regular
              security audits. However, no method of transmission over the Internet is 100% secure, and we cannot
              guarantee absolute security.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">7. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Depending on your location, you may have the right to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Access and receive a copy of your personal data</li>
              <li>Correct inaccurate or incomplete information</li>
              <li>Delete your personal data</li>
              <li>Object to or restrict processing</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">
              8. Data Deletion &amp; Retention
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Users may request the deletion of their personal data at any time by following the
              instructions on our{" "}
              <Link to="/data-deletion" className="text-primary hover:underline">
                Data Deletion page
              </Link>{" "}
              or by contacting support. Once requested, all stored user data will be purged from
              our databases within 30 days.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">9. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar technologies to maintain your session, remember preferences, and analyze usage
              patterns. You can control cookie settings through your browser preferences.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">
              10. Changes to This Policy
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new
              policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy or our data practices, please contact us at{" "}
              <a href="mailto:support@vidlogicai.com" className="text-primary hover:underline">
                support@vidlogicai.com
              </a>{" "}
              or visit our{" "}
              <Link to="/contact" className="text-primary hover:underline">
                Contact page
              </Link>
              .Sharon, MA USA
            </p>
          </section>
        </article>
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} VidLogic AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
