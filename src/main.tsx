import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "@/styles/index.css";
import "@/i18n";
import { router } from "@/router";
import { ensureSeeded } from "@/lib/db/seed";
import { AuthBootstrap } from "@/features/auth/AuthBootstrap";

const root = createRoot(document.getElementById("root")!);

function render() {
  root.render(
    <StrictMode>
      <AuthBootstrap />
      <RouterProvider router={router} />
    </StrictMode>,
  );
}

ensureSeeded()
  .catch((err: unknown) => {
    console.error("[seed] échec du chargement initial", err);
  })
  .finally(render);
