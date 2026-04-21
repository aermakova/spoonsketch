// ui.jsx — shared UI bits: icons, food image, tag, time chip, phone status bar lite

// Icon — hand-drawn style, 24x24 default
function Icon({ name, size = 22, color = 'currentColor', strokeWidth = 1.8, style = {} }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', style };
  const paths = {
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-5-5"/></>,
    plus:   <><path d="M12 5v14M5 12h14"/></>,
    heart:  <path d="M12 20s-7-4.5-9-9.5C2 7 4.5 4.5 8 5c1.8.3 3 1.5 4 3 1-1.5 2.2-2.7 4-3 3.5-.5 6 2 5 5.5-2 5-9 9.5-9 9.5z"/>,
    'heart-fill': <path d="M12 20s-7-4.5-9-9.5C2 7 4.5 4.5 8 5c1.8.3 3 1.5 4 3 1-1.5 2.2-2.7 4-3 3.5-.5 6 2 5 5.5-2 5-9 9.5-9 9.5z" fill={color}/>,
    book:   <><path d="M4 5a2 2 0 012-2h12v18H6a2 2 0 01-2-2V5z"/><path d="M4 17h14"/></>,
    home:   <><path d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9z"/></>,
    grid:   <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    user:   <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></>,
    filter: <><path d="M4 5h16l-6 8v6l-4-2v-4L4 5z"/></>,
    clock:  <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    users:  <><circle cx="9" cy="9" r="3.5"/><path d="M3 20a6 6 0 0112 0"/><circle cx="17" cy="10" r="2.8"/><path d="M16 20h5a4 4 0 00-6-3.5"/></>,
    chef:   <><path d="M6 12a4 4 0 01-1-8 4 4 0 017-1 4 4 0 017 1 4 4 0 01-1 8v6a1 1 0 01-1 1H7a1 1 0 01-1-1v-6z"/><path d="M9 12v6M15 12v6"/></>,
    camera: <><path d="M4 7h3l2-2h6l2 2h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z"/><circle cx="12" cy="13" r="4"/></>,
    sparkle: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></>,
    arrow_left: <><path d="M15 5l-7 7 7 7"/></>,
    arrow_right: <><path d="M9 5l7 7-7 7"/></>,
    more:   <><circle cx="5" cy="12" r="1.2" fill={color}/><circle cx="12" cy="12" r="1.2" fill={color}/><circle cx="19" cy="12" r="1.2" fill={color}/></>,
    check:  <><path d="M4 12l5 5L20 6"/></>,
    'check-circle': <><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></>,
    circle: <><circle cx="12" cy="12" r="8"/></>,
    close:  <><path d="M5 5l14 14M19 5L5 19"/></>,
    image:  <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M3 17l5-5 4 4 3-3 6 6"/></>,
    layout: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 10h18M10 10v11"/></>,
    sticker: <><path d="M4 4h12l4 4v12H4z"/><path d="M16 4v4h4"/></>,
    text:   <><path d="M6 6h12M12 6v12M9 20h6"/></>,
    rotate: <><path d="M3 12a9 9 0 1015-6"/><path d="M21 4v5h-5"/></>,
    resize: <><path d="M4 14v6h6M20 10V4h-6"/><path d="M10 20l10-10M4 14l10-10"/></>,
    trash:  <><path d="M4 7h16M10 7V5a1 1 0 011-1h2a1 1 0 011 1v2M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12"/></>,
    tag:    <><path d="M13 3H5a2 2 0 00-2 2v8l8 8 10-10-8-8z"/><circle cx="8" cy="8" r="1.5"/></>,
    bookmark: <><path d="M7 3h10a1 1 0 011 1v17l-6-4-6 4V4a1 1 0 011-1z"/></>,
    pdf:    <><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z"/><path d="M14 3v6h6M8 14h8M8 18h5"/></>,
    share:  <><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8 11l8-4M8 13l8 4"/></>,
    flame:  <><path d="M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4-1 3 1 4 2 4 0-3-2-5 1-10z"/></>,
    timer:  <><circle cx="12" cy="13" r="8"/><path d="M12 13V8M9 2h6"/></>,
    leaf:   <><path d="M3 21c0-8 5-14 18-15-1 13-7 18-15 18-2 0-3-1-3-3z"/><path d="M3 21c5-5 9-8 18-15"/></>,
    download: <><path d="M12 4v12M6 12l6 6 6-6M5 20h14"/></>,
    folder: <><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></>,
    save:   <><path d="M5 3h11l3 3v13a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"/><path d="M7 3v6h9V3M7 21v-7h10v7"/></>,
    eye:    <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></>,
    link:   <><path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/></>,
    chevron_right: <><path d="M9 5l7 7-7 7"/></>,
    chevron_down: <><path d="M5 9l7 7 7-7"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.2-1.8l2-1.5-2-3.4-2.3.9a7 7 0 00-3-1.8L13 2h-4l-.5 2.4a7 7 0 00-3 1.8L3.2 5.3l-2 3.4 2 1.5A7 7 0 003 12a7 7 0 00.2 1.8l-2 1.5 2 3.4 2.3-.9a7 7 0 003 1.8L9 22h4l.5-2.4a7 7 0 003-1.8l2.3.9 2-3.4-2-1.5c.1-.6.2-1.2.2-1.8z"/></>,
    brush: <><path d="M4 20c0-3 2-4 4-4s3 1 3 3-2 3-4 3-3 0-3-2z"/><path d="M20 4l-9 9-3-3 9-9 3 3z"/></>,
    grain: <><circle cx="6" cy="6" r="1" fill={color}/><circle cx="12" cy="6" r="1" fill={color}/><circle cx="18" cy="6" r="1" fill={color}/><circle cx="6" cy="12" r="1" fill={color}/><circle cx="18" cy="12" r="1" fill={color}/><circle cx="6" cy="18" r="1" fill={color}/><circle cx="12" cy="18" r="1" fill={color}/><circle cx="18" cy="18" r="1" fill={color}/></>,
    minus: <path d="M5 12h14"/>,
  };
  return <svg {...common}>{paths[name] || null}</svg>;
}

