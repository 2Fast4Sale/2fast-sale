/**
 * Zeigt die Anweisung an Gemini genau so, wie sie rausgeht.
 *
 *   npx tsx scripts/anweisung-zeigen.ts                 (auf den Bildschirm)
 *   npx tsx scripts/anweisung-zeigen.ts "Autohaus Muster" > anweisung.txt
 *
 * Warum als Skript und nicht als Datei im Repo: Eine Kopie veraltet. Der
 * Text wird im Code aus Bausteinen zusammengesetzt — der Teil fuer das
 * Kennzeichen haengt davon ab, ob ein Haendlername vorliegt —, und was
 * wirklich bei Google ankommt, weiss nur der Code selbst.
 */

import { anweisungFuerGemini } from '../lib/studio/geminiStudio';

const firma = process.argv[2] ?? null;
const text = anweisungFuerGemini(firma);

const woerter = text.split(/\s+/).length;
console.error(
  `[anweisung] ${text.length} Zeichen, ${woerter} Woerter, rund ${Math.round(woerter * 1.4)} Tokens`
  + ` — bei Gemini sind das Bruchteile eines Cents je Bild.`,
);
console.log(text);
