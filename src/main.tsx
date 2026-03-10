import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Defer analytics initialization until after main render
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    import("./lib/posthog").then(({ initPostHog }) => initPostHog());
  });
} else {
  setTimeout(() => {
    import("./lib/posthog").then(({ initPostHog }) => initPostHog());
  }, 2000);
}