// FoodImage — painterly placeholder for food photos. Pass palette for variety.
function FoodImage({ palette = ['#d97b7b', '#d9a441', '#8c9f6e'], aspect, style = {}, label, grain = true, strokes = true, children }) {
  const [a, b, c] = palette;
  const id = React.useId().replace(/:/g, '');
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: 'inherit',
      background: '#e9a488',
      aspectRatio: aspect,
      ...style,
    }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <defs>
          <filter id={`paint-${id}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" seed={palette[0].length}/>
            <feDisplacementMap in="SourceGraphic" scale="14"/>
          </filter>
          <filter id={`grain-${id}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/>
            <feColorMatrix values="0 0 0 0 0.25 0 0 0 0 0.18 0 0 0 0 0.12 0 0 0 0.3 0"/>
          </filter>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill={b}/>
        <g filter={`url(#paint-${id})`}>
          <ellipse cx="30" cy="30" rx="35" ry="30" fill={a} opacity="0.9"/>
          <ellipse cx="72" cy="64" rx="30" ry="26" fill={c} opacity="0.85"/>
          <ellipse cx="50" cy="50" rx="20" ry="16" fill={a} opacity="0.5"/>
          {strokes && <>
            <path d="M0 48 Q 25 38 50 52 T 100 48" stroke="rgba(255,255,255,0.25)" strokeWidth="6" fill="none"/>
            <path d="M0 68 Q 25 58 50 72 T 100 68" stroke="rgba(0,0,0,0.12)" strokeWidth="8" fill="none"/>
            <path d="M0 28 Q 25 18 50 32 T 100 28" stroke="rgba(255,255,255,0.18)" strokeWidth="5" fill="none"/>
          </>}
        </g>
        {grain && <rect x="0" y="0" width="100" height="100" filter={`url(#grain-${id})`} opacity="0.55"/>}
        <rect x="0" y="0" width="100" height="100" fill="url(#sheen)" opacity="0.15"/>
      </svg>
      {label && (
        <div style={{
          position: 'absolute', left: 10, bottom: 10,
          fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 9,
          color: 'rgba(255,255,255,0.8)', letterSpacing: 0.4,
          padding: '3px 7px', background: 'rgba(0,0,0,0.25)',
          borderRadius: 4, textTransform: 'uppercase',
        }}>{label}</div>
      )}
      {children}
    </div>
  );
}

// Pill tag
function Tag({ children, color }) {
  return (
    <span className="tag" style={color ? { background: color.bg, color: color.fg, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' } : undefined}>
      {children}
    </span>
  );
}

// Time/meta chip with icon
function Meta({ icon, label, color }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: color || 'var(--ink-soft)', fontSize: 12, fontWeight: 600 }}>
      <Icon name={icon} size={14} />
      <span>{label}</span>
    </div>
  );
}

