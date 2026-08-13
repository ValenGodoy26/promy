// PROMY mascot — original reinterpretation of the "P with eyes" character.
// Stroke-outlined red P with a round counter, brow line, two big eyes, small dot.
// Built for arbitrary scale.

function PromyMascot({ size = 120, bg = null, rotate = 0, shadow = false, style = {} }) {
  // Stroke relative to 100-unit viewbox.
  const stroke = 5.5;
  return (
    <div style={{
      width: size, height: size,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: bg || 'transparent',
      borderRadius: bg ? '50%' : 0,
      transform: `rotate(${rotate}deg)`,
      boxShadow: shadow ? '0 10px 30px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08)' : 'none',
      ...style,
    }}>
      <svg viewBox="0 0 100 100" width={size * 0.78} height={size * 0.78} style={{overflow:'visible'}}>
        {/* Brow line — subtle arc above eyes */}
        <path
          d="M 28 22 Q 38 15 50 18"
          stroke="#111111" strokeWidth={stroke * 0.7} fill="none"
          strokeLinecap="round"
        />
        {/* The P shape — made of a vertical stem + circular bowl */}
        {/* Stem */}
        <path
          d="M 33 34
             L 33 86
             Q 33 88 35 88
             L 45 88
             Q 47 88 47 86
             L 47 66
             L 58 66
             Q 78 66 78 50
             Q 78 34 58 34
             L 35 34
             Q 33 34 33 34 Z"
          fill="#FF3131"
          stroke="#111111"
          strokeWidth={stroke}
          strokeLinejoin="round"
        />
        {/* Inner counter (the hole of the P) */}
        <ellipse cx="60" cy="50" rx="9" ry="8" fill="#FFBF00" stroke="#111111" strokeWidth={stroke * 0.8} />

        {/* Left eye */}
        <circle cx="32" cy="28" r="6.5" fill="#FFFFFF" stroke="#111111" strokeWidth={stroke * 0.7} />
        <circle cx="33.8" cy="28.8" r="3" fill="#111111" />
        <circle cx="34.6" cy="28" r="1" fill="#FFFFFF" />

        {/* Right eye */}
        <circle cx="45" cy="26" r="6" fill="#FFFFFF" stroke="#111111" strokeWidth={stroke * 0.7} />
        <circle cx="46.6" cy="26.8" r="2.6" fill="#111111" />
        <circle cx="47.3" cy="26.1" r="0.9" fill="#FFFFFF" />

        {/* Tiny dot — character accent */}
        <circle cx="38" cy="42" r="1.8" fill="#111111" />
      </svg>
    </div>
  );
}

// Simplified version — just the P glyph, no face. For watermarks.
function PromyGlyph({ size = 200, color = '#FF3131', strokeColor = '#111111', showStroke = true, style = {} }) {
  const stroke = showStroke ? 5.5 : 0;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{overflow:'visible', ...style}}>
      <path
        d="M 33 12
           L 33 88
           Q 33 90 35 90
           L 45 90
           Q 47 90 47 88
           L 47 66
           L 58 66
           Q 82 66 82 39
           Q 82 12 58 12
           L 35 12
           Q 33 12 33 12 Z"
        fill={color}
        stroke={strokeColor}
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      <ellipse cx="60" cy="39" rx="11" ry="10" fill="none" stroke={strokeColor} strokeWidth={stroke * 0.8} />
    </svg>
  );
}

Object.assign(window, { PromyMascot, PromyGlyph });
