-- Migration 017: Studio-Bilder in der Abrechnung aufschluesseln
--
-- Hintergrund: Die Bildanzahl bestimmt die Marge staerker als der
-- Inseratspreis. Bei 10 ct/Bild kostet ein Inserat mit 30 Studio-Bildern
-- 3,04 EUR -- mehr als das groesste Paket pro Inserat einnimmt.
--
-- Deshalb: feste Anzahl inklusive, jedes weitere Bild wird berechnet.
-- Damit bleibt die Marge stabil, egal wie intensiv der Haendler das Werkzeug
-- nutzt -- und der Einkaufspreis bei Octopus wird zur Margenfrage statt zur
-- Existenzfrage.

alter table public.listing_charges
  -- Wie viele Bilder wurden insgesamt ins Studio gesetzt
  add column if not exists studio_images integer not null default 0,
  -- Davon ueber dem Inklusivkontingent, also berechnet
  add column if not exists extra_images  integer not null default 0,
  -- Aufschluesselung, damit eine Rechnung spaeter nachvollziehbar bleibt
  add column if not exists base_cents    integer not null default 0,
  add column if not exists extra_cents   integer not null default 0;

comment on column public.listing_charges.studio_images is
  'Anzahl freigestellter Bilder in diesem Inserat.';
comment on column public.listing_charges.extra_images is
  'Davon ueber dem Inklusivkontingent -- nur diese werden zusaetzlich berechnet.';
