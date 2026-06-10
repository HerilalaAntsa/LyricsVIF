/**
 * Canal de communication console ↔ projection.
 *
 * BroadcastChannel pour les autres onglets/fenêtres (cas réel : la fenêtre
 * /projection est tirée sur le vidéoprojecteur, la console reste sur l'écran
 * opérateur). CustomEvent pour le même onglet (preview pendant le dev).
 * localStorage pour la persistance entre rechargements.
 *
 * 100 % local — aucune dépendance réseau.
 */

import { useEffect, useState } from "react";

export type ProjectionState =
  | { kind: "idle" }
  | { kind: "blackout" }
  | { kind: "song"; songId: string; sectionIndex: number };

interface ProjectionMessage {
  type: "set";
  state: ProjectionState;
}

const CHANNEL = "fihirana:projection";
const STORAGE_KEY = "fihirana:projection:state";
const SAME_TAB_EVENT = "fihirana:projection-state";

function readStored(): ProjectionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ProjectionState;
  } catch {
    // localStorage indispo ou JSON corrompu → état neutre
  }
  return { kind: "idle" };
}

function writeStored(state: ProjectionState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // silencieux : si localStorage n'est pas dispo (mode privé), on perd la
    // persistance mais l'app continue de marcher en mémoire
  }
}

export function setProjectionState(state: ProjectionState): void {
  writeStored(state);
  const bc = new BroadcastChannel(CHANNEL);
  bc.postMessage({ type: "set", state } satisfies ProjectionMessage);
  bc.close();
  window.dispatchEvent(new CustomEvent<ProjectionState>(SAME_TAB_EVENT, { detail: state }));
}

export function projectSong(songId: string, sectionIndex = 0): void {
  setProjectionState({ kind: "song", songId, sectionIndex });
}

export function projectSection(songId: string, sectionIndex: number): void {
  setProjectionState({ kind: "song", songId, sectionIndex });
}

export function blackoutProjection(): void {
  setProjectionState({ kind: "blackout" });
}

export function clearProjection(): void {
  setProjectionState({ kind: "idle" });
}

export function useProjectionState(): ProjectionState {
  const [state, setState] = useState<ProjectionState>(() => readStored());

  useEffect(() => {
    const bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = (event: MessageEvent<ProjectionMessage>) => {
      if (event.data.type === "set") setState(event.data.state);
    };
    const onSameTab = (event: Event) => {
      const detail = (event as CustomEvent<ProjectionState>).detail;
      setState(detail);
    };
    window.addEventListener(SAME_TAB_EVENT, onSameTab);
    // Resync au montage : un autre composant a pu setter pendant qu'on était
    // démonté.
    setState(readStored());
    return () => {
      bc.close();
      window.removeEventListener(SAME_TAB_EVENT, onSameTab);
    };
  }, []);

  return state;
}
