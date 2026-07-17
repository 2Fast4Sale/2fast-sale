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
  serverExternalPackages: ['pdfkit'],
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
