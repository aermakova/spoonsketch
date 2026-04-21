// screens-core.jsx — Welcome, Library (2 variants), Create Recipe, Detail (2 modes)

// ─────────────────────────────────────────────────────────────
// 1. Welcome / Main
// ─────────────────────────────────────────────────────────────
function WelcomeScreen() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: 'var(--bg)', overflow: 'hidden' }} className="paper-grain">
      {/* painterly header panel */}
      <div style={{
        position: 'absolute', top: 44, left: 16, right: 16, height: 340,
        borderRadius: 32, overflow: 'hidden',
        boxShadow: '0 14px 30px rgba(80,50,30,0.18), inset 1px 1px 0 rgba(255,250,240,0.6)',
      }}>
        <FoodImage palette={['#e8a88a', '#d9a441', '#8c9f6e']} style={{ width: '100%', height: '100%' }} grain strokes>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(60,30,10,0.55))' }}/>
        </FoodImage>
        {/* overlay copy */}
        <div style={{ position: 'absolute', left: 22, right: 22, bottom: 22, color: '#fff8e8' }}>
          <div className="font-hand" style={{ fontSize: 24, opacity: 0.85 }}>welcome back,</div>
          <div className="font-display" style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.05, marginTop: 2 }}>Maren's<br/>Cookbook</div>
        </div>
        {/* corner sticker */}
        <div style={{ position: 'absolute', top: 14, right: 14 }}>
          <Sticker kind="leaf" size={56} rotate={20} />
        </div>
        <div style={{ position: 'absolute', top: 140, left: 16 }}>
          <Sticker kind="tomato" size={44} rotate={-12} />
        </div>
      </div>

      {/* today's suggestion card */}
      <div className="card paper-grain" style={{
        position: 'absolute', top: 360, left: 16, right: 16, padding: '18px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(135deg, #f2d98d, #e9a488)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.5)' }}>
            <Sticker kind="flower" size={30} shadow={false}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' }}>Today's pick</div>
            <div className="font-display" style={{ fontSize: 18, fontWeight: 600 }}>Tomato Basil Galette</div>
          </div>
          <Icon name="chevron_right" size={18} color="var(--ink-faint)"/>
        </div>
      </div>

      {/* section: shelves */}
      <div style={{ position: 'absolute', top: 460, left: 0, right: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 20px 10px' }}>
          <div className="font-display" style={{ fontSize: 22, fontWeight: 600 }}>Your shelves</div>
          <span style={{ fontSize: 12, color: 'var(--terracotta)', fontWeight: 700 }}>See all</span>
        </div>
        <div style={{ display: 'flex', gap: 12, padding: '6px 16px', overflow: 'hidden' }}>
          {[
            { name: 'Weeknight\nFavorites', count: 24, pal: ['#d97b7b', '#d9a441', '#8c9f6e'], sticker: 'tomato' },
            { name: 'Family\nClassics', count: 18, pal: ['#c46a4c', '#d9a441', '#8a5f7a'], sticker: 'bread' },
            { name: 'Baking', count: 32, pal: ['#e8c48a', '#d9a441', '#a07450'], sticker: 'wheat' },
          ].map((s, i) => (
            <div key={i} className="card-sm" style={{ width: 128, flexShrink: 0, background: 'var(--paper)', borderRadius: 22, padding: 10, position: 'relative' }}>
              <div style={{ width: '100%', height: 90, borderRadius: 14, overflow: 'hidden', position: 'relative' }}>
                <FoodImage palette={s.pal} style={{ width: '100%', height: '100%' }}/>
                <div style={{ position: 'absolute', top: 6, right: 6 }}>
                  <Sticker kind={s.sticker} size={34} rotate={-14}/>
                </div>
              </div>
              <div className="font-display" style={{ fontSize: 14, fontWeight: 600, marginTop: 10, lineHeight: 1.15, whiteSpace: 'pre-line' }}>{s.name}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 600, marginTop: 2 }}>{s.count} recipes</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2A. Recipe Library — Shelf (magazine)
// ─────────────────────────────────────────────────────────────
const LIBRARY = [
  { title: 'Tomato Basil\nGalette', min: 45, tags: ['Summer','Veg'], pal: ['#d97b7b','#d9a441','#8c9f6e'], sticker: 'tomato', fav: true },
  { title: 'Lemon\nRicotta Cake', min: 60, tags: ['Baking'], pal: ['#f2d98d','#e9a488','#f5e2a0'], sticker: 'lemon', fav: false },
  { title: 'Wild Mushroom\nRisotto', min: 40, tags: ['Cozy'], pal: ['#a07450','#d9a441','#6e5a40'], sticker: 'mushroom', fav: true },
  { title: 'Garden\nFocaccia', min: 180, tags: ['Baking','Slow'], pal: ['#d9a441','#8c9f6e','#c46a4c'], sticker: 'bread', fav: false },
  { title: 'Strawberry\nShortcake', min: 35, tags: ['Dessert'], pal: ['#eaa0a8','#f2d98d','#d97b7b'], sticker: 'strawberry', fav: true },
  { title: 'Minestrone\nalla Nonna', min: 90, tags: ['Family'], pal: ['#c46a4c','#8c9f6e','#d9a441'], sticker: 'basil', fav: false },
];

function LibraryShelf() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }} className="paper-grain phone-scroll">
      {/* Header */}
      <div style={{ padding: '14px 20px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="font-hand" style={{ fontSize: 22, color: 'var(--ink-soft)', lineHeight: 1 }}>my kitchen</div>
            <div className="font-display" style={{ fontSize: 32, fontWeight: 600, lineHeight: 1.05 }}>Cookbook</div>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm), var(--inner)' }}>
            <Icon name="filter" size={20} color="var(--ink)"/>
          </div>
        </div>
        {/* search */}
        <div style={{ marginTop: 14, height: 44, borderRadius: 16, background: 'var(--paper)', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10, boxShadow: 'inset 1px 1px 2px rgba(80,50,30,0.08), inset -1px -1px 0 rgba(255,255,255,0.8)' }}>
          <Icon name="search" size={18} color="var(--ink-faint)"/>
          <span style={{ color: 'var(--ink-faint)', fontSize: 14 }}>Search recipes, tags…</span>
        </div>
        {/* tag row */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, overflow: 'hidden' }}>
          {['All', 'Favorites', 'Quick', 'Veg', 'Baking', 'Soups'].map((t, i) => (
            <div key={i} style={{
              padding: '7px 13px', borderRadius: 999, fontSize: 12, fontWeight: 700,
              background: i === 0 ? 'var(--terracotta)' : 'var(--paper)',
              color: i === 0 ? '#fff6e8' : 'var(--ink-soft)',
              boxShadow: i === 0 ? '0 3px 8px rgba(180,70,40,0.25)' : 'var(--shadow-sm)',
              whiteSpace: 'nowrap',
            }}>{t}</div>
          ))}
        </div>
      </div>

      {/* shelf */}
      <div style={{ padding: '4px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {LIBRARY.slice(0, 4).map((r, i) => (
          <div key={i} className="card-sm" style={{
            background: 'var(--paper)', borderRadius: 22, padding: 10,
            transform: `rotate(${i % 2 ? 0.6 : -0.6}deg)`,
            position: 'relative',
          }}>
            <div style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
              <FoodImage palette={r.pal} style={{ width: '100%', height: '100%' }}/>
              {r.fav && (
                <div style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 10, background: 'rgba(255,250,240,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                  <Icon name="heart-fill" size={14} color="#c46a4c"/>
                </div>
              )}
              <div style={{ position: 'absolute', bottom: -6, left: -10 }}>
                <Sticker kind={r.sticker} size={40} rotate={i % 2 ? 12 : -18}/>
              </div>
            </div>
            <div className="font-display" style={{ fontSize: 15, fontWeight: 600, marginTop: 10, lineHeight: 1.1, whiteSpace: 'pre-line' }}>{r.title}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
              <Meta icon="clock" label={`${r.min}m`}/>
              <div style={{ flex: 1 }}/>
              {r.tags.slice(0, 1).map(t => <Tag key={t}>{t}</Tag>)}
            </div>
          </div>
        ))}
      </div>

      {/* wooden shelf divider */}
      <div style={{ margin: '8px 16px', height: 10, borderRadius: 4, background: 'linear-gradient(180deg, #c89668, #a07450)', boxShadow: '0 6px 12px rgba(80,50,30,0.2), inset 0 1px 0 rgba(255,220,180,0.4)' }}/>
      <div style={{ margin: '-6px 44px 14px', height: 2, background: 'rgba(80,50,30,0.2)' }}/>

      <div style={{ padding: '0 16px 100px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {LIBRARY.slice(4).map((r, i) => (
          <div key={i} className="card-sm" style={{ background: 'var(--paper)', borderRadius: 22, padding: 10, transform: `rotate(${i % 2 ? -0.6 : 0.6}deg)` }}>
            <div style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
              <FoodImage palette={r.pal} style={{ width: '100%', height: '100%' }}/>
              <div style={{ position: 'absolute', bottom: -6, left: -10 }}>
                <Sticker kind={r.sticker} size={40} rotate={i % 2 ? 12 : -18}/>
              </div>
            </div>
            <div className="font-display" style={{ fontSize: 15, fontWeight: 600, marginTop: 10, lineHeight: 1.1, whiteSpace: 'pre-line' }}>{r.title}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <Meta icon="clock" label={`${r.min}m`}/>
            </div>
          </div>
        ))}
      </div>
      <TabBar active="home"/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2B. Recipe Library — List (index-card)
