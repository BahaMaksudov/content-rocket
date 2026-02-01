/**
 * Generates the `emailRedirectTo` URL used in auth emails.
 *
 * Problem:
 * - When users sign up from the editor preview domain (*.lovableproject.com),
 *   verification links redirect back to that domain.
 * - On mobile (or logged-out devices) this can show a Lovable login page.
 *
 * Fix:
 * - If we detect the editor preview domain, transform it into the public preview
 *   domain format: https://id-preview--{projectId}.lovable.app
 */
export function getEmailRedirectTo(pathname: string = "/auth/callback") {
  const hostname = window.location.hostname;
  const origin = window.location.origin;

  // Editor preview domain -> public preview domain
  if (hostname.endsWith(".lovableproject.com")) {
    const projectId = hostname.replace(".lovableproject.com", "");
    const publicPreviewOrigin = `https://id-preview--${projectId}.lovable.app`;
    return new URL(pathname, publicPreviewOrigin).toString();
  }

  // Default: current origin (custom domains, localhost, public preview, etc.)
  return new URL(pathname, origin).toString();
}
