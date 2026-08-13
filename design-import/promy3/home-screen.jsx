// HomeScreen — PROMY mobile home (375×812)
// Sistema: rojo #FF3131 (acción), amarillo #FFBF00 (marca/beneficio),
// grafito #111 (header), crema #FFFDF8 (bg), surfaceWarm para cards cálidas.

// ─── Iconografía interna (stroke outlines, consistente) ────────────
const Icon = {
  search: (p={}) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke={p.color||'currentColor'} strokeWidth="2.2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  pin: (p={}) => (
    <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke={p.color||'currentColor'} strokeWidth="2.2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  bell: (p={}) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke={p.color||'currentColor'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>
    </svg>
  ),
  chev: (p={}) => (
    <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke={p.color||'currentColor'} strokeWidth="2.5" strokeLinecap="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  ),
  walk: (p={}) => (
    <svg width={p.size||12} height={p.size||12} viewBox="0 0 24 24" fill="none" stroke={p.color||'currentColor'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13" cy="4" r="2"/><path d="m5 22 3-8 4 2 3-5 5 4"/><path d="m8 14 2-6"/>
    </svg>
  ),
  clock: (p={}) => (
    <svg width={p.size||12} height={p.size||12} viewBox="0 0 24 24" fill="none" stroke={p.color||'currentColor'} strokeWidth="2.2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
    </svg>
  ),
  home: (p={}) => (
    <svg width={p.size||22} height={p.size||22} viewBox="0 0 24 24" fill="none" stroke={p.color||'currentColor'} strokeWidth="2.1" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>
    </svg>
  ),
  map: (p={}) => (
    <svg width={p.size||22} height={p.size||22} viewBox="0 0 24 24" fill="none" stroke={p.color||'currentColor'} strokeWidth="2.1" strokeLinejoin="round">
      <path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2z"/><path d="M9 3v16M15 5v16"/>
    </svg>
  ),
  ticket: (p={}) => (
    <svg width={p.size||22} height={p.size||22} viewBox="0 0 24 24" fill="none" stroke={p.color||'currentColor'} strokeWidth="2.1" strokeLinejoin="round">
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M10 6v12" strokeDasharray="2 2"/>
    </svg>
  ),
  user: (p={}) => (
    <svg width={p.size||22} height={p.size||22} viewBox="0 0 24 24" fill="none" stroke={p.color||'currentColor'} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>
    </svg>
  ),
  flame: (p={}) => (
    <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill={p.color||'#FF3131'}>
      <path d="M12 2s4 4 4 8c0 2-1 3-2 3s-1-1-1-2c0-2-1-3-1-3s-4 3-4 8a6 6 0 0 0 12 0c0-6-8-14-8-14z"/>
    </svg>
  ),
  bolt: (p={}) => (
    <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill={p.color||'#111'}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6z"/>
    </svg>
  ),
  store: (p={}) => (
    <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke={p.color||'currentColor'} strokeWidth="2.2" strokeLinejoin="round">
      <path d="M3 9l2-5h14l2 5"/><path d="M3 9v11h18V9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>
    </svg>
  ),
};

// ─── Placeholder photo: diagonal stripes + label ───────────────────
function Photo({ label, w, h, tint='#2B1E14', accent='#8a6b3a', radius=14, style={} }) {
  const pat = `repeating-linear-gradient(135deg, ${tint} 0 14px, ${accent}22 14px 28px)`;
  return (
    <div style={{
      width:w, height:h, borderRadius: radius,
      background: `linear-gradient(180deg, ${tint}DD, ${tint}), ${pat}`,
      backgroundBlendMode: 'multiply',
      position:'relative', overflow:'hidden',
      ...style,
    }}>
      <div style={{position:'absolute', inset:0, background: pat, opacity:0.55}}/>
      <div style={{position:'absolute', inset:0, background: `radial-gradient(120% 80% at 30% 30%, rgba(255,255,255,0.12), transparent 60%)`}}/>
      <div style={{
        position:'absolute', left:8, bottom:8,
        background:'rgba(0,0,0,0.55)', color:'rgba(255,255,255,0.85)',
        fontFamily:'ui-monospace, Menlo, monospace',
        fontSize:9, fontWeight:700, padding:'3px 6px', borderRadius:4,
        letterSpacing:0.3,
      }}>{label}</div>
    </div>
  );
}

// ─── Category circle — food/rubro chips ────────────────────────────
function Rubro({ label, bg, tint, emoji, accent }) {
  return (
    <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:8, width:66}}>
      <div style={{
        width:60, height:60, borderRadius:18,
        background: bg,
        border:'1.5px solid rgba(17,17,17,0.08)',
        position:'relative', overflow:'hidden',
        boxShadow:'0 4px 10px rgba(0,0,0,0.06)',
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        {/* subtle striped placeholder texture */}
        <div style={{position:'absolute', inset:0,
          background:`repeating-linear-gradient(135deg, ${tint} 0 6px, transparent 6px 14px)`,
          opacity:0.5,
        }}/>
        {/* accent chip — colored geometric shape */}
        <div style={{
          position:'absolute', right:-6, bottom:-6, width:30, height:30,
          borderRadius:'50%', background: accent, opacity:0.85,
        }}/>
        <div style={{
          position:'relative', fontSize:24, filter:'grayscale(0.1)',
        }}>{emoji}</div>
      </div>
      <div style={{fontSize:10.5, fontWeight:800, color:'#1A1614', letterSpacing:-0.1, textAlign:'center', lineHeight:1.15}}>{label}</div>
    </div>
  );
}

// ─── Header with glows ────────────────────────────────────────────
function HomeHeader() {
  return (
    <div style={{
      position:'relative',
      background: '#0E0E10',
      padding: '54px 18px 22px',
      borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
      overflow:'hidden',
    }}>
      {/* red glow */}
      <div style={{
        position:'absolute', top:-60, left:-40, width:220, height:220,
        background:'radial-gradient(closest-side, rgba(255,49,49,0.55), transparent 70%)',
        filter:'blur(6px)',
      }}/>
      {/* yellow glow */}
      <div style={{
        position:'absolute', top:20, right:-50, width:200, height:200,
        background:'radial-gradient(closest-side, rgba(255,191,0,0.38), transparent 70%)',
        filter:'blur(8px)',
      }}/>
      {/* subtle P watermark */}
      <div style={{
        position:'absolute', right:-14, top:70, opacity:0.05, transform:'rotate(-8deg)',
      }}>
        <PromyGlyph size={180} color="#FFFFFF" showStroke={false}/>
      </div>

      {/* Status faux (9:41 comes from PhoneFrame) */}
      <div style={{position:'relative', display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:4}}>
        {/* Location */}
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <div style={{
            width:32, height:32, borderRadius:'50%',
            background:'#FFBF00', display:'flex', alignItems:'center', justifyContent:'center',
            border:'1.5px solid rgba(0,0,0,0.9)',
          }}>
            <PromyGlyph size={18} color="#FF3131" showStroke={false}/>
          </div>
          <div style={{lineHeight:1.05}}>
            <div style={{
              fontSize:9, fontWeight:700, letterSpacing:0.8,
              color:'rgba(255,255,255,0.55)', textTransform:'uppercase',
              display:'flex', alignItems:'center', gap:4,
            }}>
              <Icon.pin size={9} color="#FFBF00"/> Tu ubicación
            </div>
            <div style={{fontSize:14, fontWeight:800, color:'#FFFFFF', letterSpacing:-0.3, display:'flex', alignItems:'center', gap:4}}>
              Concordia, E.R. <Icon.chev size={12} color="#FFFFFF"/>
            </div>
          </div>
        </div>
        {/* Bell */}
        <button style={{
          position:'relative', border:0, cursor:'pointer',
          width:38, height:38, borderRadius:14,
          background:'rgba(255,255,255,0.08)',
          border:'1px solid rgba(255,255,255,0.12)',
          display:'flex', alignItems:'center', justifyContent:'center', color:'#fff',
        }}>
          <Icon.bell size={17} color="#fff"/>
          <div style={{
            position:'absolute', top:7, right:8, width:9, height:9, borderRadius:'50%',
            background:'#FF3131', border:'2px solid #0E0E10',
          }}/>
        </button>
      </div>

      {/* Greeting */}
      <div style={{position:'relative', marginTop:18, marginBottom:14}}>
        <div style={{fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.6)', letterSpacing:-0.1}}>
          Hola, Joaquín 👋
        </div>
        <div style={{fontSize:22, fontWeight:800, color:'#FFFFFF', letterSpacing:-0.7, lineHeight:1.15, marginTop:2}}>
          Hoy hay <span style={{color:'#FFBF00'}}>47 promos</span> cerca tuyo
        </div>
      </div>

      {/* Search */}
      <div style={{position:'relative', display:'flex', gap:10}}>
        <div style={{
          flex:1, height:50, borderRadius:999,
          background:'#FFFFFF', border:'1.5px solid rgba(17,17,17,0.9)',
          boxShadow:'0 4px 0 rgba(17,17,17,0.9)',
          display:'flex', alignItems:'center', padding:'0 18px', gap:10,
        }}>
          <Icon.search size={17} color="#111"/>
          <div style={{flex:1, fontSize:13.5, fontWeight:600, color:'#6A6256'}}>
            ¿Qué vas a aprovechar hoy?
          </div>
          <div style={{
            width:28, height:28, borderRadius:'50%',
            background:'#FFBF00', display:'flex', alignItems:'center', justifyContent:'center',
            border:'1.5px solid #111',
          }}>
            <Icon.bolt size={14} color="#111"/>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Hero promo card ──────────────────────────────────────────────
function HeroPromo() {
  return (
    <div style={{
      margin:'14px 16px 0',
      borderRadius:22,
      background:'#FF3131',
      border:'1.5px solid #111',
      boxShadow:'0 6px 0 #111, 0 14px 28px rgba(255,49,49,0.22)',
      overflow:'hidden',
      position:'relative',
    }}>
      {/* Badge row */}
      <div style={{padding:'14px 14px 10px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <div style={{
          display:'inline-flex', alignItems:'center', gap:6,
          background:'#FFBF00', color:'#111',
          border:'1.5px solid #111',
          padding:'4px 10px', borderRadius:999,
          fontSize:9.5, fontWeight:900, letterSpacing:0.6, textTransform:'uppercase',
        }}>
          <Icon.bolt size={10} color="#111"/> PROMO PROTAGONISTA
        </div>
        <div style={{
          display:'flex', alignItems:'center', gap:4,
          fontSize:10, fontWeight:800, color:'rgba(255,255,255,0.9)',
        }}>
          <Icon.clock size={11} color="rgba(255,255,255,0.9)"/> Termina en 4h 12m
        </div>
      </div>

      {/* Content + photo split */}
      <div style={{display:'flex', padding:'0 14px 14px', gap:12, alignItems:'flex-end'}}>
        <div style={{flex:1, minWidth:0}}>
          <div style={{
            fontSize:10, fontWeight:800, color:'rgba(255,255,255,0.8)', letterSpacing:0.6, textTransform:'uppercase',
            marginBottom:4,
          }}>Don Cheto · Parrilla</div>
          <div style={{
            fontSize:22, fontWeight:900, color:'#FFFFFF', letterSpacing:-0.8,
            lineHeight:1.05, textWrap:'pretty',
          }}>2×1 en hamburguesas completas</div>
          <div style={{
            display:'flex', alignItems:'baseline', gap:8, marginTop:10,
          }}>
            <div style={{
              background:'#FFBF00', color:'#111',
              border:'1.5px solid #111',
              padding:'4px 10px', borderRadius:10,
              fontSize:18, fontWeight:900, letterSpacing:-0.4,
            }}>-50%</div>
            <div style={{fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.75)'}}>
              Ahorrás hasta <span style={{color:'#fff'}}>$8.400</span>
            </div>
          </div>
          <button style={{
            marginTop:12, height:36, padding:'0 16px',
            border:'1.5px solid #111', borderRadius:999,
            background:'#111', color:'#fff',
            fontFamily:'inherit', fontWeight:900, fontSize:12, letterSpacing:-0.2,
            display:'inline-flex', alignItems:'center', gap:6, cursor:'pointer',
          }}>
            Quiero esta promo <Icon.chev size={12} color="#fff"/>
          </button>
        </div>
        <div style={{flexShrink:0, position:'relative'}}>
          <Photo label="food / burger" w={108} h={128} tint="#3a1e10" accent="#c2853a" radius={16} style={{border:'1.5px solid #111'}}/>
          {/* sticker */}
          <div style={{
            position:'absolute', top:-10, right:-10,
            width:44, height:44, borderRadius:'50%',
            background:'#FFBF00', border:'1.5px solid #111',
            display:'flex', alignItems:'center', justifyContent:'center',
            transform:'rotate(12deg)',
          }}>
            <PromyGlyph size={26} color="#FF3131" showStroke={true} strokeColor="#111"/>
          </div>
        </div>
      </div>

      {/* dashed tear */}
      <div style={{
        borderTop:'1.5px dashed rgba(255,255,255,0.35)',
        padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between',
        background:'rgba(0,0,0,0.12)',
      }}>
        <div style={{display:'flex', alignItems:'center', gap:6, fontSize:10.5, fontWeight:800, color:'rgba(255,255,255,0.9)'}}>
          <Icon.walk size={11} color="rgba(255,255,255,0.9)"/> 850 m · Peatonal Urquiza
        </div>
        <div style={{fontSize:10.5, fontWeight:800, color:'rgba(255,255,255,0.9)'}}>
          ★ 4.8 · 312 canjes hoy
        </div>
      </div>
    </div>
  );
}

// ─── HOT del día (horizontal scroll) ──────────────────────────────
function HotCard({ name, title, discount, distance, tint, accent, photoLabel, price }) {
  return (
    <div style={{
      flexShrink:0, width:192,
      background:'#FFFFFF',
      border:'1.5px solid #111',
      borderRadius:18,
      boxShadow:'0 4px 0 #111',
      overflow:'hidden',
    }}>
      <div style={{position:'relative'}}>
        <Photo label={photoLabel} w={192-3} h={118} tint={tint} accent={accent} radius={0}/>
        {/* discount badge */}
        <div style={{
          position:'absolute', top:8, left:8,
          background:'#FF3131', color:'#fff', border:'1.5px solid #111',
          padding:'4px 9px', borderRadius:999,
          fontSize:11, fontWeight:900, letterSpacing:-0.2,
        }}>{discount}</div>
        {/* HOT badge */}
        <div style={{
          position:'absolute', top:8, right:8,
          background:'#FFBF00', color:'#111', border:'1.5px solid #111',
          padding:'4px 8px', borderRadius:999,
          fontSize:9.5, fontWeight:900, letterSpacing:0.4,
          display:'flex', alignItems:'center', gap:3, textTransform:'uppercase',
        }}>
          <Icon.flame size={10} color="#FF3131"/> HOT
        </div>
      </div>
      <div style={{padding:'10px 12px 12px'}}>
        <div style={{fontSize:10, fontWeight:800, color:'#6A6256', letterSpacing:0.4, textTransform:'uppercase', marginBottom:2}}>
          {name}
        </div>
        <div style={{fontSize:13.5, fontWeight:800, color:'#1A1614', letterSpacing:-0.3, lineHeight:1.15, marginBottom:8,
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden'}}>
          {title}
        </div>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div style={{fontSize:12, fontWeight:900, color:'#FF3131', letterSpacing:-0.3}}>{price}</div>
          <div style={{display:'flex', alignItems:'center', gap:3, fontSize:10, fontWeight:700, color:'#6A6256'}}>
            <Icon.walk size={10} color="#6A6256"/> {distance}
          </div>
        </div>
      </div>
    </div>
  );
}

function HotSection() {
  const items = [
    {name:'La Biela Café', title:'3er café gratis con 2 medialunas', discount:'-40%', distance:'320 m', tint:'#3a2410', accent:'#c2853a', photoLabel:'coffee / pastry', price:'desde $2.800'},
    {name:'Heladería Como en Casa', title:'¼ kg + cono de regalo', discount:'-30%', distance:'680 m', tint:'#281535', accent:'#7a4b9e', photoLabel:'ice cream', price:'$3.500'},
    {name:'Studio Nina', title:'Manicura + esmaltado semi', discount:'-25%', distance:'1.1 km', tint:'#1e2a28', accent:'#3a9e8a', photoLabel:'beauty / nails', price:'$6.400'},
    {name:'Bar Candela', title:'Happy hour 2×1 tragos clásicos', discount:'-50%', distance:'450 m', tint:'#261818', accent:'#c24a4a', photoLabel:'bar / drinks', price:'desde $4.200'},
  ];
  return (
    <div style={{marginTop:20}}>
      <div style={{padding:'0 16px', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <div style={{fontSize:17, fontWeight:900, color:'#1A1614', letterSpacing:-0.5}}>Ofertas hot del día</div>
          <Icon.flame size={16} color="#FF3131"/>
        </div>
        <button style={{border:0, background:'transparent', cursor:'pointer',
          display:'flex', alignItems:'center', gap:2,
          fontFamily:'inherit', fontSize:12, fontWeight:800, color:'#FF3131'}}>
          Ver todas <Icon.chev size={12} color="#FF3131"/>
        </button>
      </div>
      <div style={{display:'flex', gap:12, overflow:'visible', padding:'2px 16px 6px'}}>
        {items.map((it, i) => <HotCard key={i} {...it}/>)}
      </div>
    </div>
  );
}

// ─── Rubros ───────────────────────────────────────────────────────
function RubrosSection() {
  const rubros = [
    {label:'Gastronomía', bg:'#FFE8D6', tint:'#c2853a', emoji:'🍔', accent:'#FF8A4A'},
    {label:'Cafeterías',  bg:'#F6E5CD', tint:'#8a5a2a', emoji:'☕', accent:'#C4915F'},
    {label:'Bares',       bg:'#E8DBFF', tint:'#6a3aa0', emoji:'🍻', accent:'#9068D4'},
    {label:'Heladerías',  bg:'#FFDEEF', tint:'#c24a7a', emoji:'🍦', accent:'#FF7AB0'},
    {label:'Estética',    bg:'#FFE3E3', tint:'#c24a4a', emoji:'💅', accent:'#FF7070'},
    {label:'Peluquerías', bg:'#DDF1E6', tint:'#2a8a5a', emoji:'✂️', accent:'#5CC08A'},
    {label:'Gimnasios',   bg:'#D7E6FF', tint:'#3a5ac2', emoji:'🏋️', accent:'#6787DE'},
    {label:'Servicios',   bg:'#FFF3C7', tint:'#a08a2a', emoji:'🛠️', accent:'#D4B851'},
  ];
  return (
    <div style={{marginTop:22}}>
      <div style={{padding:'0 16px', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
        <div style={{fontSize:17, fontWeight:900, color:'#1A1614', letterSpacing:-0.5}}>Explorá por rubro</div>
        <div style={{
          background:'#FFF3DE', border:'1px solid #F0DFC0',
          padding:'3px 10px', borderRadius:999,
          fontSize:10, fontWeight:800, color:'#6A6256',
        }}>8 categorías</div>
      </div>
      <div style={{
        padding:'0 12px', display:'grid',
        gridTemplateColumns:'repeat(4, 1fr)',
        rowGap:14, columnGap:0, justifyItems:'center',
      }}>
        {rubros.map((r,i) => <Rubro key={i} {...r}/>)}
      </div>
    </div>
  );
}

// ─── Cerca tuyo — list items ──────────────────────────────────────
function CercaItem({ name, promo, distance, cat, tint, accent, photoLabel, open }) {
  return (
    <div style={{
      display:'flex', gap:12, padding:10,
      background:'#FFFFFF', border:'1px solid #F0DFC0',
      borderRadius:18, alignItems:'center',
    }}>
      <Photo label={photoLabel} w={64} h={64} tint={tint} accent={accent} radius={14}/>
      <div style={{flex:1, minWidth:0}}>
        <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:2}}>
          <div style={{fontSize:13.5, fontWeight:800, color:'#1A1614', letterSpacing:-0.3,
            whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:150}}>{name}</div>
          {open && <div style={{
            width:6, height:6, borderRadius:'50%', background:'#24A865',
            boxShadow:'0 0 0 3px rgba(36,168,101,0.18)',
          }}/>}
        </div>
        <div style={{
          display:'inline-block', background:'#FFF3DE',
          color:'#8a5a2a', border:'1px solid #F0DFC0',
          padding:'2px 7px', borderRadius:6,
          fontSize:10, fontWeight:800, marginBottom:6,
        }}>{cat}</div>
        <div style={{fontSize:11.5, fontWeight:700, color:'#6A6256', lineHeight:1.25,
          display:'-webkit-box', WebkitLineClamp:1, WebkitBoxOrient:'vertical', overflow:'hidden'}}>
          {promo}
        </div>
      </div>
      <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6}}>
        <div style={{
          background:'#FF3131', color:'#fff',
          padding:'3px 8px', borderRadius:999,
          fontSize:10, fontWeight:900, letterSpacing:-0.1,
        }}>-20%</div>
        <div style={{display:'flex', alignItems:'center', gap:3, fontSize:10.5, fontWeight:800, color:'#1A1614'}}>
          <Icon.walk size={10} color="#1A1614"/> {distance}
        </div>
      </div>
    </div>
  );
}

function CercaSection() {
  const items = [
    {name:'Pizzería Il Forno', promo:'Pizza grande + 2 bebidas a $9.900', distance:'220 m', cat:'Gastronomía', tint:'#3a2410', accent:'#c2853a', photoLabel:'pizza', open:true},
    {name:'Gym Arena 24h', promo:'Primer mes 40% off sin matrícula', distance:'540 m', cat:'Gimnasios', tint:'#1e2438', accent:'#4a5ec2', photoLabel:'gym', open:true},
    {name:'Café Urquiza', promo:'Desayuno completo $3.600 (-30%)', distance:'380 m', cat:'Cafeterías', tint:'#2a1a10', accent:'#a87438', photoLabel:'café', open:true},
  ];
  return (
    <div style={{marginTop:24}}>
      <div style={{padding:'0 16px', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
        <div>
          <div style={{fontSize:17, fontWeight:900, color:'#1A1614', letterSpacing:-0.5}}>Cerca tuyo</div>
          <div style={{fontSize:11.5, fontWeight:700, color:'#6A6256', marginTop:1}}>A menos de 1 km en Concordia centro</div>
        </div>
        <button style={{
          border:'1.5px solid #111', background:'#FFFDF8',
          padding:'6px 12px', borderRadius:999,
          fontFamily:'inherit', fontSize:11, fontWeight:800, color:'#111',
          display:'flex', alignItems:'center', gap:4, cursor:'pointer',
        }}>
          <Icon.map size={13} color="#111"/> Mapa
        </button>
      </div>
      <div style={{padding:'0 16px', display:'flex', flexDirection:'column', gap:10}}>
        {items.map((it,i) => <CercaItem key={i} {...it}/>)}
      </div>
    </div>
  );
}

// ─── CTA Comercios ────────────────────────────────────────────────
function ComerciosCTA() {
  return (
    <div style={{margin:'24px 16px 0'}}>
      <div style={{
        position:'relative', overflow:'hidden',
        background:'#FFBF00', border:'1.5px solid #111', borderRadius:22,
        boxShadow:'0 6px 0 #111',
        padding:'16px 16px',
      }}>
        {/* P watermark */}
        <div style={{position:'absolute', right:-12, bottom:-18, opacity:0.95, transform:'rotate(-6deg)'}}>
          <PromyGlyph size={130} color="#FF3131" strokeColor="#111"/>
        </div>
        <div style={{position:'relative', maxWidth:'65%'}}>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:5,
            background:'#111', color:'#FFBF00',
            padding:'3px 9px', borderRadius:999,
            fontSize:9, fontWeight:900, letterSpacing:0.6, textTransform:'uppercase', marginBottom:8,
          }}>
            <Icon.store size={10} color="#FFBF00"/> Para comercios
          </div>
          <div style={{fontSize:18, fontWeight:900, color:'#111', letterSpacing:-0.5, lineHeight:1.1}}>
            ¿Tenés un negocio en Concordia?
          </div>
          <div style={{fontSize:12, fontWeight:600, color:'rgba(17,17,17,0.75)', marginTop:4, lineHeight:1.35, textWrap:'pretty'}}>
            Sumate a PROMY y llegá a +12.000 clientes activos de la ciudad.
          </div>
          <button style={{
            marginTop:12, height:36, padding:'0 16px',
            border:'1.5px solid #111', borderRadius:999,
            background:'#FF3131', color:'#fff',
            fontFamily:'inherit', fontWeight:900, fontSize:12,
            display:'inline-flex', alignItems:'center', gap:6, cursor:'pointer',
            boxShadow:'0 3px 0 #111',
          }}>
            Sumar mi comercio <Icon.chev size={12} color="#fff"/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Actividad reciente ───────────────────────────────────────────
function ActividadSection() {
  return (
    <div style={{marginTop:22, padding:'0 16px'}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
        <div style={{fontSize:13, fontWeight:800, color:'#1A1614', letterSpacing:-0.2}}>Tu actividad reciente</div>
        <div style={{fontSize:11, fontWeight:700, color:'#6A6256'}}>Ahorraste $14.280 este mes</div>
      </div>
      <div style={{
        display:'flex', gap:10, padding:'10px 12px',
        background:'#FFF8EA', border:'1px solid #F0DFC0', borderRadius:16,
        alignItems:'center',
      }}>
        <div style={{
          width:40, height:40, borderRadius:12,
          background:'#FF3131', border:'1.5px solid #111',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <Icon.ticket size={20} color="#fff"/>
        </div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:12, fontWeight:800, color:'#1A1614'}}>Canjeaste en <span style={{color:'#FF3131'}}>Don Cheto</span></div>
          <div style={{fontSize:10.5, fontWeight:700, color:'#6A6256'}}>Hace 2 días · ahorraste $3.400</div>
        </div>
        <button style={{
          border:0, background:'transparent', cursor:'pointer',
          fontFamily:'inherit', fontSize:11, fontWeight:800, color:'#FF3131',
        }}>Calificar →</button>
      </div>
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────
function TabBar({ active='home' }) {
  const tabs = [
    {id:'home', label:'Inicio', icon: Icon.home},
    {id:'map', label:'Mapa', icon: Icon.map},
    {id:'explorar', label:'Explorar'},
    {id:'canjes', label:'Canjes', icon: Icon.ticket},
    {id:'perfil', label:'Perfil', icon: Icon.user},
  ];
  return (
    <div style={{
      position:'absolute', left:0, right:0, bottom:0,
      background:'#FFFFFF',
      borderTop:'1px solid #F0DFC0',
      paddingTop:8, paddingBottom:26,
      display:'flex', alignItems:'flex-start', justifyContent:'space-around',
    }}>
      {tabs.map(t => {
        if (t.id === 'explorar') {
          // big FAB in the middle
          return (
            <div key={t.id} style={{marginTop:-28, display:'flex', flexDirection:'column', alignItems:'center', gap:4}}>
              <div style={{
                width:60, height:60, borderRadius:'50%',
                background:'#FFBF00', border:'2px solid #111',
                boxShadow:'0 5px 0 #111',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <PromyGlyph size={34} color="#FF3131" strokeColor="#111"/>
              </div>
              <div style={{fontSize:10, fontWeight:900, color:'#111', letterSpacing:-0.1, marginTop:2}}>Explorar</div>
            </div>
          );
        }
        const IconC = t.icon;
        const isActive = t.id === active;
        return (
          <button key={t.id} style={{
            border:0, background:'transparent', cursor:'pointer',
            display:'flex', flexDirection:'column', alignItems:'center', gap:3,
            padding:'2px 8px', minWidth:56,
          }}>
            <div style={{
              padding:'6px 14px', borderRadius:999,
              background: isActive ? 'rgba(255,49,49,0.12)' : 'transparent',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <IconC size={20} color={isActive ? '#FF3131' : '#6A6256'}/>
            </div>
            <div style={{
              fontSize:10, fontWeight: isActive ? 900 : 700,
              color: isActive ? '#FF3131' : '#6A6256', letterSpacing:-0.1,
            }}>{t.label}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─── HomeScreen composition ───────────────────────────────────────
function HomeScreen() {
  return (
    <PhoneFrame bg="#FFFDF8" statusDark={true}>
      {/* Scrollable content */}
      <div style={{
        position:'absolute', inset:0, bottom:84,
        overflow:'auto', overscrollBehavior:'contain',
      }}>
        <HomeHeader/>
        <HeroPromo/>
        <HotSection/>
        <RubrosSection/>
        <CercaSection/>
        <ComerciosCTA/>
        <ActividadSection/>
        <div style={{height:28}}/>
      </div>
      <TabBar active="home"/>
    </PhoneFrame>
  );
}

Object.assign(window, { HomeScreen });
