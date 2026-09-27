'use client';

/**
 * Knopf, der die Cookie-Wahl erneut oeffnet.
 *
 * Eine Einwilligung muss jederzeit so einfach widerrufbar sein, wie sie
 * erteilt wurde (Art. 7 Abs. 3 DSGVO). Ohne diesen Knopf gaebe es dafuer
 * keinen Weg: Der Banner erschien genau einmal und danach nie wieder.
 */
export default function CookieWahlAendern() {
  return (
    <button
      type="button"
      onClick={() => {
        try { localStorage.removeItem('cookie_consent'); } catch { /* egal */ }
        window.dispatchEvent(new Event('cookie-banner-oeffnen'));
      }}
      style={{
        marginTop: '8px', padding: '9px 16px', borderRadius: '8px',
        border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a',
        fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      Cookie-Einstellungen ändern
    </button>
  );
}
