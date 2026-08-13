// ProfileScreen — PROMY mobile profile (375×812)
// Sigue el sistema de Home: grafito + glows, CTAs pill rojas, cards blancas con
// borde #111 y sombra dura, watermark de P-glyph, amarillo para beneficios, rojo
// para acción. El objetivo: se siente "mi cuenta en PROMY", no un settings genérico.

// ─── Iconografía ────────────────────────────────────────────────────
const PIcon = {
  chev: (p={}) => (
    <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke={p.color||'currentColor'} strokeWidth="2.5" strokeLinecap="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  ),
  pencil: (p={}) => (
    <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke={p.color||'currentColor'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4z"/>
    </svg>
  ),
  ticket: (p={}) => (
    <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke={p.color||'currentColor'} strokeWidth="2.2" strokeLinejoin="round">
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/>
      <path d="M10 6v12" strokeDasharray="2 2"/>
    </svg>
  ),
  heart: (p={}) => (
    <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill={p.fill||'none'} stroke={p.color||'currentColor'} strokeWidth="2.2" strokeLinejoin="round">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>
    </svg>
  ),
  bell: (p={}) => (
    <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke={p.color||'currentColor'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>
    </svg>
  ),
  help: (p={}) => (
    <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke={p.color||'currentColor'} strokeWidth="2.2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-1 .4-1.5 1-1.5 2.2"/><circle cx="12" cy="17" r="0.6" fill="currentColor"/>
    </svg>
  ),
  shield: (p={}) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke={p.color||'currentColor'} strokeWidth="2.2" strokeLinejoin="round">
      <path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>
    </svg>
  ),
  doc: (p={}) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke={p.color||'currentColor'} strokeWidth="2.2" strokeLinejoin="round">
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>
    </svg>
  ),
  settings: (p={}) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke={p.color||'currentColor'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9A1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.2.6.8 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
    </svg>
  ),
  logout: (p={}) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke={p.color||'currentColor'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>
    </svg>
  ),
  walk: (p={}) => (
    <svg width={p.size||12} height={p.size||12} viewBox="0 0 24 24" fill="none" stroke={p.color||'currentColor'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13" cy="4" r="2"/><path d="m5 22 3-8 4 2 3-5 5 4"/><path d="m8 14 2-6"/>
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
  user: (p={}) => (
    <svg width={p.size||22} height={p.size||22} viewBox="0 0 24 24" fill={p.fill||'none'} stroke={p.color||'currentColor'} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>
    </svg>
  ),
  check: (p={}) => (
    <svg width={p.size||12} height={p.size||12} viewBox="0 0 24 24" fill="none" stroke={p.color||'currentColor'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12 5 5 9-11"/>
    </svg>
  ),
  coin: (p={}) => (
    <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke={p.color||'currentColor'} strokeWidth="2.2">
      <circle cx="12" cy="12" r="9"/><path d="M12 6v12M15 9h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4h-4" strokeLinecap="round"/>
    </svg>
  ),
  qr: (p={}) => (
    <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke={p.color||'currentColor'} strokeWidth="2" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3M17 20h4M21 14v3M14 21v-4"/>
    </svg>
  ),
  star: (p={}) => (
    <svg width={p.size||12} height={p.size||12} viewBox="0 0 24 24" fill={p.fill||'currentColor'}>
      <path d="m12 2 3 7 7 .6-5.3 4.6L18 21l-6-4-6 4 1.3-6.8L2 9.6 9 9z"/>
    </svg>
  ),
  arrowUp: (p={}) => (
    <svg width={p.size||12} height={p.size||12} viewBox="0 0 24 24" fill="none" stroke={p.color||'currentColor'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7"/>
    </svg>
  ),
};

// ─── Placeholder photo (same pattern as home) ──────────────────────
function PPhoto({ label, w, h, tint='#2B1E14', accent='#8a6b3a', radius=14, style={} }) {
  const pat = `repeating-linear-gradient(135deg, ${tint} 0 14px, ${accent}22 14px 28px)`;
  return (
    <div style={{
      width:w, height:h, borderRadius: radius,
      background: `linear-gradient(180deg, ${tint}DD, ${tint}), ${pat}`,
      backgroundBlendMode: 'multiply',
      position:'relative', overflow:'hidden', flexShrink:0,
      ...style,
    }}>
      <div style={{position:'absolute', inset:0, background: pat, opacity:0.55}}/>
      <div style={{position:'absolute', inset:0, background: `radial-gradient(120% 80% at 30% 30%, rgba(255,255,255,0.12), transparent 60%)`}}/>
      <div style={{
        position:'absolute', left:6, bottom:6,
        background:'rgba(0,0,0,0.55)', color:'rgba(255,255,255,0.85)',
        fontFamily:'ui-monospace, Menlo, monospace',
        fontSize:8, fontWeight:700, padding:'2px 5px', borderRadius:4,
        letterSpacing:0.3,
      }}>{label}</div>
    </div>
  );
}

// ─── Header con identidad (grafito + glows + P-glyph avatar) ───────
function ProfileHeader() {
  return (
    <div style={{
      position:'relative',
      background: '#0E0E10',
      padding: '54px 18px 72px',
      borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
      overflow:'hidden',
    }}>
      {/* glows */}
      <div style={{
        position:'absolute', top:-40, left:-50, width:240, height:240,
        background:'radial-gradient(closest-side, rgba(255,191,0,0.55), transparent 70%)',
        filter:'blur(4px)',
      }}/>
      <div style={{
        position:'absolute', top:80, right:-60, width:220, height:220,
        background:'radial-gradient(closest-side, rgba(255,49,49,0.45), transparent 70%)',
        filter:'blur(8px)',
      }}/>

      {/* watermark P */}
      <div style={{
        position:'absolute', right:-30, bottom:-30, opacity:0.06, transform:'rotate(-12deg)',
      }}>
        <PromyGlyph size={220} color="#FFFFFF" showStroke={false}/>
      </div>

      {/* top row: label + settings */}
      <div style={{position:'relative', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <div style={{
          fontSize:10, fontWeight:900, letterSpacing:1.2, textTransform:'uppercase',
          color:'rgba(255,255,255,0.6)',
        }}>Mi cuenta</div>
        <button style={{
          border:'1px solid rgba(255,255,255,0.16)', cursor:'pointer',
          width:36, height:36, borderRadius:12,
          background:'rgba(255,255,255,0.06)', color:'#fff',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <PIcon.settings size={17} color="rgba(255,255,255,0.85)"/>
        </button>
      </div>

      {/* Avatar + name block */}
      <div style={{position:'relative', marginTop:20, display:'flex', gap:14, alignItems:'center'}}>
        {/* Avatar — yellow circle with P-glyph, hard stroke, active ring */}
        <div style={{position:'relative', flexShrink:0}}>
          {/* outer ring */}
          <div style={{
            position:'absolute', inset:-5,
            borderRadius:'50%',
            border:'1.5px dashed rgba(255,191,0,0.6)',
          }}/>
          <div style={{
            width:76, height:76, borderRadius:'50%',
            background:'#FFBF00', border:'2px solid #111',
            boxShadow:'0 5px 0 #111',
            display:'flex', alignItems:'center', justifyContent:'center',
            position:'relative', overflow:'hidden',
          }}>
            <PromyGlyph size={46} color="#FF3131" strokeColor="#111"/>
          </div>
          {/* verified dot */}
          <div style={{
            position:'absolute', bottom:-2, right:-2,
            width:24, height:24, borderRadius:'50%',
            background:'#24A865', border:'2px solid #0E0E10',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <PIcon.check size={11} color="#fff"/>
          </div>
        </div>

        <div style={{flex:1, minWidth:0}}>
          <div style={{
            fontSize:23, fontWeight:900, color:'#FFFFFF', letterSpacing:-0.7, lineHeight:1.05,
          }}>Juan Díaz</div>
          <div style={{
            fontSize:12.5, fontWeight:600, color:'rgba(255,255,255,0.66)', marginTop:4,
            display:'flex', alignItems:'center', gap:6,
          }}>
            cliente@promy.com
          </div>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:6, marginTop:9,
            background:'rgba(255,191,0,0.14)', color:'#FFBF00',
            border:'1px solid rgba(255,191,0,0.28)',
            padding:'3px 9px', borderRadius:999,
            fontSize:10, fontWeight:900, letterSpacing:0.6, textTransform:'uppercase',
          }}>
            <PIcon.star size={10} color="#FFBF00"/> Miembro desde abril 2025
          </div>
        </div>
      </div>

      {/* Edit profile CTA */}
      <div style={{position:'relative', marginTop:18, display:'flex', gap:10}}>
        <button style={{
          flex:1, height:44, border:'1.5px solid rgba(255,255,255,0.16)',
          background:'rgba(255,255,255,0.06)', color:'#fff',
          fontFamily:'inherit', fontWeight:800, fontSize:13, letterSpacing:-0.2,
          borderRadius:999, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
        }}>
          <PIcon.pencil size={13} color="#fff"/> Editar perfil
        </button>
        <button style={{
          height:44, padding:'0 18px',
          border:'1.5px solid #111',
          background:'#FFBF00', color:'#111',
          fontFamily:'inherit', fontWeight:900, fontSize:13, letterSpacing:-0.2,
          borderRadius:999, cursor:'pointer',
          display:'flex', alignItems:'center', gap:6,
          boxShadow:'0 3px 0 #111',
        }}>
          <PIcon.qr size={13} color="#111"/> Mi QR
        </button>
      </div>
    </div>
  );
}

// ─── Card principal de valor / ahorro del mes ──────────────────────
function SavingsHeroCard() {
  return (
    <div style={{
      margin:'-56px 16px 0', position:'relative', zIndex:2,
      borderRadius:22,
      background:'#FFFFFF',
      border:'1.5px solid #111',
      boxShadow:'0 6px 0 #111, 0 20px 40px rgba(0,0,0,0.12)',
      overflow:'hidden',
    }}>
      {/* Top: label pill + month */}
      <div style={{
        padding:'14px 16px 0', display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div style={{
          display:'inline-flex', alignItems:'center', gap:6,
          background:'#FFBF00', color:'#111',
          border:'1.5px solid #111',
          padding:'4px 10px', borderRadius:999,
          fontSize:9.5, fontWeight:900, letterSpacing:0.6, textTransform:'uppercase',
        }}>
          <PIcon.coin size={11} color="#111"/> Tu ahorro del mes
        </div>
        <div style={{
          fontSize:10.5, fontWeight:800, color:'#6A6256', letterSpacing:0.4, textTransform:'uppercase',
        }}>Abril 2026</div>
      </div>

      {/* Big number */}
      <div style={{padding:'10px 16px 6px', position:'relative'}}>
        <div style={{
          fontSize:40, fontWeight:900, color:'#1A1614', letterSpacing:-1.6, lineHeight:1,
          display:'flex', alignItems:'baseline', gap:6,
        }}>
          <span style={{fontSize:22, fontWeight:800, color:'#6A6256'}}>$</span>
          12.400
        </div>
        <div style={{
          fontSize:12.5, fontWeight:700, color:'#6A6256', marginTop:6, display:'flex', alignItems:'center', gap:6,
        }}>
          Ahorraste con
          <span style={{
            display:'inline-flex', alignItems:'center', gap:4,
            background:'#FFF3DE', border:'1px solid #F0DFC0',
            padding:'2px 7px', borderRadius:6,
            fontSize:11, fontWeight:800, color:'#1A1614',
          }}>
            <PromyGlyph size={10} color="#FF3131" showStroke={false}/> PROMY
          </span>
        </div>

        {/* trend chip */}
        <div style={{
          position:'absolute', top:10, right:16,
          display:'inline-flex', alignItems:'center', gap:4,
          background:'rgba(36,168,101,0.12)', color:'#1B7A49',
          border:'1px solid rgba(36,168,101,0.28)',
          padding:'4px 8px', borderRadius:999,
          fontSize:10.5, fontWeight:900, letterSpacing:-0.1,
        }}>
          <PIcon.arrowUp size={10} color="#24A865"/> +38% vs. marzo
        </div>
      </div>

      {/* Progress to goal */}
      <div style={{padding:'6px 16px 14px'}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6}}>
          <div style={{fontSize:11, fontWeight:800, color:'#1A1614'}}>Meta mensual · $15.000</div>
          <div style={{fontSize:10.5, fontWeight:800, color:'#6A6256'}}>83%</div>
        </div>
        <div style={{
          height:10, borderRadius:999,
          background:'#FFF3DE', border:'1.5px solid #111',
          overflow:'hidden', position:'relative',
        }}>
          <div style={{
            width:'83%', height:'100%',
            background:'linear-gradient(90deg, #FFBF00 0%, #FFBF00 70%, #FF3131 100%)',
            borderRight:'1.5px solid #111',
          }}/>
          {/* scale ticks */}
          <div style={{
            position:'absolute', inset:0, display:'flex', justifyContent:'space-between',
            padding:'0 18%', alignItems:'center', pointerEvents:'none',
          }}>
            {[0,1,2].map(i => <div key={i} style={{width:1.5, height:4, background:'rgba(17,17,17,0.35)'}}/>)}
          </div>
        </div>
      </div>

      {/* footer strip — dashed */}
      <div style={{
        borderTop:'1.5px dashed rgba(17,17,17,0.18)',
        padding:'10px 16px',
        background:'#FFF8EA',
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div style={{fontSize:11, fontWeight:700, color:'#1A1614', letterSpacing:-0.1}}>
          <span style={{color:'#6A6256'}}>Desde que te sumaste:</span> <b>$48.920</b> ahorrados
        </div>
        <div style={{display:'flex', alignItems:'center', gap:3, fontSize:11, fontWeight:900, color:'#FF3131'}}>
          Ver detalle <PIcon.chev size={11} color="#FF3131"/>
        </div>
      </div>
    </div>
  );
}

// ─── Mini stats row ────────────────────────────────────────────────
function MiniStat({ value, label, icon, accent='#FF3131', bg='#FFF8EA' }) {
  return (
    <div style={{
      flex:1,
      background:'#FFFFFF',
      border:'1px solid #F0DFC0',
      borderRadius:16,
      padding:'12px 10px',
      display:'flex', flexDirection:'column', gap:6,
      position:'relative', overflow:'hidden',
    }}>
      <div style={{
        width:30, height:30, borderRadius:10,
        background:bg, border:`1.5px solid ${accent}33`,
        display:'flex', alignItems:'center', justifyContent:'center',
        color:accent,
      }}>{icon}</div>
      <div style={{
        fontSize:20, fontWeight:900, color:'#1A1614', letterSpacing:-0.7, lineHeight:1,
      }}>{value}</div>
      <div style={{
        fontSize:10.5, fontWeight:700, color:'#6A6256', letterSpacing:-0.1, lineHeight:1.2,
      }}>{label}</div>
    </div>
  );
}

function MiniStatsRow() {
  return (
    <div style={{margin:'14px 16px 0', display:'flex', gap:8}}>
      <MiniStat
        value="3"
        label="Canjes este mes"
        icon={<PIcon.ticket size={16}/>}
        accent="#FF3131" bg="#FFE8E8"
      />
      <MiniStat
        value="8"
        label="Comercios favoritos"
        icon={<PIcon.heart size={16} fill="#FF3131" color="#FF3131"/>}
        accent="#FF3131" bg="#FFE8E8"
      />
      <MiniStat
        value="12"
        label="Promos usadas"
        icon={<PIcon.star size={16} fill="#FFBF00" color="#FFBF00"/>}
        accent="#B78A00" bg="#FFF3DE"
      />
    </div>
  );
}

// ─── Accesos rápidos ───────────────────────────────────────────────
function QuickAccess({ label, sub, icon, bg, accent, ribbon }) {
  return (
    <div style={{
      flex:1,
      background:bg,
      border:'1.5px solid #111',
      borderRadius:18,
      padding:'14px',
      boxShadow:'0 4px 0 #111',
      display:'flex', flexDirection:'column', gap:10,
      position:'relative', overflow:'hidden',
      cursor:'pointer',
    }}>
      {ribbon && (
        <div style={{
          position:'absolute', top:8, right:8,
          background:'#FF3131', color:'#fff', border:'1.5px solid #111',
          padding:'2px 7px', borderRadius:999,
          fontSize:9, fontWeight:900, letterSpacing:0.4,
        }}>{ribbon}</div>
      )}
      <div style={{
        width:38, height:38, borderRadius:12,
        background:'#FFFFFF', border:'1.5px solid #111',
        display:'flex', alignItems:'center', justifyContent:'center',
        color:accent,
      }}>{icon}</div>
      <div>
        <div style={{fontSize:14, fontWeight:900, color:'#1A1614', letterSpacing:-0.3, lineHeight:1.1}}>{label}</div>
        <div style={{fontSize:10.5, fontWeight:700, color:'rgba(17,17,17,0.58)', marginTop:3}}>{sub}</div>
      </div>
    </div>
  );
}

function QuickAccessSection() {
  return (
    <div style={{marginTop:22}}>
      <div style={{padding:'0 16px', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
        <div style={{fontSize:17, fontWeight:900, color:'#1A1614', letterSpacing:-0.5}}>Accesos rápidos</div>
      </div>
      <div style={{padding:'0 16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
        <QuickAccess
          label="Mis canjes"
          sub="12 activos"
          icon={<PIcon.ticket size={19}/>}
          bg="#FFBF00" accent="#FF3131"
          ribbon="2 nuevos"
        />
        <QuickAccess
          label="Favoritos"
          sub="8 guardados"
          icon={<PIcon.heart size={19} fill="#FF3131" color="#FF3131"/>}
          bg="#FFF8EA" accent="#FF3131"
        />
        <QuickAccess
          label="Notificaciones"
          sub="3 sin leer"
          icon={<PIcon.bell size={19}/>}
          bg="#FFF8EA" accent="#1A1614"
        />
        <QuickAccess
          label="Ayuda & soporte"
          sub="Chat 24/7"
          icon={<PIcon.help size={19}/>}
          bg="#FFFFFF" accent="#1A1614"
        />
      </div>
    </div>
  );
}

// ─── Actividad reciente ────────────────────────────────────────────
function ActivityItem({ promo, store, date, saved, tint, accent, photoLabel, success=true }) {
  return (
    <div style={{
      display:'flex', gap:12, padding:10,
      background:'#FFFFFF', border:'1px solid #F0DFC0',
      borderRadius:16, alignItems:'center',
    }}>
      <div style={{position:'relative'}}>
        <PPhoto label={photoLabel} w={54} h={54} tint={tint} accent={accent} radius={12}/>
        {success && (
          <div style={{
            position:'absolute', bottom:-4, right:-4,
            width:22, height:22, borderRadius:'50%',
            background:'#24A865', border:'2px solid #FFFFFF',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <PIcon.check size={10} color="#fff"/>
          </div>
        )}
      </div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{
          display:'inline-block', background:'#FFF3DE',
          color:'#8a5a2a', border:'1px solid #F0DFC0',
          padding:'1.5px 6px', borderRadius:5,
          fontSize:9.5, fontWeight:800, marginBottom:4,
        }}>{store}</div>
        <div style={{
          fontSize:13, fontWeight:800, color:'#1A1614', letterSpacing:-0.3, lineHeight:1.2,
          whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
        }}>{promo}</div>
        <div style={{
          fontSize:10.5, fontWeight:700, color:'#6A6256', marginTop:3,
          display:'flex', alignItems:'center', gap:8,
        }}>
          <span>{date}</span>
          <span style={{width:3, height:3, borderRadius:'50%', background:'#6A6256', opacity:0.5}}/>
          <span style={{color:'#24A865', fontWeight:800}}>Canje exitoso</span>
        </div>
      </div>
      <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4}}>
        <div style={{
          background:'#FFBF00', color:'#111', border:'1.5px solid #111',
          padding:'2.5px 7px', borderRadius:999,
          fontSize:10, fontWeight:900, letterSpacing:-0.1,
        }}>-{saved.pct}</div>
        <div style={{fontSize:10.5, fontWeight:900, color:'#24A865'}}>
          +${saved.amount}
        </div>
      </div>
    </div>
  );
}

function ActivitySection() {
  const items = [
    {promo:'20% OFF en combo doble', store:'Burger House Concordia', date:'16/4/2026',
      saved:{pct:'20%', amount:'1.800'}, tint:'#3a1e10', accent:'#c2853a', photoLabel:'burger'},
    {promo:'2×1 en café y medialunas', store:'La Biela Café', date:'12/4/2026',
      saved:{pct:'40%', amount:'2.400'}, tint:'#3a2410', accent:'#c2853a', photoLabel:'café'},
    {promo:'¼ kg helado + cono gratis', store:'Como en Casa', date:'08/4/2026',
      saved:{pct:'30%', amount:'1.200'}, tint:'#281535', accent:'#7a4b9e', photoLabel:'ice cream'},
  ];
  return (
    <div style={{marginTop:24}}>
      <div style={{padding:'0 16px', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
        <div>
          <div style={{fontSize:17, fontWeight:900, color:'#1A1614', letterSpacing:-0.5}}>Actividad reciente</div>
          <div style={{fontSize:11.5, fontWeight:700, color:'#6A6256', marginTop:1}}>Tus últimos canjes en Concordia</div>
        </div>
        <button style={{
          border:0, background:'transparent', cursor:'pointer',
          display:'flex', alignItems:'center', gap:2,
          fontFamily:'inherit', fontSize:12, fontWeight:800, color:'#FF3131',
        }}>
          Ver todo <PIcon.chev size={12} color="#FF3131"/>
        </button>
      </div>
      <div style={{padding:'0 16px', display:'flex', flexDirection:'column', gap:10}}>
        {items.map((it,i) => <ActivityItem key={i} {...it}/>)}
      </div>
    </div>
  );
}

// ─── Settings / soporte / términos ─────────────────────────────────
function SettingsRow({ icon, label, sub, right, divider=true, danger=false }) {
  const color = danger ? '#FF3131' : '#1A1614';
  return (
    <>
      <button style={{
        width:'100%', border:0, background:'transparent', cursor:'pointer',
        padding:'14px 14px',
        display:'flex', alignItems:'center', gap:12,
        fontFamily:'inherit', textAlign:'left',
      }}>
        <div style={{
          width:36, height:36, borderRadius:12,
          background: danger ? 'rgba(255,49,49,0.08)' : '#FFF3DE',
          border: danger ? '1px solid rgba(255,49,49,0.18)' : '1px solid #F0DFC0',
          display:'flex', alignItems:'center', justifyContent:'center',
          color,
        }}>{icon}</div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:13.5, fontWeight:800, color, letterSpacing:-0.2}}>{label}</div>
          {sub && <div style={{fontSize:11, fontWeight:600, color:'#6A6256', marginTop:1}}>{sub}</div>}
        </div>
        {right || <PIcon.chev size={14} color="#6A6256"/>}
      </button>
      {divider && <div style={{height:1, background:'#F0DFC0', marginLeft:62}}/>}
    </>
  );
}

function SettingsSection() {
  return (
    <div style={{marginTop:22, padding:'0 16px'}}>
      <div style={{
        fontSize:11, fontWeight:900, color:'#6A6256', letterSpacing:1,
        textTransform:'uppercase', marginBottom:10, paddingLeft:4,
      }}>Configuración</div>
      <div style={{
        background:'#FFFFFF', border:'1px solid #F0DFC0',
        borderRadius:18, overflow:'hidden',
      }}>
        <SettingsRow
          icon={<PIcon.settings size={17}/>}
          label="Ajustes de la app"
          sub="Idioma, datos, apariencia"
        />
        <SettingsRow
          icon={<PIcon.shield size={17}/>}
          label="Privacidad y seguridad"
          sub="Contraseña, verificación"
        />
        <SettingsRow
          icon={<PIcon.help size={17}/>}
          label="Soporte"
          sub="Chat con PROMY"
          right={
            <div style={{
              background:'#24A865', color:'#fff',
              padding:'2px 7px', borderRadius:999,
              fontSize:9.5, fontWeight:900, letterSpacing:0.4, textTransform:'uppercase',
            }}>Online</div>
          }
        />
        <SettingsRow
          icon={<PIcon.doc size={17}/>}
          label="Términos y condiciones"
          sub="Última versión · abril 2026"
          divider={false}
        />
      </div>

      {/* Logout — separated, accent red */}
      <button style={{
        marginTop:12, width:'100%',
        background:'#FFFFFF', border:'1.5px solid rgba(255,49,49,0.28)',
        borderRadius:16, cursor:'pointer',
        padding:'14px',
        display:'flex', alignItems:'center', justifyContent:'center', gap:8,
        fontFamily:'inherit', fontSize:13.5, fontWeight:900, color:'#FF3131', letterSpacing:-0.2,
      }}>
        <PIcon.logout size={15} color="#FF3131"/> Cerrar sesión
      </button>

      {/* Version */}
      <div style={{
        textAlign:'center', marginTop:14,
        fontSize:10.5, fontWeight:700, color:'#6A6256', letterSpacing:0.2,
        display:'flex', alignItems:'center', justifyContent:'center', gap:6,
      }}>
        <PromyGlyph size={12} color="#6A6256" showStroke={false}/>
        PROMY v2.4.1 · Hecho en Concordia, E.R.
      </div>
    </div>
  );
}

// ─── Tab bar (Perfil activo) ───────────────────────────────────────
function ProfileTabBar() {
  const active = 'perfil';
  const tabs = [
    {id:'home', label:'Inicio', icon: PIcon.home},
    {id:'map', label:'Mapa', icon: PIcon.map},
    {id:'explorar', label:'Explorar'},
    {id:'canjes', label:'Canjes', icon: PIcon.ticket},
    {id:'perfil', label:'Perfil', icon: PIcon.user},
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
              <IconC size={20} color={isActive ? '#FF3131' : '#6A6256'} fill={isActive && t.id==='perfil' ? 'rgba(255,49,49,0.08)' : 'none'}/>
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

// ─── ProfileScreen composition ─────────────────────────────────────
function ProfileScreen() {
  return (
    <PhoneFrame bg="#FFFDF8" statusDark={true}>
      <div style={{
        position:'absolute', inset:0, bottom:84,
        overflow:'auto', overscrollBehavior:'contain',
      }}>
        <ProfileHeader/>
        <SavingsHeroCard/>
        <MiniStatsRow/>
        <QuickAccessSection/>
        <ActivitySection/>
        <SettingsSection/>
        <div style={{height:28}}/>
      </div>
      <ProfileTabBar/>
    </PhoneFrame>
  );
}

Object.assign(window, { ProfileScreen });
