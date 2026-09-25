import type { NextConfig } from 'next';

const securityHeaders = [
  // Kein Clickjacking – Seite darf nicht in iframes eingebettet werden
  { key: 'X-Frame-Options', value: 'DENY' },
  // XSS-Schutz für ältere Browser
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // Kein MIME-Type-Sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Referrer nur bei gleicher Domain
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Kein FLoC / Google-Tracking
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  // HTTPS erzwingen (1 Jahr)
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  /*
   * Die Kennzeichen-Erkennung (lib/studio/kennzeichenModell.ts) laeuft mit
   * onnxruntime-node — ein natives Modul, das nicht gebuendelt werden kann.
   */
  serverExternalPackages: ['pdfkit', '@huggingface/transformers', 'onnxruntime-node'],
  /*
   * onnxruntime-node bringt Laufzeiten fuer alle Systeme mit, zusammen
   * 283 MB. Vercel laeuft auf Linux x64 (44 MB); der Rest wuerde die Grenze
   * von 250 MB je Funktion sprengen.
   */
  outputFileTracingExcludes: {
    '*': [
      'node_modules/**/onnxruntime-node/bin/napi-v*/darwin/**',
      'node_modules/**/onnxruntime-node/bin/napi-v*/win32/**',
      'node_modules/**/onnxruntime-node/bin/napi-v*/linux/arm64/**',
      // Lokaler Modell-Cache vom Testen — auf Vercel laedt die Funktion
      // das Modell selbst nach /tmp.
      'node_modules/@huggingface/transformers/.cache/**',
      // Dasselbe fuer die Freistellmodelle: zusammen ueber 500 MB, sie
      // werden zur Laufzeit nach /tmp geladen.
      'tools/modelle/**',
    ],
  },
  /*
   * Die native Laufzeit selbst wird NICHT von allein mitgenommen: Das
   * Paket laedt sie ueber einen zusammengesetzten Pfad, den die
   * Abhaengigkeitsanalyse nicht sieht. Ohne diese Zeile fehlte sie auf
   * Vercel, und die Kennzeichen-Erkennung waere still ausgefallen.
   * transformers.js bringt seine eigene Fassung (1.24) mit — die zaehlt.
   */
  outputFileTracingIncludes: {
    '/api/studio-eigen/verarbeiten': [
      'node_modules/@huggingface/transformers/node_modules/onnxruntime-node/bin/napi-v*/linux/x64/**',
    ],
    /*
     * Das Freistellen laeuft ueber onnxruntime-node direkt (U-2-Net),
     * nicht ueber transformers.js — deshalb hier die obere Fassung des
     * Pakets. Ohne diese Zeile fehlt die native Laufzeit auf Vercel und
     * jedes Foto fiele still auf den Browser zurueck.
     */
    '/api/studio-eigen/freistellen': [
      'node_modules/onnxruntime-node/bin/napi-v*/linux/x64/**',
    ],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: securityHeaders,
    },
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
