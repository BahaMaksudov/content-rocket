import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CanonicalHead } from "@/components/seo/CanonicalHead";

const SUPPORT_EMAIL = "support@vidlogicai.com";

export default function DataDeletion() {
  return (
    <div className="min-h-screen bg-background">
      <CanonicalHead
        title="Data Deletion Instructions | VidLogic AI"
        description="Learn how to disconnect VidLogic AI from your Facebook account and request full deletion of your personal data from our servers."
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
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground m-0">
              Data Deletion Instructions for VidLogic AI
            </h1>
          </div>
          <p className="text-muted-foreground mb-10">Last updated: April 26, 2026</p>

          <section className="mb-10">
            <p className="text-muted-foreground leading-relaxed text-lg">
              VidLogic AI respects your privacy and provides a simple way to remove your data and
              platform connections. Whether you want to disconnect VidLogic AI from a single social
              account or wipe your entire account from our servers, the steps below will guide you
              through the process.
            </p>
          </section>

          {/* Step-by-step */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-6">
              Disconnect VidLogic AI from Facebook
            </h2>

            <ol className="space-y-4 list-none pl-0">
              {[
                "Log in to your Facebook Account.",
                "Go to Settings & Privacy > Settings.",
                "In the left sidebar, click on Apps and Websites.",
                "Find VidLogic AI in your list of connected apps.",
                "Click the Remove button next to VidLogic AI to revoke its access.",
              ].map((step, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card/40"
                >
                  <span className="shrink-0 h-8 w-8 rounded-full bg-primary text-primary-foreground font-semibold flex items-center justify-center text-sm">
                    {idx + 1}
                  </span>
                  <p className="text-foreground leading-relaxed m-0">{step}</p>
                </li>
              ))}
            </ol>

            <p className="text-muted-foreground leading-relaxed mt-6">
              Once removed, Facebook will no longer share data with VidLogic AI and we will stop
              receiving updates from your Facebook account. The same steps apply on Instagram via
              <span className="text-foreground"> Settings &gt; Accounts Center &gt; Connected Apps</span>.
            </p>
          </section>

          {/* Full account wipe */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">
              Request a Full Account &amp; Data Wipe
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Disconnecting VidLogic AI from Facebook revokes platform access, but does not erase
              data already stored in our system. To request a full account and data wipe from our
              servers, please contact us at the email below with the subject{" "}
              <span className="text-foreground font-medium">"Data Deletion Request"</span>.
            </p>

            <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground m-0">Email</p>
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=Data%20Deletion%20Request`}
                  className="text-foreground font-medium hover:text-primary transition-colors break-all"
                >
                  {SUPPORT_EMAIL}
                </a>
              </div>
            </div>

            <p className="text-muted-foreground leading-relaxed mt-6">
              Once we receive your request, all stored user data — including generations, brand
              voices, social connections, and account details — will be purged from our databases
              within 30 days. You will receive a confirmation email when the deletion is complete.
            </p>
          </section>

          {/* Self-serve in-app */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">
              Delete Your Account Yourself
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              If you are signed in, you can also delete your VidLogic AI account directly from{" "}
              <Link to="/settings" className="text-primary hover:underline">
                Settings
              </Link>{" "}
              under the "Danger Zone" section. This triggers an immediate, irreversible cleanup
              across all of our systems.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2 mb-4">
              Questions?
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              For more information about how we handle your data, please review our{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>{" "}
              or reach out via our{" "}
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
          © {new Date().getFullYear()} VidLogic AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
