/**
 * Generates the `emailRedirectTo` URL used in auth emails.
 *
 * Priority:
 * 1. VITE_SITE_URL environment variable (set in Vercel)
 * 2. Production domain fallback: https://rocketcontentpro.io
 *
 * Strategy:
 * 1. Check for VITE_SITE_URL first (Vercel/production)
 * 2. On localhost, use localhost for development testing
 * 3. Otherwise, use the configured site URL
 */

const PRODUCTION_DOMAIN = "https://rocketcontentpro.io";

/**
 * Gets the base site URL from environment or defaults to production domain
 */
export function getSiteUrl(): string {
  // Check VITE_SITE_URL first (set in Vercel env vars)
  const envSiteUrl = import.meta.env.VITE_SITE_URL;
  if (envSiteUrl) {
    // Ensure no trailing slash
    return envSiteUrl.replace(/\/$/, "");
  }
  
  return PRODUCTION_DOMAIN;
}

export function getEmailRedirectTo(pathname: string = "/auth/callback") {
  const hostname = window.location.hostname;
  const origin = window.location.origin;

  // Localhost - use localhost for development
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return new URL(pathname, origin).toString();
  }

  // Preview/dev environments (e.g. *.lovable.app) - use current origin
  if (hostname !== "rocketcontentpro.io" && hostname !== "www.rocketcontentpro.io") {
    return new URL(pathname, origin).toString();
  }

  // Production - use VITE_SITE_URL or production domain
  const siteUrl = getSiteUrl();
  return `${siteUrl}${pathname}`;
}
