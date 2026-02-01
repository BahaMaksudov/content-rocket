/**
 * Generates the `emailRedirectTo` URL used in auth emails.
 *
 * Production domain: https://rocketcontentpro.io
 *
 * Strategy:
 * 1. On the production domain, use it directly
 * 2. On Lovable preview domains, redirect to production for consistent UX
 * 3. On localhost, use localhost for development testing
 */

const PRODUCTION_DOMAIN = "https://rocketcontentpro.io";

export function getEmailRedirectTo(pathname: string = "/auth/callback") {
  const hostname = window.location.hostname;
  const origin = window.location.origin;

  // Production domain - use it directly
  if (hostname === "rocketcontentpro.io" || hostname === "www.rocketcontentpro.io") {
    return `${PRODUCTION_DOMAIN}${pathname}`;
  }

  // Localhost - use localhost for development
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return new URL(pathname, origin).toString();
  }

  // Lovable preview domains - redirect to production for consistent UX
  if (hostname.endsWith(".lovableproject.com") || hostname.endsWith(".lovable.app")) {
    return `${PRODUCTION_DOMAIN}${pathname}`;
  }

  // Default fallback: use production domain
  return `${PRODUCTION_DOMAIN}${pathname}`;
}
