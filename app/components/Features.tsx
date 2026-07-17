'use client';

import {
  Zap,
  Layers,
  BarChart3,
  Clock,
  Shield,
  TrendingUp,
} from 'lucide-react';
import './features.css';

export default function Features() {
  const features = [
    {
      icon: <Zap size={32} />,
      title: 'OCR Document Scan',
      description: 'Fahrzeugschein fotografieren ? Alle Daten automatisch erfasst',
    },
    {
      icon: <Layers size={32} />,
      title: 'AI Background Removal',
      description: 'Professionelle Freisteller in Millisekunden mit KI-Präzision',
    },
    {
      icon: <BarChart3 size={32} />,
      title: 'Virtual Studio',
      description: '3 Premium-Hintergründe mit automatischem Branding-Overlay',
    },
    {
      icon: <Clock size={32} />,
      title: 'Multi-Platform Export',
      description: 'AutoScout24, eBay Motors, Eigenplattform · mit einem Klick',
    },
    {
      icon: <Shield size={32} />,
      title: 'Enterprise Security',
      description: 'DSGVO-konform, SSL-verschlüsselt, 99.9% Uptime',
    },
    {
      icon: <TrendingUp size={32} />,
      title: 'Conversion Boost',
      description: 'Bessere Bilder führen zu schnelleren Verkäufen und höheren Preisen',
    },
  ];

  return (
    <section id="features" className="features">
      <div className="features-container">
        <div className="section-header">
          <h2>Was Sie bekommen</h2>
          <p>Alles was Sie für professionelle Fahrzeug-Inserate brauchen</p>
        </div>

        <div className="features-grid">
          {features.map((feature, idx) => (
            <div key={idx} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