// ─────────────────────────────────────────────────────────────
function LibraryIndex() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg-2)', position: 'relative', overflow: 'hidden' }} className="paper-grain phone-scroll">
      <div style={{ padding: '14px 20px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div className="font-display" style={{ fontSize: 32, fontWeight: 600 }}>Recipes</div>
          <div style={{ color: 'var(--ink-faint)', fontSize: 12, fontWeight: 700 }}>62 saved</div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <div style={{ flex: 1, height: 40, borderRadius: 14, background: 'var(--paper)', display: 'flex', alignItems: 'center', padding: '0 12px', gap: 8, boxShadow: 'inset 1px 1px 2px rgba(80,50,30,0.08)' }}>
            <Icon name="search" size={16} color="var(--ink-faint)"/>
            <span style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Search</span>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 14, background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <Icon name="grid" size={18}/>
          </div>
        </div>
      </div>

      <div style={{ padding: '8px 16px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {LIBRARY.map((r, i) => (
          <div key={i} style={{
            background: 'var(--paper)', borderRadius: 22, padding: 12,
            display: 'flex', gap: 14, alignItems: 'center',
            boxShadow: 'var(--shadow-sm), var(--inner)',
            position: 'relative',
            transform: `rotate(${i % 3 - 1 ? 0.3 : -0.3}deg)`,
          }}>
            {/* washi tape corner */}
            {i === 0 && <div style={{ position: 'absolute', top: -6, left: 32, width: 48, height: 16, background: 'rgba(217,164,65,0.65)', transform: 'rotate(-4deg)', boxShadow: '0 1px 2px rgba(80,50,30,0.1)' }}/>}
            <div style={{ width: 78, height: 78, borderRadius: 16, overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
              <FoodImage palette={r.pal} style={{ width: '100%', height: '100%' }}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="font-display" style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.15 }}>{r.title.replace('\n', ' ')}</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 6, alignItems: 'center' }}>
                <Meta icon="clock" label={`${r.min} min`}/>
                <Meta icon="users" label="4"/>
              </div>
              <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
                {r.tags.map(t => <Tag key={t}>{t}</Tag>)}
              </div>
            </div>
            <Icon name={r.fav ? 'heart-fill' : 'heart'} size={20} color={r.fav ? '#c46a4c' : 'var(--ink-faint)'}/>
          </div>
        ))}
      </div>
      <TabBar active="home"/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. Create Recipe
