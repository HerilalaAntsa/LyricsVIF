import { createBrowserRouter, Navigate } from "react-router-dom";
import { ConsoleSongsPage } from "@/features/console/ConsoleSongsPage";
import { ConsoleSongDetail } from "@/features/console/ConsoleSongDetail";
import { ConsoleSongsEmpty } from "@/features/console/ConsoleSongsEmpty";
import { ConsoleSongNewPage } from "@/features/console/ConsoleSongNewPage";
import { ConsoleSongEditPage } from "@/features/console/ConsoleSongEditPage";
import { ProjectionPage } from "@/features/projection/ProjectionPage";
import { MobileSongsPage } from "@/features/mobile/MobileSongsPage";
import { MobileSongDetail } from "@/features/mobile/MobileSongDetail";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/console/songs" replace /> },
  { path: "/console", element: <Navigate to="/console/songs" replace /> },
  {
    path: "/console/songs",
    element: <ConsoleSongsPage />,
    children: [
      { index: true, element: <ConsoleSongsEmpty /> },
      { path: "new", element: <ConsoleSongNewPage /> },
      { path: ":id", element: <ConsoleSongDetail /> },
      { path: ":id/edit", element: <ConsoleSongEditPage /> },
    ],
  },
  { path: "/projection", element: <ProjectionPage /> },
  { path: "/m", element: <Navigate to="/m/songs" replace /> },
  { path: "/m/songs", element: <MobileSongsPage /> },
  { path: "/m/songs/:id", element: <MobileSongDetail /> },
]);
