import posthog from "posthog-js";

// PostHog initialization and utility functions
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

// Check if Do Not Track is enabled
const isDoNotTrackEnabled = (): boolean => {
  if (typeof window === "undefined") return false;
  
  const dnt = 
    navigator.doNotTrack === "1" ||
    navigator.doNotTrack === "yes" ||
    // @ts-expect-error - msDoNotTrack is IE-specific
    navigator.msDoNotTrack === "1" ||
    // @ts-expect-error - doNotTrack on window is for older browsers
    window.doNotTrack === "1";
  
  return dnt;
};

// Check for cookie consent (stored in localStorage)
export const hasAnalyticsConsent = (): boolean => {
  if (typeof window === "undefined") return false;
  const consent = localStorage.getItem("analytics_consent");
  return consent === "true";
};

export const setAnalyticsConsent = (consent: boolean): void => {
  localStorage.setItem("analytics_consent", consent ? "true" : "false");
  if (consent && POSTHOG_KEY) {
    initPostHog();
  } else if (!consent) {
    posthog.opt_out_capturing();
  }
};

// Check if analytics should be enabled
export const shouldEnableAnalytics = (): boolean => {
  // Disable if DNT is enabled
  if (isDoNotTrackEnabled()) return false;
  
  // Check for explicit consent
  return hasAnalyticsConsent();
};

// Initialize PostHog
export const initPostHog = (): void => {
  if (!POSTHOG_KEY) {
    console.warn("PostHog key not configured. Analytics disabled.");
    return;
  }

  if (!shouldEnableAnalytics()) {
    console.log("Analytics disabled due to user preferences.");
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: false, // We'll handle specific events manually
    persistence: "localStorage",
  });
};

// Identify user after login
export const identifyUser = (userId: string, email: string, properties?: Record<string, unknown>): void => {
  if (!shouldEnableAnalytics()) return;
  
  posthog.identify(userId, {
    email,
    ...properties,
  });
};

// Reset user on logout
export const resetUser = (): void => {
  posthog.reset();
};

// Track custom events
export const trackEvent = (eventName: string, properties?: Record<string, unknown>): void => {
  if (!shouldEnableAnalytics()) return;
  
  posthog.capture(eventName, properties);
};

// Specific event tracking functions
export const trackSignUp = (userId: string, email: string): void => {
  trackEvent("Sign Up", { user_id: userId, email });
};

export const trackLogin = (userId: string, email: string): void => {
  trackEvent("Login", { user_id: userId, email });
};

export const trackGenerationStarted = (settings?: Record<string, unknown>): void => {
  trackEvent("Generation Started", settings);
};

export const trackUpgradeClicked = (tier: "pro" | "agency", source?: string): void => {
  trackEvent("Upgrade Clicked", { tier, source });
};

export const trackContactSalesClicked = (source?: string): void => {
  trackEvent("Contact Sales Clicked", { source });
};

export const trackCopyContent = (contentType: string, platform?: string): void => {
  trackEvent("Copy Content", { content_type: contentType, platform });
};

export { posthog };
