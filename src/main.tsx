import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";
import "./styles/noir-site.css";
import { loadPublicCatalogue } from "./app/data/products";

loadPublicCatalogue().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
  // Hand over from the static boot screen (index.html) once React has painted;
  // on the home page the animated loader is already in the same spot.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => document.getElementById("boot")?.remove()),
  );
});
