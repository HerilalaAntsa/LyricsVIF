/**
 * Replie les diacritiques (à → a, é → e, ô → o, ñ → n…) et passe en bas de
 * casse. Essentiel pour la recherche malgache : un utilisateur tapant
 * "Misaotra" doit trouver "Misàotra" et inversement (cf. cadrage §5 v1).
 */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}
