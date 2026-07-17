"use client";
import React from 'react';
import { Car } from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="custom-nav-wrapper">
      <div className="custom-nav-container">
        
        {/* Logo Bereich */}
        <div className="nav-logo-section">
          <div className="nav-icon-box">
            <Car className="nav-icon" />
          </div>
          <span className="nav-logo-text">
            2Fast<span className="blue-accent">Sale</span>
          </span>
        </div>

        {/* Links für Desktop */}
        <div className="nav-links-desktop">
          <a href="#features" className="nav-link">Features</a>
          <a href="#preise" className="nav-link">Preise</a>
          <a href="#kontakt" className="nav-link">Kontakt</a>
        </div>

        {/* Button Bereich */}
        <div className="nav-action-section">
          <Link href="/dashboard" className="nav-main-button">
            Jetzt starten
          </Link>
        </div>
      </div>
    </nav>
  );
}
