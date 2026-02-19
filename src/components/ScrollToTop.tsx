import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (navType !== "POP") {
      // The #root element is the actual scroll container (overflow-y: auto in index.css)
      const rootEl = document.getElementById("root");

      // Reset all possible scroll containers
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      if (rootEl) rootEl.scrollTop = 0;

      // Also scroll after the next paint to catch late-rendering pages
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        if (rootEl) rootEl.scrollTop = 0;
      });
    }
  }, [pathname, navType]);

  return null;
}
