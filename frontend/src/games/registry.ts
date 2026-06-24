import type { ComponentType } from "react";
import { MaillonFaiblePage } from "./maillon-faible/MaillonFaiblePage";

export interface GameDefinition {
  id: string;
  title: string;
  description: string;
  badge: string;
  accent: string;
  available: boolean;
  component: ComponentType;
}

export const GAMES: GameDefinition[] = [
  {
    id: "maillon-faible",
    title: "Le Maillon Faible",
    description: "Repondez vite, votez, eliminez le maillon faible.",
    badge: "MF",
    accent: "#dc2626",
    available: true,
    component: MaillonFaiblePage,
  },
];
