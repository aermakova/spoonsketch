// screens-creative.jsx — Page Editor (2 variants), Cook Mode, Collections, Elements, PDF Export

// ─────────────────────────────────────────────────────────────
// 5A. Page Editor — canvas-first (visual)
// ─────────────────────────────────────────────────────────────
function EditorCanvas() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#2a1f16', position: 'relative', overflow: 'hidden' }}>
      {/* top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', color: '#fff8e8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,250,240,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={16} color="#fff8e8"/>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.6, fontWeight: 600 }}>Editing</div>
            <div className="font-display" style={{ fontSize: 14, fontWeight: 600 }}>Tomato Galette</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,250,240,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="eye" size={16} color="#fff8e8"/>
          </div>
          <div style={{ padding: '8px 12px', borderRadius: 12, background: 'linear-gradient(180deg, #d87a5c, #b85a3e)', color: '#fff6e8', fontWeight: 700, fontSize: 12 }}>Save</div>
        </div>
      </div>

      {/* layout zones + elements on canvas */}
      <div style={{ position: 'absolute', top: 56, left: 14, right: 14, bottom: 210, background: '#faf4e6', borderRadius: 18, boxShadow: '0 14px 30px rgba(0,0,0,0.4)', overflow: 'hidden' }} className="paper-grain">
        {/* active selection outline around image */}
        <div style={{ position: 'absolute', top: 14, left: 14, right: 14, height: 150, borderRadius: 10, overflow: 'hidden', transform: 'rotate(-1.5deg)', boxShadow: '0 4px 10px rgba(80,50,30,0.18)' }}>
          <FoodImage palette={['#e8a88a','#d9a441','#8c9f6e']} style={{ width: '100%', height: '100%' }}/>
        </div>
        {/* selection handles */}
        <div style={{ position: 'absolute', top: 10, left: 10, right: 10, height: 160, border: '2px dashed #c46a4c', borderRadius: 12, transform: 'rotate(-1.5deg)', pointerEvents: 'none' }}>
          {[[0,0],[1,0],[0,1],[1,1]].map(([x,y]) => (
            <div key={`${x}${y}`} style={{
              position: 'absolute',
              [x ? 'right' : 'left']: -6,
              [y ? 'bottom' : 'top']: -6,
              width: 12, height: 12, borderRadius: 3,
              background: '#fff', border: '2px solid #c46a4c',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}/>
          ))}
          <div style={{ position: 'absolute', top: -26, left: '50%', transform: 'translateX(-50%)', width: 22, height: 22, borderRadius: '50%', background: '#fff', border: '2px solid #c46a4c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="rotate" size={12} color="#c46a4c"/>
          </div>
        </div>
        {/* title zone (text block) */}
        <div style={{ position: 'absolute', top: 178, left: 18, right: 18 }}>
          <div className="font-hand" style={{ fontSize: 18, color: 'var(--terracotta)' }}>late summer·</div>
          <div className="font-display" style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.02 }}>Tomato Basil<br/>Galette</div>
        </div>
        {/* stickers */}
        <div style={{ position: 'absolute', top: 130, left: -10 }}>
          <Sticker kind="tomato" size={52} rotate={-24}/>
        </div>
        <div style={{ position: 'absolute', top: 146, right: -6 }}>
          <Sticker kind="basil" size={48} rotate={14}/>
        </div>
        {/* layout zone placeholder (ingredients) */}
        <div style={{ position: 'absolute', top: 252, left: 14, width: 130, padding: 8, border: '1.5px dashed #bca079', borderRadius: 8, background: 'rgba(217,164,65,0.08)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Ingredients zone</div>
          <div style={{ fontSize: 10, color: 'var(--ink-faint)', marginTop: 2 }}>Auto-filled from recipe</div>
        </div>
        {/* layout zone (steps) */}
        <div style={{ position: 'absolute', top: 252, right: 14, width: 112, padding: 8, border: '1.5px dashed #bca079', borderRadius: 8, background: 'rgba(217,164,65,0.08)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Steps zone</div>
        </div>
      </div>

      {/* context toolbar for selected item */}
      <div style={{ position: 'absolute', bottom: 186, left: 14, right: 14, height: 44, borderRadius: 14, background: 'rgba(255,250,240,0.96)', display: 'flex', alignItems: 'center', padding: '0 6px', gap: 2, boxShadow: '0 6px 14px rgba(0,0,0,0.3)' }}>
        {[
          { icon: 'image', label: 'Replace' },
          { icon: 'resize', label: 'Size' },
          { icon: 'rotate', label: 'Rotate' },
          { icon: 'layout', label: 'Layer' },
          { icon: 'trash', label: '' },
        ].map((t, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: i === 4 ? '#c46a4c' : 'var(--ink)' }}>
            <Icon name={t.icon} size={17}/>
            {t.label && <span style={{ fontSize: 9, fontWeight: 700 }}>{t.label}</span>}
          </div>
        ))}
      </div>

      {/* bottom tool panel */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 176, background: '#1d140c', borderRadius: '22px 22px 0 0', padding: '14px 14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* tool tabs */}
        <div style={{ display: 'flex', gap: 5 }}>
          {[
            { icon: 'layout', label: 'Layouts' },
            { icon: 'sticker', label: 'Stickers', active: true },
            { icon: 'image', label: 'Photos' },
            { icon: 'text', label: 'Text' },
            { icon: 'brush', label: 'Tape' },
          ].map((t, i) => (
            <div key={i} style={{
              flex: 1, padding: '8px 4px', borderRadius: 10,
              background: t.active ? 'rgba(242,217,141,0.18)' : 'transparent',
              color: t.active ? '#f2d98d' : 'rgba(255,248,232,0.55)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            }}>
              <Icon name={t.icon} size={16}/>
              <span style={{ fontSize: 9, fontWeight: 700 }}>{t.label}</span>
            </div>
          ))}
        </div>
        {/* sticker tray */}
        <div style={{ display: 'flex', gap: 10, overflow: 'hidden', padding: '4px 0' }}>
          {['tomato','basil','lemon','garlic','whisk','spoon','wheat','cherry','flower','leaf','mushroom','bread'].map((s, i) => (
            <div key={s} style={{
              width: 54, height: 54, flexShrink: 0, borderRadius: 14,
              background: 'rgba(255,250,240,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: i === 0 ? '1.5px solid #f2d98d' : '1.5px solid transparent',
            }}>
              <Sticker kind={s} size={40} shadow={false} rotate={i * 7 - 20}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 5B. Page Editor — templates first (guided)
// ─────────────────────────────────────────────────────────────
function EditorTemplates() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }} className="paper-grain">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
        <Icon name="arrow_left" size={20}/>
        <div className="font-display" style={{ fontWeight: 600, fontSize: 15 }}>Choose a Page Style</div>
        <div style={{ width: 20 }}/>
      </div>

      {/* preview */}
      <div style={{ margin: '4px 20px 0', height: 280, background: '#faf4e6', borderRadius: 18, position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-md), var(--inner)' }} className="paper-grain">
        <div style={{ position: 'absolute', top: 10, left: 10, right: 10, height: 110, borderRadius: 8, overflow: 'hidden', transform: 'rotate(-1.5deg)' }}>
          <FoodImage palette={['#e8a88a','#d9a441','#8c9f6e']} style={{ width: '100%', height: '100%' }}/>
        </div>
        <div style={{ position: 'absolute', top: 126, left: 14, right: 14 }}>
          <div className="font-display" style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.05 }}>Tomato Basil<br/>Galette</div>
        </div>
        <div style={{ position: 'absolute', top: 176, left: 14, right: 120, fontSize: 9, color: 'var(--ink-soft)' }}>
          <div className="font-hand" style={{ fontSize: 14, color: 'var(--terracotta)' }}>ingredients</div>
          {['· 1½ c flour','· 6 tbsp butter','· 4 tomatoes'].map(t => <div key={t}>{t}</div>)}
        </div>
        <div style={{ position: 'absolute', top: 176, right: 14, width: 100, height: 60, borderRadius: 4, background: '#fff9ea', padding: 4, transform: 'rotate(2deg)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: 2, overflow: 'hidden' }}>
            <FoodImage palette={['#8c9f6e','#c46a4c','#d9a441']} style={{ width: '100%', height: '100%' }} grain={false}/>
          </div>
        </div>
        <div style={{ position: 'absolute', top: 96, right: -8 }}>
          <Sticker kind="tomato" size={44} rotate={16}/>
        </div>
        <div style={{ position: 'absolute', top: 150, left: -10 }}>
          <Sticker kind="basil" size={42} rotate={-20}/>
        </div>
      </div>

      {/* template grid */}
      <div style={{ padding: '18px 16px 16px' }}>
        <div className="font-display" style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Templates</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { name: 'Journal', active: true },
            { name: 'Postcard' },
            { name: 'Polaroid' },
            { name: 'Recipe Card' },
            { name: 'Magazine' },
            { name: 'Diary' },
          ].map((t, i) => (
            <div key={i} style={{
              aspectRatio: '3 / 4', borderRadius: 14, background: 'var(--paper)',
              padding: 6, position: 'relative',
              boxShadow: t.active ? '0 0 0 2px var(--terracotta), var(--shadow-sm)' : 'var(--shadow-sm), var(--inner)',
            }}>
              <div style={{ width: '100%', height: '50%', background: i === 0 ? 'linear-gradient(135deg,#e8a88a,#d9a441)' : i === 4 ? '#8c9f6e' : 'rgba(217,164,65,0.2)', borderRadius: 6 }}/>
              <div style={{ padding: '4px 2px' }}>
                <div style={{ height: 3, width: '80%', background: 'var(--ink)', borderRadius: 1, marginBottom: 3 }}/>
                <div style={{ height: 2, width: '60%', background: 'var(--ink-faint)', borderRadius: 1, marginBottom: 2 }}/>
                <div style={{ height: 2, width: '70%', background: 'var(--ink-faint)', borderRadius: 1 }}/>
              </div>
              <div style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', fontSize: 9, fontWeight: 700, color: t.active ? 'var(--terracotta)' : 'var(--ink-soft)' }}>{t.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="clay-btn clay-btn-primary" style={{ position: 'absolute', bottom: 22, left: 16, right: 16, height: 52, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14 }}>
        <Icon name="brush" size={18} color="#fff6e8"/> Decorate this page
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 6. Cook Mode
// ─────────────────────────────────────────────────────────────
function CookMode() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#fdf4e0', position: 'relative', overflow: 'hidden' }} className="paper-grain">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
        <div style={{ width: 40, height: 40, borderRadius: 14, background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <Icon name="close" size={18}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: 'var(--paper)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#c46a4c', animation: 'pulse 2s infinite' }}/>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Cook Mode · Screen On</span>
        </div>
        <div style={{ width: 40 }}/>
      </div>

      {/* step progress pills */}
      <div style={{ display: 'flex', gap: 6, padding: '6px 16px 10px' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            flex: 1, height: 6, borderRadius: 999,
            background: i < 2 ? 'var(--terracotta)' : i === 2 ? 'var(--terracotta-soft)' : 'rgba(180,140,90,0.18)',
          }}/>
        ))}
      </div>

      {/* current step — huge */}
      <div style={{ margin: '8px 16px 0', padding: '24px 22px', background: 'var(--paper)', borderRadius: 26, boxShadow: 'var(--shadow-md), var(--inner)', position: 'relative' }}>
        <div className="font-hand" style={{ fontSize: 20, color: 'var(--terracotta)' }}>step three</div>
        <div className="font-display" style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.15, marginTop: 2, color: 'var(--ink)' }}>
          Roll the dough into a rough round. Spread ricotta, layer tomatoes, scatter basil.
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 18, padding: '12px 14px', background: 'rgba(242,217,141,0.35)', borderRadius: 14 }}>
          <Icon name="flame" size={22} color="#c46a4c"/>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Oven</div>
            <div className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>400°F · preheated</div>
          </div>
        </div>

        <div style={{ position: 'absolute', top: -14, right: -10 }}>
          <Sticker kind="tomato" size={50} rotate={18}/>
        </div>
      </div>

      {/* ingredients checklist for this step */}
      <div style={{ margin: '16px 16px 0', padding: '16px 18px', background: 'var(--paper)', borderRadius: 22, boxShadow: 'var(--shadow-sm), var(--inner)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="font-display" style={{ fontSize: 15, fontWeight: 600 }}>For this step</div>
          <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 700 }}>3 / 4</span>
        </div>
        <div style={{ marginTop: 8 }}>
          {[
            { t: 'Rolled dough', d: true },
            { t: 'Fresh ricotta · 1 c', d: true },
            { t: 'Tomatoes, sliced · 4', d: true },
            { t: 'Basil · handful', d: false },
          ].map((ing, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 3 ? '1px dashed var(--line)' : 'none' }}>
              <div style={{
                width: 22, height: 22, borderRadius: 7,
                background: ing.d ? 'var(--sage)' : 'transparent',
                border: ing.d ? 'none' : '1.8px solid var(--ink-faint)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {ing.d && <Icon name="check" size={14} color="#fff" strokeWidth={2.6}/>}
              </div>
              <span style={{ fontSize: 16, color: ing.d ? 'var(--ink-faint)' : 'var(--ink)', textDecoration: ing.d ? 'line-through' : 'none' }}>{ing.t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* step nav */}
      <div style={{ position: 'absolute', bottom: 22, left: 16, right: 16, display: 'flex', gap: 10 }}>
        <div className="clay-btn" style={{ width: 58, height: 58, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrow_left" size={22}/>
        </div>
        <div className="clay-btn clay-btn-primary" style={{ flex: 1, height: 58, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 15 }}>
          Done · next step <Icon name="arrow_right" size={20} color="#fff6e8"/>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 7. Collections
// ─────────────────────────────────────────────────────────────
const COLLECTIONS = [
  { name: 'Weeknight Favorites', count: 24, pal: ['#d97b7b','#d9a441','#8c9f6e'], sticker: 'tomato', rotate: -2 },
  { name: 'Family Classics', count: 18, pal: ['#c46a4c','#8a5f7a','#d9a441'], sticker: 'bread', rotate: 1.5 },
  { name: 'Baking', count: 32, pal: ['#e8c48a','#d9a441','#a07450'], sticker: 'wheat', rotate: -1 },
  { name: 'Soups & Stews', count: 12, pal: ['#c46a4c','#d9a441','#8c9f6e'], sticker: 'mushroom', rotate: 2 },
  { name: 'Holiday Recipes', count: 9, pal: ['#b94a38','#d9a441','#6e5a40'], sticker: 'cherry', rotate: -2 },
  { name: 'Want to Try', count: 21, pal: ['#eaa0a8','#f2d98d','#8c9f6e'], sticker: 'strawberry', rotate: 1 },
];

function Collections() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }} className="paper-grain phone-scroll">
      <div style={{ padding: '14px 20px 8px' }}>
        <div className="font-hand" style={{ fontSize: 22, color: 'var(--ink-soft)', lineHeight: 1 }}>my shelves</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div className="font-display" style={{ fontSize: 32, fontWeight: 600, lineHeight: 1.05 }}>Collections</div>
          <div style={{ width: 40, height: 40, borderRadius: 14, background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <Icon name="plus" size={20}/>
          </div>
        </div>
      </div>

      <div style={{ padding: '8px 16px 100px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {COLLECTIONS.map((c, i) => (
          <div key={c.name} style={{
            background: 'var(--paper)', borderRadius: 22, padding: 12,
            boxShadow: 'var(--shadow-md), var(--inner)',
            transform: `rotate(${c.rotate}deg)`,
            position: 'relative',
          }} className="paper-grain">
            {/* little tape */}
            {i % 2 === 0 && (
              <div style={{ position: 'absolute', top: -8, left: 20, width: 44, height: 14, background: 'rgba(217,164,65,0.72)', transform: 'rotate(-8deg)', boxShadow: '0 1px 2px rgba(80,50,30,0.15)' }}/>
            )}
            {/* stacked polaroid previews */}
            <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', marginBottom: 10 }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 12, overflow: 'hidden', transform: 'rotate(-4deg)', boxShadow: 'var(--shadow-sm)' }}>
                <FoodImage palette={[c.pal[2], c.pal[0], c.pal[1]]} style={{ width: '100%', height: '100%' }}/>
              </div>
              <div style={{ position: 'absolute', inset: 0, borderRadius: 12, overflow: 'hidden', transform: 'rotate(2deg) translate(3px, 2px)', boxShadow: 'var(--shadow-sm)' }}>
                <FoodImage palette={c.pal} style={{ width: '100%', height: '100%' }}/>
                <div style={{ position: 'absolute', bottom: -4, right: -4 }}>
                  <Sticker kind={c.sticker} size={38} rotate={-14}/>
                </div>
              </div>
            </div>
            <div className="font-display" style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.15 }}>{c.name}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 600, marginTop: 2 }}>{c.count} recipes</div>
          </div>
        ))}
      </div>
      <TabBar active="collections"/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 8. My Elements
// ─────────────────────────────────────────────────────────────
function MyElements() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }} className="paper-grain phone-scroll">
      <div style={{ padding: '14px 20px 8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div className="font-hand" style={{ fontSize: 20, color: 'var(--ink-soft)', lineHeight: 1 }}>personal stash</div>
            <div className="font-display" style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.05 }}>My Elements</div>
          </div>
        </div>
        {/* tabs */}
        <div style={{ display: 'flex', gap: 4, marginTop: 14, background: 'var(--paper)', borderRadius: 14, padding: 4, boxShadow: 'inset 1px 1px 2px rgba(80,50,30,0.08)' }}>
          {['Stickers', 'Photos', 'Tapes', 'Text'].map((t, i) => (
            <div key={t} style={{
              flex: 1, textAlign: 'center', padding: '8px 0', fontSize: 12, fontWeight: 700, borderRadius: 10,
              background: i === 0 ? 'var(--bg)' : 'transparent',
              color: i === 0 ? 'var(--ink)' : 'var(--ink-faint)',
              boxShadow: i === 0 ? 'var(--shadow-sm)' : 'none',
            }}>{t}</div>
          ))}
        </div>
      </div>

      {/* upload card */}
      <div style={{ margin: '14px 16px 10px', padding: 14, borderRadius: 20, border: '2px dashed rgba(180,140,90,0.4)', background: 'rgba(255,250,235,0.5)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#f2d98d,#e9a488)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.5)' }}>
          <Icon name="plus" size={22} color="var(--ink)" strokeWidth={2.2}/>
        </div>
        <div style={{ flex: 1 }}>
          <div className="font-display" style={{ fontSize: 14, fontWeight: 600 }}>Upload your own</div>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>PNG stickers, drawings, decorative art</div>
        </div>
      </div>

      {/* grid */}
      <div style={{ padding: '4px 16px 100px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: 0.6, padding: '8px 4px' }}>My Stickers · 18</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {ALL_STICKERS.slice(0, 16).map((s, i) => (
            <div key={s} style={{
              aspectRatio: '1 / 1', borderRadius: 16, background: 'var(--paper)',
              boxShadow: 'var(--shadow-sm), var(--inner)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              <Sticker kind={s} size={46} rotate={(i * 13) % 30 - 15}/>
              {i === 0 && (
                <div style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: '50%', background: '#c46a4c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="heart-fill" size={9} color="#fff"/>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: 0.6, padding: '16px 4px 8px' }}>Uploaded Photos · 6</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            ['#e8a88a','#d9a441','#8c9f6e'],
            ['#c46a4c','#f2d98d','#8c9f6e'],
            ['#d97b7b','#d9a441','#6e5a40'],
            ['#8c9f6e','#c46a4c','#d9a441'],
            ['#d9a441','#8c9f6e','#c46a4c'],
            ['#eaa0a8','#f2d98d','#e9a488'],
          ].map((p, i) => (
            <div key={i} style={{ aspectRatio: '1 / 1', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <FoodImage palette={p} style={{ width: '100%', height: '100%' }}/>
            </div>
          ))}
        </div>
      </div>
      <TabBar active="elements"/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 9. PDF Export
// ─────────────────────────────────────────────────────────────
function PDFExport() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }} className="paper-grain">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 4px' }}>
        <div style={{ width: 40, height: 40, borderRadius: 14, background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <Icon name="close" size={18}/>
        </div>
        <div className="font-display" style={{ fontSize: 16, fontWeight: 600 }}>Export to PDF</div>
        <div style={{ width: 40 }}/>
      </div>

      {/* toggle: clean / scrapbook */}
      <div style={{ margin: '18px 16px 12px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Style</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { name: 'Scrapbook', active: true, p: ['#e8a88a','#d9a441','#8c9f6e'], desc: 'Decorated pages' },
            { name: 'Clean', active: false, p: ['#f7eedb','#eee0c2','#faf4e6'], desc: 'Minimal recipe' },
          ].map((s, i) => (
            <div key={s.name} style={{
              background: 'var(--paper)', borderRadius: 18, padding: 12,
              boxShadow: s.active ? '0 0 0 2px var(--terracotta), var(--shadow-md)' : 'var(--shadow-sm), var(--inner)',
            }}>
              <div style={{ aspectRatio: '3 / 4', borderRadius: 10, overflow: 'hidden', position: 'relative', background: '#faf4e6' }}>
                {i === 0 ? <>
                  <div style={{ position: 'absolute', top: 6, left: 6, right: 6, height: '40%', borderRadius: 3, overflow: 'hidden', transform: 'rotate(-2deg)' }}>
                    <FoodImage palette={s.p} style={{ width: '100%', height: '100%' }} grain={false}/>
                  </div>
                  <div style={{ position: 'absolute', bottom: 6, left: 6, right: 6 }}>
                    <div style={{ height: 3, width: '70%', background: 'var(--ink)', borderRadius: 1, marginBottom: 2 }}/>
                    <div style={{ height: 2, width: '90%', background: 'var(--ink-faint)', borderRadius: 1, marginBottom: 2 }}/>
                    <div style={{ height: 2, width: '80%', background: 'var(--ink-faint)', borderRadius: 1 }}/>
                  </div>
                  <div style={{ position: 'absolute', top: '45%', right: -4 }}>
                    <Sticker kind="tomato" size={22} rotate={10}/>
                  </div>
                </> : <>
                  <div style={{ padding: 10 }}>
                    <div style={{ height: 3, width: '60%', background: 'var(--ink)', borderRadius: 1, marginBottom: 6 }}/>
                    {[70,90,85,75,88,70,92].map((w, j) => (
                      <div key={j} style={{ height: 2, width: `${w}%`, background: 'var(--ink-faint)', borderRadius: 1, marginBottom: 3 }}/>
                    ))}
                  </div>
                </>}
              </div>
              <div className="font-display" style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>{s.name}</div>
              <div style={{ fontSize: 10, color: 'var(--ink-faint)' }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* scope */}
      <div style={{ margin: '14px 16px 10px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>What to include</div>
        <div className="card-sm" style={{ background: 'var(--paper)', borderRadius: 18 }}>
          {[
            { t: 'This recipe', s: 'Tomato Basil Galette', active: false },
            { t: 'Selected recipes', s: '3 recipes', active: true },
            { t: 'A whole collection', s: 'Baking · 32 recipes', active: false },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < 2 ? '1px dashed var(--line)' : 'none' }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: r.active ? 'var(--terracotta)' : 'transparent',
                border: r.active ? 'none' : '2px solid var(--ink-faint)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {r.active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }}/>}
              </div>
              <div style={{ flex: 1 }}>
                <div className="font-display" style={{ fontSize: 14, fontWeight: 600 }}>{r.t}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{r.s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* options */}
      <div style={{ margin: '14px 16px 0', display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, padding: '10px 12px', background: 'var(--paper)', borderRadius: 14, boxShadow: 'var(--shadow-sm), var(--inner)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="grain" size={18} color="var(--terracotta)"/>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 600 }}>Paper</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Cream linen</div>
          </div>
        </div>
        <div style={{ flex: 1, padding: '10px 12px', background: 'var(--paper)', borderRadius: 14, boxShadow: 'var(--shadow-sm), var(--inner)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="layout" size={18} color="var(--terracotta)"/>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 600 }}>Size</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>A5 · portrait</div>
          </div>
        </div>
      </div>

      <div className="clay-btn clay-btn-primary" style={{ position: 'absolute', bottom: 22, left: 16, right: 16, height: 56, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 15 }}>
        <Icon name="download" size={20} color="#fff6e8"/> Export 3 pages · PDF
      </div>
    </div>
  );
}

Object.assign(window, { EditorCanvas, EditorTemplates, CookMode, Collections, MyElements, PDFExport });
