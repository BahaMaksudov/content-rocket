import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ScrollToTop } from "@/components/ScrollToTop";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { SessionRefreshOnRoute } from "@/components/auth/SessionRefreshOnRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import AuthConfirm from "./pages/AuthConfirm";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Team from "./pages/Team";
import BrandVoices from "./pages/BrandVoices";
import Billing from "./pages/Billing";
import Settings from "./pages/Settings";
import Developer from "./pages/Developer";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import Unsubscribe from "./pages/Unsubscribe";
import Privacy from "./pages/Privacy";
import DataDeletion from "./pages/DataDeletion";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import YouTubeToLinkedIn from "./pages/tools/YouTubeToLinkedIn";

import AgentSettings from "./pages/AgentSettings";
import AgentQueue from "./pages/AgentQueue";
import Blog from "./pages/Blog";
import HowToRepurposeYouTubeVideos from "./pages/blog/HowToRepurposeYouTubeVideos";
import NicheLanding from "./pages/NicheLanding";
import OAuthSocialCallback from "./pages/OAuthSocialCallback";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SubscriptionProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <SessionRefreshOnRoute />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/confirm" element={<AuthConfirm />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brand-voices"
              element={
                <ProtectedRoute>
                  <BrandVoices />
                </ProtectedRoute>
              }
            />
            <Route
              path="/team"
              element={
                <ProtectedRoute>
                  <Team />
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing"
              element={
                <ProtectedRoute>
                  <Billing />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/developer"
              element={
                <ProtectedRoute>
                  <Developer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment-success"
              element={
                <ProtectedRoute>
                  <PaymentSuccess />
                </ProtectedRoute>
              }
              />
            <Route path="/payment-canceled" element={<PaymentCanceled />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/data-deletion" element={<DataDeletion />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/agent" element={<Navigate to="/agent/queue" replace />} />
            <Route
              path="/agent/settings"
              element={
                <ProtectedRoute>
                  <AgentSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agent/queue"
              element={
                <ProtectedRoute>
                  <AgentQueue />
                </ProtectedRoute>
              }
            />
            <Route
              path="/oauth/social/callback"
              element={
                <ProtectedRoute>
                  <OAuthSocialCallback />
                </ProtectedRoute>
              }
            />
            <Route path="/tools/youtube-to-linkedin" element={<YouTubeToLinkedIn />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/how-to-repurpose-youtube-videos" element={<HowToRepurposeYouTubeVideos />} />
            <Route path="/for/:niche" element={<NicheLanding />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CookieConsentBanner />
        </BrowserRouter>
        </TooltipProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
