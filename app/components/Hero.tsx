'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import './hero.css';

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
      </div>

      <div className="hero-container">
        <div className="hero-badge">
          <Sparkles size={16} />
          <span>KI-gesteuert · Professionell · Schnell</span>
        </div>

        <h1 className="hero-title">
          Verwandeln Sie Fahrzeugfotos in
          <span className="gradient-text"> Premium-Inserate</span>
        </h1>

        <p className="hero-subtitle">
          Automatische Datenerfassung, Background Removal und Virtual Studio Rendering in unter 2 Minuten.
        </p>

        <div className="hero-buttons">
          <Link href="/dashboard/listing" className="btn-hero-primary">
            Kostenlos testen <ArrowRight size={20} />
          </Link>
          <button className="btn-hero-secondary">Video ansehen</button>
        </div>

        <div className="hero-stats">
          <div className="stat">
            <strong>50K+</strong>
            <span>Inserate erstellt</span>
          </div>
          <div className="stat">
            <strong>98%</strong>
            <span>Kundenzufriedenheit</span>
          </div>
          <div className="stat">
            <strong>2 Min</strong>
            <span>Durchschn. Zeit</span>
          </div>
        </div>
      </div>
    </section>
  );
}
