-- Migration 014: Eigener Studio-Hintergrund pro Haendler
--
-- Bewusst am Profil und nicht im localStorage: der Haendler konfiguriert am
-- Rechner, fotografiert aber am Handy. Ausserdem braucht der Server die Farben,
-- weil dort das Bild zusammengesetzt wird.

alter table public.profiles
  add column if not exists custom_background jsonb;

comment on column public.profiles.custom_background is
  'Eigener Studio-Hintergrund: {backdrop, floor, glow, vignette} als Hex-Farben. '
  'Wird von /api/pixelcut serverseitig zum Rendern verwendet.';
