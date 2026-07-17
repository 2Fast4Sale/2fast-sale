import React, { useState, useRef, useEffect } from 'react';

interface Vehicle360ViewerProps {
  // Ein Array aus Base64-Strings oder URLs der fertig verarbeiteten Showroom-Bilder
  images: string[]; 
}

export default function Vehicle360Viewer({ images }: Vehicle360ViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const currentImageIndexRef = useRef(0);

  if (!images || images.length === 0) {
    return <div style={{ color: '#94a3b8' }}>Keine 360°-Bilder geladen.</div>;
  }

  // Maus / Touch Interaktion steuern
  const handleStart = (clientX: number) => {
    isDragging.current = true;
    startX.current = clientX;
    currentImageIndexRef.current = currentIndex;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging.current) return;

    const deltaX = clientX - startX.current;
    // Die "Sensi" bestimmt, wie viele Pixel Bewegung ein neues Bild triggern
    const sensitivity = 15; 
    const imageCount = images.length;

    // Berechnen, wie viele Bilder wir weiterrutschen müssen
    const stepChange = Math.floor(deltaX / sensitivity);
    
    // Index berechnen (mit sicherem Wrap-Around für Endlosschleife)
    let newIndex = (currentImageIndexRef.current - stepChange) % imageCount;
    if (newIndex < 0) newIndex += imageCount;

    setCurrentIndex(newIndex);
  };

  const handleEnd = () => {
    isDragging.current = false;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
      <div 
        style={{ 
          width: '100%', 
          aspectRatio: '16/9', 
          position: 'relative', 
          cursor: 'ew-resize',
          userSelect: 'none',
          backgroundColor: '#0f172a',
          borderRadius: '16px',
          overflow: 'hidden'
        }}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
      >
        {/* Alle Bilder unsichtbar vorladen, damit es beim Drehen nicht flackert */}
        {images.map((src, idx) => (
          <img
            key={idx}
            src={src}
            alt={`360 Ansicht ${idx}`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              position: 'absolute',
              top: 0,
              left: 0,
              display: idx === currentIndex ? 'block' : 'none',
              pointerEvents: 'none' // Verhindert standardmäßiges Bild-Dragging im Browser
            }}
          />
        ))}

        {/* Kleiner Info-Badge */}
        <div style={{ position: 'absolute', bottom: '15px', right: '15px', backgroundColor: 'rgba(15,23,42,0.6)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
          360° · Bild {currentIndex + 1}/{images.length}
        </div>
      </div>

      {/* Alternativer Schieberegler für leichtere Bedienung */}
      <input 
        type="range" 
        min="0" 
        max={images.length - 1} 
        value={currentIndex} 
        onChange={(e) => setCurrentIndex(parseInt(e.target.value))}
        style={{ width: '80%', accentColor: '#3b82f6', cursor: 'pointer' }}
      />
      <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Zieh das Bild nach links oder rechts, um das Fahrzeug zu drehen</p>
    </div>
  );
}