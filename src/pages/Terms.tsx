import { Link } from "react-router-dom";
import { ArrowLeft, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-rocket flex items-center justify-center">
              <Rocket className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Rocket Content</span>
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
          <h1 className="text-4xl font-bold mb-2 text-foreground">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 27, 2026</p>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">
              1. Agreement to Terms
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using Rocket Content ("the Service"), you agree to be bound by these Terms of Service
              ("Terms"). If you disagree with any part of the terms, you may not access the Service. These Terms apply
              to all visitors, users, and others who access or use the Service.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">
              2. Description of Service
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Rocket Content is an AI-powered content repurposing platform that transforms YouTube videos into
              multi-platform content including social media posts, blog articles, and visual assets. The Service uses
              artificial intelligence to analyze, transcribe, and generate derivative content.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">
              3. User Accounts
            </h2>
            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">3.1 Registration</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You must register for an account to use certain features of the Service. You agree to provide accurate,
              current, and complete information during registration and to update such information as necessary.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">3.2 Account Security</h3>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for safeguarding your account credentials and for all activities that occur under your
              account. You must notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">
              4. Subscriptions & Payments
            </h2>
            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">4.1 Billing</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Paid features require a subscription. By subscribing, you authorize us to charge your payment method on a
              recurring basis. All payments are processed securely through Stripe.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">4.2 Pricing</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Subscription prices are listed on our website. We reserve the right to change pricing with 30 days'
              notice. Price changes will take effect at the start of your next billing cycle.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">4.3 Refunds</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Subscription fees are generally non-refundable except as required by law. You may cancel your subscription
              at any time, and you will continue to have access until the end of your current billing period.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">4.4 Free Tier</h3>
            <p className="text-muted-foreground leading-relaxed">
              We offer a free tier with limited features. Free tier limitations are subject to change at our discretion.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">
              5. Refund and Cancellation Policy
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We want you to be completely satisfied with Rocket Content. Please review our refund and cancellation
              policies below.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">5.1 7-Day Satisfaction Guarantee</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              First-time subscribers are eligible for a full refund within 7 days of their initial subscription
              purchase, provided they meet the eligibility criteria outlined below.
            </p>

            <h4 className="text-lg font-semibold text-foreground mt-4 mb-2">Eligibility</h4>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
              <li>You must be a first-time subscriber to Rocket Content</li>
              <li>Your refund request must be submitted within 7 days of your initial subscription date</li>
              <li>You must have used fewer than 3 AI Generation credits during your subscription period</li>
              <li>The refund applies only to your first subscription payment, not renewals or upgrades</li>
            </ul>

            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong className="text-foreground">Important:</strong> After the 7-day period has elapsed, or if you have
              used 3 or more AI Generation credits, payments are non-refundable. This policy exists due to the immediate
              and substantial costs associated with AI processing that occur when generations are created.
            </p>

            <h4 className="text-lg font-semibold text-foreground mt-4 mb-2">How to Request a Refund</h4>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
              <li>
                Email us at{" "}
                <a href="mailto:support@rocketcontentpro.io" className="text-primary hover:underline">
                  support@rocketcontentpro.io
                </a>{" "}
                with the subject line "Refund Request"
              </li>
              <li>Include your account email address and the date of your subscription</li>
              <li>Briefly explain the reason for your refund request</li>
              <li>Refund requests are typically processed within 5-7 business days</li>
            </ul>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">5.2 Subscription Management</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You may cancel your subscription at any time through the "Billing" section in your dashboard settings.
              Upon cancellation:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
              <li>Your subscription will not renew at the end of your current billing cycle</li>
              <li>
                You will retain full Pro access and all associated features until the end of your current billing period
              </li>
              <li>No partial refunds are provided for unused time within a billing cycle</li>
              <li>
                You may resubscribe at any time, though the 7-Day Satisfaction Guarantee only applies to first-time
                subscribers
              </li>
            </ul>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">5.3 Technical Issues and Service Credits</h3>
            <p className="text-muted-foreground leading-relaxed">
              If a technical error on our platform prevents an AI generation from completing successfully, we will, at
              our discretion, either refund the AI Generation credit to your account balance or issue a partial monetary
              refund. To report a technical issue, please contact us at{" "}
              <a href="mailto:support@rocketcontentpro.io" className="text-primary hover:underline">
                support@rocketcontentpro.io
              </a>{" "}
              with details of the error, including any error messages received and the approximate time of the incident.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">
              6. Content & Intellectual Property
            </h2>
            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">6.1 Your Content</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You retain ownership of content you submit to the Service. By submitting content, you grant us a limited
              license to process and transform it for the purpose of providing the Service.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">6.2 Generated Content</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Content generated by our AI based on your submissions belongs to you. You are free to use, modify, and
              distribute this content as you see fit.
            </p>

            <h3 className="text-xl font-medium text-foreground mt-6 mb-3">6.3 Responsibility</h3>
            <p className="text-muted-foreground leading-relaxed">
              You are solely responsible for ensuring you have the rights to submit content for processing. Do not
              submit content that infringes on third-party copyrights or intellectual property rights.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">
              7. AI-Generated Content Disclaimer
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Content generated by our AI is provided "as is." While we strive for accuracy and quality:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>AI-generated content may contain errors or inaccuracies</li>
              <li>You are responsible for reviewing and editing generated content before use</li>
              <li>We do not guarantee that generated content is free from plagiarism or copyright issues</li>
              <li>Generated content should not be used for critical decisions without human review</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">
              8. Prohibited Uses
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">You agree not to use the Service to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Generate illegal, harmful, or offensive content</li>
              <li>Infringe on intellectual property rights</li>
              <li>Spread misinformation or create deceptive content</li>
              <li>Harass, abuse, or harm others</li>
              <li>Attempt to reverse-engineer or exploit the Service</li>
              <li>Use automated systems to access the Service without permission</li>
              <li>Violate any applicable laws or regulations</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">9. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may terminate or suspend your account immediately, without prior notice, for any reason, including
              breach of these Terms. Upon termination, your right to use the Service will cease immediately. You may
              also delete your account at any time through your account settings.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">
              10. Limitation of Liability
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, Rocket Content shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from
              your use of the Service. Our total liability shall not exceed the amount you paid us in the twelve months
              preceding the claim.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">
              11. Disclaimer of Warranties
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is provided "as is" and "as available" without warranties of any kind, either express or
              implied, including but not limited to implied warranties of merchantability, fitness for a particular
              purpose, and non-infringement.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">
              12. Changes to Terms
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. We will provide notice of significant changes by
              posting the new Terms on this page and updating the "Last updated" date. Your continued use of the Service
              after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">
              13. Governing Law
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which
              Rocket Content operates, without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">14. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about these Terms, please contact us at{" "}
              <a href="mailto:legal@rocketcontentpro.io" className="text-primary hover:underline">
                legal@rocketcontentpro.io
              </a>{" "}
              or visit our{" "}
              <Link to="/contact" className="text-primary hover:underline">
                Contact page
              </Link>
              .
            </p>
          </section>
        </article>
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Rocket Content. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