// ─────────────────────────────────────────────────────────────
function CreateRecipe() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }} className="paper-grain phone-scroll">
      {/* top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px' }}>
        <div style={{ width: 40, height: 40, borderRadius: 14, background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <Icon name="close" size={18}/>
        </div>
        <div className="font-display" style={{ fontWeight: 600, fontSize: 17 }}>New Recipe</div>
        <div style={{ padding: '8px 14px', borderRadius: 14, background: 'linear-gradient(180deg, #d87a5c, #b85a3e)', color: '#fff6e8', fontWeight: 700, fontSize: 13, boxShadow: '0 4px 10px rgba(180,70,40,0.25)' }}>Save</div>
      </div>

      {/* cover photo */}
      <div style={{ margin: '8px 16px 0', borderRadius: 24, height: 180, position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
        <FoodImage palette={['#e8a88a','#d9a441','#8c9f6e']} style={{ width: '100%', height: '100%' }}/>
        <div style={{ position: 'absolute', right: 14, bottom: 14, padding: '8px 12px', borderRadius: 12, background: 'rgba(250,244,230,0.9)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--ink)', backdropFilter: 'blur(8px)' }}>
          <Icon name="camera" size={14}/> Change
        </div>
        <div style={{ position: 'absolute', top: 12, left: 12 }}>
          <Sticker kind="leaf" size={44} rotate={-14}/>
        </div>
      </div>

      {/* title field */}
      <div style={{ padding: '18px 20px 6px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', letterSpacing: 0.6, textTransform: 'uppercase' }}>Title</div>
        <div className="font-display" style={{ fontSize: 26, fontWeight: 600, marginTop: 4, lineHeight: 1.1 }}>Tomato Basil Galette</div>
        <div className="font-hand" style={{ fontSize: 18, color: 'var(--ink-soft)', marginTop: 2 }}>late summer, garden tomatoes still warm from the sun</div>
      </div>

      {/* quick stats row */}
      <div style={{ margin: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { icon: 'timer', label: 'Prep', val: '20m' },
          { icon: 'flame', label: 'Cook', val: '25m' },
          { icon: 'users', label: 'Serves', val: '4' },
        ].map(s => (
          <div key={s.label} className="card-sm" style={{ background: 'var(--paper)', padding: '10px 12px', borderRadius: 18, textAlign: 'center' }}>
            <Icon name={s.icon} size={18} color="var(--terracotta)" style={{ margin: '0 auto' }}/>
            <div className="font-display" style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{s.val}</div>
            <div style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Ingredients */}
      <div style={{ margin: '14px 16px', padding: '16px 18px', background: 'var(--paper)', borderRadius: 22, boxShadow: 'var(--shadow-sm), var(--inner)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="font-display" style={{ fontSize: 17, fontWeight: 600 }}>Ingredients</div>
          <div style={{ color: 'var(--terracotta)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Icon name="plus" size={12}/> Add
          </div>
        </div>
        {[
          '1½ cups flour',
          '6 tbsp cold butter',
          '4 ripe tomatoes, sliced',
          '1 cup ricotta',
          'Fresh basil, handful',
          '1 egg, beaten (wash)',
        ].map((ing, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 5 ? '1px dashed var(--line)' : 'none' }}>
            <div style={{ width: 14, height: 14, borderRadius: 4, border: '1.5px solid var(--ink-faint)' }}/>
            <span style={{ fontSize: 14 }}>{ing}</span>
          </div>
        ))}
      </div>

      {/* Steps */}
      <div style={{ margin: '0 16px 16px', padding: '16px 18px', background: 'var(--paper)', borderRadius: 22, boxShadow: 'var(--shadow-sm), var(--inner)' }}>
        <div className="font-display" style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>Steps</div>
        {[
          'Whisk flour and salt. Cut in cold butter until coarse.',
          'Add ice water, form disc. Rest 30 min.',
          'Roll dough, layer ricotta, tomatoes, basil.',
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0' }}>
            <div className="font-display" style={{
              width: 24, height: 24, borderRadius: '50%',
              background: 'linear-gradient(135deg, #f2d98d, #e9a488)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, flexShrink: 0, color: 'var(--ink)',
            }}>{i + 1}</div>
            <div style={{ fontSize: 14, lineHeight: 1.4, paddingTop: 2 }}>{s}</div>
          </div>
        ))}
        <div style={{ paddingTop: 8, color: 'var(--terracotta)', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon name="plus" size={14}/> Add a step
        </div>
      </div>

      {/* tag + source */}
      <div style={{ margin: '0 16px 24px' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <Tag>Summer</Tag><Tag>Veg</Tag><Tag>Baking</Tag>
          <Tag color={{ bg: 'rgba(217,164,65,0.25)', fg: '#8a6820' }}>+ tag</Tag>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', background: 'var(--paper)', borderRadius: 14, boxShadow: 'var(--shadow-sm)' }}>
          <Icon name="link" size={16} color="var(--ink-faint)"/>
          <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>smittenkitchen.com/…</span>
        </div>
      </div>

      {/* decorate bar */}
      <div style={{ position: 'absolute', left: 16, right: 16, bottom: 22, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(40,25,15,0.92)', color: '#fff8e8', borderRadius: 20, boxShadow: 'var(--shadow-lg)' }}>
          <Icon name="brush" size={18} color="#f2d98d"/>
          <div style={{ flex: 1 }}>
            <div className="font-display" style={{ fontSize: 14, fontWeight: 600 }}>Make it a scrapbook page</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Decorate with stickers, photos, layouts</div>
          </div>
          <Icon name="arrow_right" size={18} color="#f2d98d"/>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4A. Recipe Detail — Beautiful (scrapbook) view
// ─────────────────────────────────────────────────────────────
function DetailScrapbook() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg-2)', position: 'relative', overflow: 'hidden' }} className="paper-grain phone-scroll">
      {/* top nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
        <div style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(250,244,230,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)', backdropFilter: 'blur(10px)' }}>
          <Icon name="arrow_left" size={18}/>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ padding: '6px 10px', borderRadius: 999, background: 'var(--paper)', fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', display: 'flex', gap: 6, alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <Icon name="sparkle" size={12} color="var(--terracotta)"/> Scrapbook
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(250,244,230,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <Icon name="heart-fill" size={18} color="#c46a4c"/>
          </div>
        </div>
      </div>

      {/* scrapbook page */}
      <div style={{ margin: '4px 12px 0', height: 560, background: '#faf4e6', borderRadius: 22, boxShadow: 'var(--shadow-lg), var(--inner)', position: 'relative', overflow: 'hidden' }} className="paper-grain">
        {/* top hero image */}
        <div style={{ position: 'absolute', top: 14, left: 14, right: 14, height: 180, borderRadius: 12, overflow: 'hidden', transform: 'rotate(-1.5deg)', boxShadow: '0 6px 14px rgba(80,50,30,0.18)' }}>
          <FoodImage palette={['#e8a88a','#d9a441','#8c9f6e']} style={{ width: '100%', height: '100%' }}/>
        </div>
        {/* washi tapes */}
        <div style={{ position: 'absolute', top: 2, left: 50, width: 70, height: 22, transform: 'rotate(-8deg)', background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.4) 0 6px, transparent 6px 12px), #d97b7b', opacity: 0.8, boxShadow: '0 1px 3px rgba(80,50,30,0.2)' }}/>
        <div style={{ position: 'absolute', top: 8, right: 40, width: 58, height: 18, transform: 'rotate(10deg)', background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0 4px, transparent 4px 10px), #d9a441', opacity: 0.82, boxShadow: '0 1px 3px rgba(80,50,30,0.2)' }}/>

        {/* title */}
        <div style={{ position: 'absolute', top: 208, left: 20, right: 20 }}>
          <div className="font-hand" style={{ fontSize: 20, color: 'var(--terracotta)', lineHeight: 1 }}>late summer·</div>
          <div className="font-display" style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.02, letterSpacing: -0.5 }}>Tomato Basil<br/>Galette</div>
        </div>

        {/* stickers strewn */}
        <div style={{ position: 'absolute', top: 160, left: -14 }}>
          <Sticker kind="tomato" size={62} rotate={-22}/>
        </div>
        <div style={{ position: 'absolute', top: 176, right: -4 }}>
          <Sticker kind="basil" size={58} rotate={16}/>
        </div>

        {/* ingredients column */}
        <div style={{ position: 'absolute', top: 310, left: 18, width: 158 }}>
          <div className="font-hand" style={{ fontSize: 22, color: 'var(--terracotta)' }}>ingredients</div>
          <div style={{ borderTop: '1.5px dashed var(--line)', paddingTop: 8, marginTop: 2 }}>
            {['flour · 1½ c', 'butter · 6 tbsp', 'tomatoes · 4', 'ricotta · 1 c', 'basil · handful', 'egg wash · 1'].map((t, i) => (
              <div key={i} style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--ink)' }}>· {t}</div>
            ))}
          </div>
        </div>

        {/* steps mini polaroids on right */}
        <div style={{ position: 'absolute', top: 308, right: 14, width: 132, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { p: ['#e9a488','#d9a441','#c89668'], note: 'cold butter!', rotate: 2 },
            { p: ['#8c9f6e','#c46a4c','#d9a441'], note: 'layer carefully', rotate: -3 },
          ].map((s, i) => (
            <div key={i} style={{ background: '#fff9ea', padding: 6, paddingBottom: 16, transform: `rotate(${s.rotate}deg)`, boxShadow: '0 3px 8px rgba(80,50,30,0.14)' }}>
              <div style={{ width: '100%', height: 72, borderRadius: 2, overflow: 'hidden' }}>
                <FoodImage palette={s.p} style={{ width: '100%', height: '100%' }} grain={false}/>
              </div>
              <div className="font-hand" style={{ fontSize: 13, color: 'var(--ink-soft)', textAlign: 'center', paddingTop: 3 }}>{s.note}</div>
            </div>
          ))}
        </div>

        {/* bottom note taped */}
        <div style={{ position: 'absolute', bottom: 14, left: 18, right: 120, background: 'rgba(242, 217, 141, 0.45)', padding: '10px 12px', borderRadius: 3, transform: 'rotate(-1.2deg)' }}>
          <div style={{ position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)', width: 36, height: 14, background: 'rgba(255,250,240,0.75)', boxShadow: '0 1px 2px rgba(80,50,30,0.15)' }}/>
          <div className="font-hand" style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.2 }}>Grandma's trick:<br/>salt tomatoes 10 min before.</div>
        </div>
        <div style={{ position: 'absolute', bottom: 20, right: 16 }}>
          <Sticker kind="cherry" size={44} rotate={14}/>
        </div>
      </div>

      {/* sticky footer — switch to clean view */}
      <div style={{ position: 'absolute', bottom: 22, left: 16, right: 16, display: 'flex', gap: 10 }}>
        <div className="clay-btn" style={{ flex: 1, height: 52, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 13 }}>
          <Icon name="book" size={16}/> Clean view
        </div>
        <div className="clay-btn clay-btn-primary" style={{ flex: 1.4, height: 52, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14 }}>
          <Icon name="chef" size={18} color="#fff6e8"/> Start cooking
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4B. Recipe Detail — Clean view
// ─────────────────────────────────────────────────────────────
function DetailClean() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--paper)', position: 'relative', overflow: 'hidden' }} className="paper-grain phone-scroll">
      {/* hero */}
      <div style={{ height: 240, position: 'relative', overflow: 'hidden' }}>
        <FoodImage palette={['#e8a88a','#d9a441','#8c9f6e']} style={{ width: '100%', height: '100%' }}/>
        <div style={{ position: 'absolute', top: 10, left: 14, display: 'flex', justifyContent: 'space-between', width: 'calc(100% - 28px)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(250,244,230,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
            <Icon name="arrow_left" size={18}/>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ padding: '6px 10px', borderRadius: 999, background: 'rgba(250,244,230,0.92)', fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', display: 'flex', gap: 6, alignItems: 'center', backdropFilter: 'blur(10px)' }}>
              <Icon name="book" size={12}/> Clean
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(250,244,230,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
              <Icon name="share" size={18}/>
            </div>
          </div>
        </div>
      </div>

      {/* bleeding card */}
      <div style={{ background: 'var(--paper)', borderRadius: '32px 32px 0 0', marginTop: -28, padding: '20px 20px 100px', position: 'relative' }}>
        <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
          <Tag>Summer</Tag><Tag>Veg</Tag><Tag>Baking</Tag>
        </div>
        <div className="font-display" style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.05 }}>Tomato Basil Galette</div>
        <div style={{ color: 'var(--ink-soft)', fontSize: 13, lineHeight: 1.5, marginTop: 6 }}>
          A rustic free-form tart. The crust is flaky, the tomatoes are jammy, the ricotta is creamy.
        </div>

        {/* stat strip */}
        <div style={{ display: 'flex', gap: 18, marginTop: 14, paddingBottom: 16, borderBottom: '1px dashed var(--line)' }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Prep</div>
            <div className="font-display" style={{ fontSize: 18, fontWeight: 600 }}>20m</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Cook</div>
            <div className="font-display" style={{ fontSize: 18, fontWeight: 600 }}>25m</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Serves</div>
            <div className="font-display" style={{ fontSize: 18, fontWeight: 600 }}>4</div>
          </div>
        </div>

        {/* ingredients */}
        <div className="font-display" style={{ fontSize: 18, fontWeight: 600, marginTop: 18, marginBottom: 8 }}>Ingredients</div>
        {['1½ cups all-purpose flour','6 tbsp cold butter, cubed','4 ripe tomatoes, sliced','1 cup fresh ricotta','Handful basil leaves','1 egg, for wash'].map((ing, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', fontSize: 14 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--terracotta)' }}/>
            <span>{ing}</span>
          </div>
        ))}

        {/* steps */}
        <div className="font-display" style={{ fontSize: 18, fontWeight: 600, marginTop: 18, marginBottom: 8 }}>Method</div>
        {[
          'Whisk flour and salt. Cut in cold butter until the mixture looks coarse and crumbly.',
          'Add ice water one spoon at a time, form a disc, rest in the fridge 30 minutes.',
          'Roll dough into a rough round. Spread ricotta, layer tomatoes, scatter basil.',
          'Fold edges, egg-wash, bake at 400°F for 25–30 minutes until golden.',
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px dashed var(--line)' }}>
            <div className="font-display" style={{ width: 26, height: 26, borderRadius: '50%', background: '#f2d98d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
            <div style={{ fontSize: 14, lineHeight: 1.45 }}>{s}</div>
          </div>
        ))}
      </div>

      {/* cook button */}
      <div style={{ position: 'absolute', bottom: 22, left: 16, right: 16, display: 'flex', gap: 10 }}>
        <div className="clay-btn" style={{ flex: 1, height: 52, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 13 }}>
          <Icon name="sparkle" size={16}/> Scrapbook
        </div>
        <div className="clay-btn clay-btn-primary" style={{ flex: 1.4, height: 52, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 14 }}>
          <Icon name="chef" size={18} color="#fff6e8"/> Start cooking
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WelcomeScreen, LibraryShelf, LibraryIndex, CreateRecipe, DetailScrapbook, DetailClean });
