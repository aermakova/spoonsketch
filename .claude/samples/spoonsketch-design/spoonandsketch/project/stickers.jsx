// stickers.jsx — painted flora & kitchen SVG stickers. Painterly, slightly rough.

// All stickers render into a viewBox that fills their container.
// Usage: <Sticker kind="tomato" size={64} rotate={-8} />

const stickerDefs = {
  tomato: (
    <g>
      <defs>
        <radialGradient id="tomato-g" cx="40%" cy="38%">
          <stop offset="0%" stopColor="#ff8e74"/>
          <stop offset="55%" stopColor="#d94a30"/>
          <stop offset="100%" stopColor="#8a2a18"/>
        </radialGradient>
      </defs>
      <path d="M50 22 Q 72 22 80 44 Q 86 66 70 80 Q 52 92 38 84 Q 18 76 16 54 Q 16 32 34 24 Q 42 20 50 22Z" fill="url(#tomato-g)" stroke="#6e1f10" strokeWidth="1.5"/>
      <path d="M50 22 Q 54 18 58 16 M 50 22 Q 46 16 40 14 M 50 22 Q 50 16 52 12" stroke="#4d6a2a" strokeWidth="3" strokeLinecap="round" fill="none"/>
      <path d="M40 34 Q 42 30 48 32" stroke="rgba(255,220,200,0.6)" strokeWidth="4" strokeLinecap="round" fill="none"/>
    </g>
  ),
  lemon: (
    <g>
      <defs>
        <radialGradient id="lemon-g" cx="35%" cy="30%">
          <stop offset="0%" stopColor="#fff4a8"/>
          <stop offset="60%" stopColor="#e8c23a"/>
          <stop offset="100%" stopColor="#9a7a12"/>
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="52" rx="34" ry="26" fill="url(#lemon-g)" stroke="#6e5210" strokeWidth="1.3" transform="rotate(-18 50 52)"/>
      <path d="M18 46 Q 14 44 16 40" stroke="#6e5210" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M82 58 Q 86 60 84 64" stroke="#6e5210" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <ellipse cx="38" cy="38" rx="7" ry="3" fill="rgba(255,255,220,0.6)" transform="rotate(-20 38 38)"/>
    </g>
  ),
  garlic: (
    <g>
      <path d="M50 20 Q 68 20 72 44 Q 76 68 62 80 Q 50 86 38 80 Q 24 68 28 44 Q 32 20 50 20Z" fill="#f6eedf" stroke="#a08a6c" strokeWidth="1.3"/>
      <path d="M50 20 Q 50 44 50 80" stroke="#c9b89a" strokeWidth="1" fill="none"/>
      <path d="M40 26 Q 38 48 42 78" stroke="#c9b89a" strokeWidth="1" fill="none"/>
      <path d="M60 26 Q 62 48 58 78" stroke="#c9b89a" strokeWidth="1" fill="none"/>
      <path d="M50 20 Q 48 12 52 8 Q 54 12 50 20" fill="#8aa56c"/>
    </g>
  ),
  basil: (
    <g>
      <path d="M50 88 Q 50 60 50 22" stroke="#4a6a30" strokeWidth="2.5" fill="none"/>
      <path d="M50 40 Q 30 30 20 40 Q 28 52 50 50Z" fill="#6e9050" stroke="#3a5a22" strokeWidth="1.2"/>
      <path d="M50 30 Q 70 20 80 30 Q 72 42 50 40Z" fill="#88a86a" stroke="#3a5a22" strokeWidth="1.2"/>
      <path d="M50 55 Q 30 50 18 62 Q 28 72 50 66Z" fill="#7a9858" stroke="#3a5a22" strokeWidth="1.2"/>
      <path d="M50 50 Q 70 48 82 58 Q 74 68 50 62Z" fill="#6e9050" stroke="#3a5a22" strokeWidth="1.2"/>
      <path d="M50 22 Q 44 30 50 40" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none"/>
    </g>
  ),
  whisk: (
    <g>
      <rect x="46" y="10" width="8" height="44" rx="4" fill="#b8926a" stroke="#6e4e2a" strokeWidth="1"/>
      <path d="M50 52 Q 28 62 32 82 Q 50 92 68 82 Q 72 62 50 52Z" fill="none" stroke="#8a8a88" strokeWidth="2.2"/>
      <path d="M50 54 Q 44 70 50 88" stroke="#8a8a88" strokeWidth="2" fill="none"/>
      <path d="M50 54 Q 56 70 50 88" stroke="#8a8a88" strokeWidth="2" fill="none"/>
      <path d="M50 54 Q 34 66 42 86" stroke="#8a8a88" strokeWidth="2" fill="none"/>
      <path d="M50 54 Q 66 66 58 86" stroke="#8a8a88" strokeWidth="2" fill="none"/>
    </g>
  ),
  spoon: (
    <g>
      <ellipse cx="32" cy="32" rx="18" ry="14" fill="#d9b08a" stroke="#6e4a24" strokeWidth="1.2" transform="rotate(-35 32 32)"/>
      <ellipse cx="28" cy="28" rx="8" ry="5" fill="rgba(255,245,220,0.5)" transform="rotate(-35 28 28)"/>
      <path d="M44 44 L 82 82" stroke="#a07850" strokeWidth="7" strokeLinecap="round"/>
      <path d="M46 42 L 80 76" stroke="#c4996e" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
    </g>
  ),
  pan: (
    <g>
      <ellipse cx="50" cy="58" rx="34" ry="10" fill="#1a1a1a"/>
      <path d="M16 58 Q 16 78 30 82 L 70 82 Q 84 78 84 58" fill="#2a2a2a"/>
      <ellipse cx="50" cy="58" rx="30" ry="8" fill="#3a3a3a"/>
      <rect x="82" y="55" width="16" height="6" rx="3" fill="#6e4a24"/>
      <ellipse cx="50" cy="56" rx="12" ry="3" fill="rgba(255,200,150,0.3)"/>
    </g>
  ),
  wheat: (
    <g>
      <path d="M50 90 Q 50 50 50 14" stroke="#a07850" strokeWidth="2" fill="none"/>
      {[0,1,2,3,4,5].map(i => (
        <g key={i} transform={`translate(50 ${76 - i*10})`}>
          <ellipse cx="-7" cy="0" rx="7" ry="3" fill="#d9a441" stroke="#8a6820" strokeWidth="0.8" transform="rotate(-30)"/>
          <ellipse cx="7" cy="0" rx="7" ry="3" fill="#d9a441" stroke="#8a6820" strokeWidth="0.8" transform="rotate(30)"/>
        </g>
      ))}
      <ellipse cx="50" cy="14" rx="4" ry="6" fill="#d9a441" stroke="#8a6820" strokeWidth="0.8"/>
    </g>
  ),
  strawberry: (
    <g>
      <defs>
        <radialGradient id="straw-g" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#ff9a8a"/>
          <stop offset="60%" stopColor="#d9422a"/>
          <stop offset="100%" stopColor="#7a1a10"/>
        </radialGradient>
      </defs>
      <path d="M50 22 Q 74 24 76 48 Q 74 72 50 88 Q 26 72 24 48 Q 26 24 50 22Z" fill="url(#straw-g)" stroke="#5a1208" strokeWidth="1.2"/>
      <path d="M30 28 Q 40 18 50 20 Q 60 18 70 28 Q 62 34 50 32 Q 38 34 30 28Z" fill="#6e9050" stroke="#3a5a22" strokeWidth="1"/>
      {[[40,40],[55,50],[38,58],[58,66],[46,72],[64,38]].map(([x,y],i) => (
        <ellipse key={i} cx={x} cy={y} rx="1.5" ry="2" fill="#f5e2a0"/>
      ))}
    </g>
  ),
  flower: (
    <g>
      {[0,1,2,3,4].map(i => {
        const a = i * 72 - 90;
        const x = 50 + Math.cos(a * Math.PI / 180) * 22;
        const y = 50 + Math.sin(a * Math.PI / 180) * 22;
        return <ellipse key={i} cx={x} cy={y} rx="14" ry="10" fill="#eaa0a8" stroke="#a84858" strokeWidth="1" transform={`rotate(${a + 90} ${x} ${y})`}/>;
      })}
      <circle cx="50" cy="50" r="9" fill="#f2d98d" stroke="#a07820" strokeWidth="1"/>
      <circle cx="48" cy="48" r="3" fill="#fff7d0" opacity="0.7"/>
    </g>
  ),
  leaf: (
    <g>
      <path d="M20 80 Q 40 40 80 20 Q 76 60 36 84 Q 24 84 20 80Z" fill="#8caa68" stroke="#3a5a22" strokeWidth="1.3"/>
      <path d="M22 80 Q 50 50 78 22" stroke="#3a5a22" strokeWidth="1.5" fill="none"/>
      {[30,40,50,60].map(t => (
        <path key={t} d={`M ${22 + t*0.6} ${80 - t*0.6} Q ${30 + t*0.4} ${76 - t*0.8} ${40 + t*0.3} ${72 - t}`} stroke="#3a5a22" strokeWidth="0.8" fill="none" opacity="0.6"/>
      ))}
    </g>
  ),
  heart: (
    <g>
      <path d="M50 82 Q 14 58 14 38 Q 14 20 32 20 Q 44 20 50 34 Q 56 20 68 20 Q 86 20 86 38 Q 86 58 50 82Z" fill="#d97b7b" stroke="#7a2838" strokeWidth="1.4"/>
      <ellipse cx="36" cy="34" rx="8" ry="5" fill="rgba(255,220,220,0.55)" transform="rotate(-30 36 34)"/>
    </g>
  ),
  star: (
    <g>
      <path d="M50 14 L 60 40 L 88 42 L 66 60 L 74 86 L 50 70 L 26 86 L 34 60 L 12 42 L 40 40 Z" fill="#f2d98d" stroke="#a07820" strokeWidth="1.2"/>
    </g>
  ),
  mushroom: (
    <g>
      <path d="M20 50 Q 20 24 50 22 Q 80 24 80 50 Q 80 56 72 56 L 28 56 Q 20 56 20 50Z" fill="#c85a48" stroke="#5a1810" strokeWidth="1.3"/>
      {[[35,40],[55,32],[68,46],[30,46],[50,48]].map(([x,y],i) => (
        <ellipse key={i} cx={x} cy={y} rx="5" ry="4" fill="#f8e8d4" opacity="0.85"/>
      ))}
      <path d="M36 56 Q 32 78 34 86 Q 50 90 66 86 Q 68 78 64 56Z" fill="#f8ecd8" stroke="#a0826a" strokeWidth="1"/>
    </g>
  ),
  bread: (
    <g>
      <path d="M20 54 Q 18 36 36 30 Q 50 24 66 30 Q 84 36 82 54 Q 80 74 62 80 Q 50 84 38 80 Q 22 74 20 54Z" fill="#d9a668" stroke="#6e4820" strokeWidth="1.3"/>
      <path d="M30 44 Q 38 38 46 42 M 54 38 Q 62 42 70 40 M 36 54 Q 44 50 52 54 M 60 54 Q 66 50 72 54" stroke="#6e4820" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
      <path d="M26 50 Q 40 38 50 40" stroke="rgba(255,230,190,0.6)" strokeWidth="4" fill="none" strokeLinecap="round"/>
    </g>
  ),
  cherry: (
    <g>
      <path d="M30 30 Q 50 10 70 28" stroke="#4a6a30" strokeWidth="2.5" fill="none"/>
      <circle cx="32" cy="62" r="18" fill="#b82438" stroke="#5a1018" strokeWidth="1.3"/>
      <circle cx="68" cy="66" r="18" fill="#b82438" stroke="#5a1018" strokeWidth="1.3"/>
      <ellipse cx="26" cy="56" rx="6" ry="4" fill="rgba(255,200,200,0.6)"/>
      <ellipse cx="62" cy="60" rx="6" ry="4" fill="rgba(255,200,200,0.6)"/>
      <path d="M30 30 Q 38 26 42 36 M 70 28 Q 64 34 60 42" stroke="#6e9050" strokeWidth="2" fill="none"/>
    </g>
  ),
};

function Sticker({ kind, size = 56, rotate = 0, style = {}, shadow = true, className = '' }) {
  const def = stickerDefs[kind];
  if (!def) return null;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size} height={size}
      className={className}
      style={{
        transform: `rotate(${rotate}deg)`,
        filter: shadow ? 'drop-shadow(2px 3px 2px rgba(80,50,30,0.22))' : 'none',
        ...style,
      }}
    >{def}</svg>
  );
}

const ALL_STICKERS = Object.keys(stickerDefs);

Object.assign(window, { Sticker, ALL_STICKERS, stickerDefs });
