'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h4>2Fast4Sale</h4>
          <p>KI-gestützte Inserat-Plattform für Autohändler</p>
        </div>
        <div className="footer-section">
          <h5>Produkt</h5>
          <ul>
            <li><Link href="/#features">Features</Link></li>
            <li><Link href="/#pricing">Preise</Link></li>
            <li><Link href="/#faq">FAQ</Link></li>
          </ul>
        </div>
        <div className="footer-section">
          <h5>Rechtliches</h5>
          <ul>
            <li><Link href="/impressum">Impressum</Link></li>
            <li><Link href="/datenschutz">Datenschutz</Link></li>
            <li><Link href="/agb">AGB</Link></li>
          </ul>
        </div>
        <div className="footer-section">
          <h5>Kontakt</h5>
          <ul>
            <li><a href="mailto:info@2fast4sale.com">info@2fast4sale.com</a></li>
            <li><a href="tel:+4917637670637">+49 176 37670637</a></li>
            <li><Link href="/kontakt">Kontaktformular</Link></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} 2Fast4Sale · Fabian Barjamasi. Alle Rechte vorbehalten.</p>
      </div>
    </footer>
  );
}
