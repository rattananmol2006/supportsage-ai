import React, { useState, useRef } from 'react';
import { Upload } from 'lucide-react';

export default function TiltCard() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop');
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const tiltX = ((y - centerY) / centerY) * -15;
    const tiltY = ((x - centerX) / centerX) * 15;
    setTilt({ x: tiltX, y: tiltY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  // Note: The upload feature from the original code is removed to fit a marketing site.

  const shadowX = tilt.y * 0.5;
  const shadowY = tilt.x * 0.5;
  const shadowBlur = 40 + Math.abs(tilt.x + tilt.y) * 0.5;

  return (
    <div className="w-full flex items-center justify-center p-8 relative overflow-hidden bg-transparent">
      <div className="relative z-10">
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-80 h-96 cursor-pointer overflow-hidden transition-all duration-200 ease-out border border-gray-200 rounded-xl bg-white shadow-xl"
          style={{
            transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.02, 1.02, 1.02)`,
            boxShadow: `${shadowX}px ${shadowY}px ${shadowBlur}px rgba(0, 0, 0, 0.1)`,
          }}
        >
          <div className="p-0 h-full relative group">
            <img
              src={imageUrl}
              alt="Dashboard Preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <h3 className="text-white font-bold text-xl mb-1">SupportSage UI</h3>
              <p className="text-white/80 text-sm">Hover to interact</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
