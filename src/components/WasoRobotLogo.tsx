import React from 'react';

interface WasoRobotLogoProps {
  className?: string;
  isSpeaking?: boolean;
  isPulse?: boolean;
  showCircleBg?: boolean;
}

export const WasoRobotLogo: React.FC<WasoRobotLogoProps> = ({
  className = 'w-12 h-12',
  isSpeaking = false,
  isPulse = false,
  showCircleBg = false,
}) => {
  // Direct, verified high-resolution transparent image URL from the user's new ImgBB link
  const imageUrl = "https://i.ibb.co/DPmjQCkB/image-removebg-preview.png";

  if (showCircleBg) {
    return (
      <div 
        className={`relative inline-flex items-center justify-center shrink-0 select-none transition-all duration-300 ${className} ${
          isSpeaking || isPulse 
            ? 'shadow-[0_0_35px_rgba(6,182,212,0.65)] scale-105 border-2 border-cyan-400/50' 
            : 'shadow-[0_0_15px_rgba(6,182,212,0.25)] border border-cyan-500/30'
        }`}
        style={{
          background: 'radial-gradient(circle, rgba(12,46,82,0.85) 0%, rgba(4,11,23,0.98) 100%)',
          borderRadius: '50%',
          overflow: 'hidden',
          WebkitMaskImage: '-webkit-radial-gradient(white, black)', // Fixed iOS and mobile Safari/Chrome clipping bug
        }}
      >
        {/* The Actual Transparent Robot Logo Image (perfectly centered and sized to fit the circle beautifully) */}
        <img
          src={imageUrl}
          alt="WASO Robot Logo"
          className={`w-[85%] h-[85%] object-contain relative z-10 transition-transform duration-300 ${
            isSpeaking ? 'scale-105 animate-pulse' : 'scale-100'
          }`}
          referrerPolicy="no-referrer"
          style={{
            borderRadius: '50%',
          }}
        />
      </div>
    );
  }

  // Purely transparent image with no circle background (used for Header/Navbar)
  return (
    <div 
      className={`relative inline-flex items-center justify-center shrink-0 select-none transition-all duration-300 ${className} ${
        isSpeaking || isPulse ? 'scale-105' : 'scale-100'
      }`}
    >
      <img
        src={imageUrl}
        alt="WASO Robot Logo"
        className={`w-full h-full object-contain relative z-10 transition-transform duration-300 ${
          isSpeaking ? 'scale-105 animate-pulse' : 'scale-100'
        }`}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};


