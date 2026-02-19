import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (navType !== "POP") {
      // Scroll both window and any scrollable containers to top
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      // Also reset any overflow containers (e.g., main content areas)
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [pathname, navType]);

  return null;
}