// iOS-ish status bar (slim) — warm tones
function StatusBar({ dark = false }) {
  const c = dark ? 'rgba(255,255,255,0.9)' : 'var(--ink)';
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 28px 4px', height: 44, boxSizing: 'border-box',
      position: 'relative', zIndex: 20,
    }}>
      <span style={{ fontFamily: '-apple-system, SF Pro, system-ui', fontWeight: 600, fontSize: 15, color: c, letterSpacing: 0.2 }}>9:41</span>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <svg width="17" height="11" viewBox="0 0 17 11"><path d="M1 8h2v3H1zM5 6h2v5H5zM9 4h2v7H9zM13 1h2v10h-2z" fill={c}/></svg>
        <svg width="15" height="11" viewBox="0 0 15 11"><path d="M7.5 3a6 6 0 014 1.5l1-1a7.5 7.5 0 00-10 0l1 1A6 6 0 017.5 3z" fill={c}/><circle cx="7.5" cy="9" r="1.3" fill={c}/></svg>
        <svg width="24" height="11" viewBox="0 0 24 11"><rect x="0.5" y="0.5" width="20" height="10" rx="2.5" stroke={c} strokeOpacity="0.4" fill="none"/><rect x="2" y="2" width="16" height="7" rx="1" fill={c}/></svg>
      </div>
    </div>
  );
}

// Home indicator
function HomeBar({ dark = false }) {
  return (
    <div style={{ position: 'absolute', bottom: 6, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 60 }}>
      <div style={{ width: 120, height: 4, borderRadius: 100, background: dark ? 'rgba(255,255,255,0.6)' : 'rgba(60,40,20,0.3)' }} />
    </div>
  );
}

// Phone frame — warm rounded, no bezel illusion (flatter, painterly)
function Phone({ children, bg = 'var(--bg)', width = 360, height = 760, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: 42, overflow: 'hidden',
      position: 'relative', background: bg,
      boxShadow: '0 40px 80px rgba(80,50,30,0.18), 0 0 0 8px #2a2018, 0 0 0 9px rgba(255,250,240,0.2)',
      ...style,
    }}>
      <div style={{
        position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
        width: 112, height: 32, borderRadius: 20, background: '#18110a', zIndex: 50,
      }} />
      <StatusBar />
      <div style={{ position: 'absolute', top: 44, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
        {children}
      </div>
      <HomeBar />
    </div>
  );
}

// Tab bar — bottom floating
function TabBar({ active = 'home' }) {
  const tabs = [
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'collections', icon: 'folder', label: 'Shelves' },
    { id: 'create', icon: 'plus', label: 'New' },
    { id: 'elements', icon: 'sticker', label: 'Elements' },
    { id: 'me', icon: 'user', label: 'Me' },
  ];
  return (
    <div style={{
      position: 'absolute', left: 16, right: 16, bottom: 22, height: 64,
      background: 'rgba(250,244,230,0.92)', backdropFilter: 'blur(20px) saturate(160%)',
      borderRadius: 28, display: 'flex', alignItems: 'center',
      boxShadow: '0 10px 28px rgba(80,50,30,0.16), inset 1px 1px 0 rgba(255,255,255,0.9), inset -1px -1px 0 rgba(170,140,110,0.15)',
      border: '1px solid rgba(170,140,110,0.18)', zIndex: 30,
    }}>
      {tabs.map(t => {
        const isActive = t.id === active;
        const isFab = t.id === 'create';
        if (isFab) {
          return (
            <div key={t.id} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{
                width: 50, height: 50, borderRadius: 18,
                background: 'linear-gradient(180deg, #d87a5c, #b85a3e)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff7e8', marginTop: -22,
                boxShadow: '0 6px 16px rgba(180,70,40,0.35), inset 1px 1px 0 rgba(255,220,200,0.5)',
              }}>
                <Icon name="plus" size={26} strokeWidth={2.4} color="#fff7e8"/>
              </div>
            </div>
          );
        }
        return (
          <div key={t.id} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            color: isActive ? 'var(--terracotta)' : 'var(--ink-faint)',
          }}>
            <Icon name={t.icon} size={22} strokeWidth={isActive ? 2.2 : 1.7} />
            <span style={{ fontSize: 10, fontWeight: isActive ? 800 : 600 }}>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { Icon, FoodImage, Tag, Meta, StatusBar, HomeBar, Phone, TabBar });
