import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const BASE_URL = "https://vidlogicai.com";

interface CanonicalHeadProps {
  title?: string;
  description?: string;
}

/**
 * Sets canonical link + unique title/description for each page.
 * Place inside any route component. Falls back to pathname-based canonical.
 */
export function CanonicalHead({ title, description }: CanonicalHeadProps) {
  const { pathname } = useLocation();
  const canonicalUrl = `${BASE_URL}${pathname === "/" ? "" : pathname}`;

  useEffect(() => {
    // Canonical
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonicalUrl;

    // Title
    if (title) document.title = title;

    // Description
    if (description) {
      let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = description;
    }

    return () => {
      // Cleanup canonical on unmount so it doesn't persist across routes
      link?.remove();
    };
  }, [canonicalUrl, title, description]);

  return null;
}
