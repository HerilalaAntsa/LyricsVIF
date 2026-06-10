/**
 * Modèle de données — multi-tenant dès le jour 1.
 * Tout contenu projetable se ramène à un "slide" générique (cf. FIHIRANAVIF.md §4).
 */

export type UUID = string;
export type ISODate = string;

export type Role = "admin" | "operator" | "viewer";
export type Visibility = "private" | "shared";
export type Plan = "free" | "supporter";

export type ServiceItemType =
  | "song"
  | "verse"
  | "announcement"
  | "sermon_point"
  | "image"
  | "countdown";

export interface Branding {
  logo_url?: string;
  primary_color?: string;
  font_family?: string;
}

export interface Church {
  id: UUID;
  name: string;
  slug: string;
  branding: Branding;
  locale_default: string;
  plan: Plan;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface User {
  id: UUID;
  church_id: UUID;
  email: string;
  role: Role;
  created_at: ISODate;
}

/**
 * Une section représente un bloc logique d'un chant (couplet, refrain, pont…).
 * Choix structuré pour permettre la projection slide-par-slide et le futur
 * formatage IA, en remplacement du HTML <br> brut de l'ancien corpus.
 */
export type SongSectionKind = "verse" | "chorus" | "bridge" | "intro" | "outro" | "free";

export interface SongSection {
  kind: SongSectionKind;
  label?: string;
  lines: string[];
}

export interface Song {
  id: UUID;
  church_id: UUID;
  title: string;
  sequence: number | null;
  sections: SongSection[];
  author?: string;
  language: string;
  visibility: Visibility;
  forked_from?: UUID | null;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface BibleVersion {
  id: UUID;
  name: string;
  language: string;
  license: string;
}

export interface Verse {
  id: string;
  version_id: UUID;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface Service {
  id: UUID;
  church_id: UUID;
  date: ISODate;
  title: string;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface ServiceItem {
  id: UUID;
  service_id: UUID;
  order: number;
  type: ServiceItemType;
  ref_id?: UUID | string;
  payload?: Record<string, unknown>;
  background_id?: UUID | null;
}

export interface Background {
  id: UUID;
  church_id: UUID;
  kind: "image" | "video";
  url: string;
  cached_blob_key?: string;
  source?: "canva" | "upload" | "external";
}
