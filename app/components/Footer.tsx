'use client';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h4>AutoStudio</h4>
          <p>Premium Automotive Listing Platform</p>
        </div>
        <div className="footer-section">
          <h5>Produkt</h5>
          <ul>
            <li><a href="#">Features</a></li>
            <li><a href="#">Preise</a></li>
            <li><a href="#">FAQ</a></li>
          </ul>
        </div>
        <div className="footer-section">
          <h5>Unternehmen</h5>
          <ul>
            <li><a href="#">Blog</a></li>
            <li><a href="#">Kontakt</a></li>
            <li><a href="#">Datenschutz</a></li>
          </ul>
        </div>
        <div className="footer-section">
          <h5>Folgen Sie uns</h5>
          <ul>
            <li><a href="#">LinkedIn</a></li>
            <li><a href="#">Twitter</a></li>
            <li><a href="#">Instagram</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2024 AutoStudio. Alle Rechte vorbehalten.</p>
      </div>
    </footer>
  );
}