// Shared tokens + primitives for PROMY login variants

const promyTokens = {
  // Colors
  yellow: '#FFBF00',
  red: '#FF3131',
  headerDark: '#111111',
  graphite: '#0F0F10',
  bg: '#FFFDF8',
  surface: '#FFFFFF',
  surfaceWarm: '#FFF8EA',
  surfaceAlt: '#FFF3DE',
  success: '#24A865',
  textMuted: '#6A6256',
  mutedOnDark: 'rgba(255,255,255,0.66)',
  border: '#F0DFC0',
  ink: '#1A1614',

  // Shadows
  shadowSoft: '0 2px 10px rgba(0,0,0,0.06)',
  shadowCard: '0 8px 24px rgba(0,0,0,0.10)',
  shadowStrong: '0 14px 40px rgba(0,0,0,0.14)',
};

// ─────────────────────────────────────────────────────────────
// Phone frame — 375×812 iPhone-ish bezel with status bar + home bar
// ─────────────────────────────────────────────────────────────
function PhoneFrame({ children, bg = promyTokens.bg, statusDark = false }) {
  const statusColor = statusDark ? '#FFFFFF' : '#111111';
  return (
    <div style={{
      width: 375, height: 812, position: 'relative',
      background: bg,
      borderRadius: 44,
      overflow: 'hidden',
      fontFamily: '"Manrope", sans-serif',
    }} className="phone-screen">
      {/* Status bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 54,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        padding: '0 28px 8px', zIndex: 50, pointerEvents: 'none',
      }}>
        <span style={{
          fontSize: 15, fontWeight: 700, color: statusColor, letterSpacing: 0.2,
        }}>9:41</span>
        <div style={{display:'flex', gap: 6, alignItems:'center'}}>
          {/* signal */}
          <svg width="18" height="11" viewBox="0 0 18 11"><g fill={statusColor}>
            <rect x="0" y="7" width="3" height="4" rx="0.5"/>
            <rect x="5" y="5" width="3" height="6" rx="0.5"/>
            <rect x="10" y="2" width="3" height="9" rx="0.5"/>
            <rect x="15" y="0" width="3" height="11" rx="0.5"/>
          </g></svg>
          {/* wifi */}
          <svg width="17" height="11" viewBox="0 0 17 11" fill={statusColor}>
            <path d="M8.5 0C5.3 0 2.4 1.2 0 3.2l1.3 1.5a11 11 0 0 1 14.4 0L17 3.2A13 13 0 0 0 8.5 0zm0 4c-2 0-3.9.7-5.3 1.9l1.3 1.5a6 6 0 0 1 8 0l1.3-1.5A8 8 0 0 0 8.5 4zm0 4c-1 0-2 .4-2.8 1l2.8 2 2.8-2A4 4 0 0 0 8.5 8z"/>
          </svg>
          {/* battery */}
          <div style={{display:'flex', alignItems:'center', gap: 1}}>
            <div style={{
              width: 22, height: 11, border: `1.2px solid ${statusColor}`, borderRadius: 3,
              padding: 1.5, opacity: 0.95,
            }}>
              <div style={{width:'82%', height:'100%', background: statusColor, borderRadius: 1.5}}/>
            </div>
            <div style={{width:1, height:4, background: statusColor, opacity: 0.5}}/>
          </div>
        </div>
      </div>

      {/* Dynamic island */}
      <div style={{
        position:'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
        width: 120, height: 34, background: '#000', borderRadius: 20, zIndex: 60,
      }}/>

      {/* Screen content */}
      <div style={{position:'absolute', inset: 0}}>{children}</div>

      {/* Home indicator */}
      <div style={{
        position:'absolute', bottom: 8, left: '50%', transform:'translateX(-50%)',
        width: 134, height: 5, background: statusDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)',
        borderRadius: 3, zIndex: 50,
      }}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tabs (Iniciar sesión / Registrarse)
// ─────────────────────────────────────────────────────────────
function AuthTabs({ tab, setTab, variant = 'light' }) {
  const dark = variant === 'dark';
  const bg = dark ? 'rgba(255,255,255,0.08)' : promyTokens.surfaceAlt;
  const pillBg = dark ? '#FFFFFF' : promyTokens.headerDark;
  const inactive = dark ? 'rgba(255,255,255,0.6)' : promyTokens.textMuted;
  const activeColor = dark ? promyTokens.headerDark : '#FFFFFF';
  return (
    <div style={{
      display: 'flex', background: bg, borderRadius: 999, padding: 4,
      position: 'relative', height: 46,
    }}>
      {['login', 'signup'].map((k) => {
        const active = tab === k;
        return (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              flex: 1, border: 0, cursor: 'pointer',
              background: active ? pillBg : 'transparent',
              color: active ? activeColor : inactive,
              fontFamily: 'inherit', fontWeight: 800, fontSize: 14,
              letterSpacing: -0.2,
              borderRadius: 999, height: '100%',
              transition: 'all 0.2s ease',
            }}
          >
            {k === 'login' ? 'Iniciar sesión' : 'Registrarse'}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Input field
// ─────────────────────────────────────────────────────────────
function Field({ label, type = 'text', value, onChange, placeholder, icon, trailing, variant = 'light' }) {
  const [focused, setFocused] = React.useState(false);
  const dark = variant === 'dark';
  const bg = dark ? 'rgba(255,255,255,0.06)' : promyTokens.surface;
  const border = focused
    ? promyTokens.red
    : (dark ? 'rgba(255,255,255,0.12)' : promyTokens.border);
  const textColor = dark ? '#FFFFFF' : promyTokens.ink;
  const labelColor = dark ? 'rgba(255,255,255,0.72)' : promyTokens.textMuted;
  return (
    <div>
      {label && (
        <div style={{
          fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase',
          color: labelColor, marginBottom: 8, paddingLeft: 4,
        }}>{label}</div>
      )}
      <div style={{
        display: 'flex', alignItems: 'center',
        height: 54, background: bg, borderRadius: 14,
        border: `1.5px solid ${border}`,
        padding: '0 16px', gap: 10,
        transition: 'border-color 0.15s',
      }}>
        {icon && <div style={{color: dark ? 'rgba(255,255,255,0.5)' : promyTokens.textMuted, display:'flex'}}>{icon}</div>}
        <input
          type={type}
          value={value || ''}
          onChange={(e) => onChange && onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, border: 0, outline: 0, background: 'transparent',
            fontFamily: 'inherit', fontSize: 15, fontWeight: 600,
            color: textColor,
          }}
        />
        {trailing}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Primary CTA — red pill button
// ─────────────────────────────────────────────────────────────
function PrimaryButton({ children, onClick, trailing }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', height: 56, border: 0, cursor: 'pointer',
      background: promyTokens.red, color: '#FFFFFF',
      fontFamily: 'inherit', fontWeight: 900, fontSize: 16,
      letterSpacing: -0.2,
      borderRadius: 999,
      boxShadow: '0 8px 20px rgba(255, 49, 49, 0.32)',
      display:'flex', alignItems:'center', justifyContent:'center', gap: 8,
      transition: 'transform 0.1s',
    }}
    onMouseDown={(e)=>e.currentTarget.style.transform='scale(0.98)'}
    onMouseUp={(e)=>e.currentTarget.style.transform='scale(1)'}
    onMouseLeave={(e)=>e.currentTarget.style.transform='scale(1)'}
    >
      {children}
      {trailing}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Social button
// ─────────────────────────────────────────────────────────────
function SocialButton({ provider, variant = 'light' }) {
  const dark = variant === 'dark';
  const bg = dark ? 'rgba(255,255,255,0.06)' : promyTokens.surface;
  const border = dark ? 'rgba(255,255,255,0.14)' : promyTokens.border;
  const color = dark ? '#FFFFFF' : promyTokens.ink;
  const icon = provider === 'google' ? (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.87 2.7-6.62z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.35-1.59-5.06-3.72H.96v2.33A9 9 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.94 10.7c-.18-.54-.28-1.11-.28-1.7 0-.59.1-1.16.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.03l2.98-2.33z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97L3.94 7.3C4.65 5.17 6.65 3.58 9 3.58z"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 18 18" fill={color}>
      <path d="M12.66 9.52c-.02-2.07 1.69-3.07 1.77-3.12-.97-1.41-2.47-1.6-3-1.62-1.27-.13-2.49.75-3.14.75-.65 0-1.65-.73-2.72-.71-1.4.02-2.7.81-3.42 2.06-1.46 2.53-.37 6.27 1.05 8.33.69 1 1.51 2.13 2.58 2.09 1.04-.04 1.43-.67 2.68-.67 1.25 0 1.6.67 2.7.65 1.11-.02 1.82-1.02 2.5-2.03.79-1.16 1.11-2.29 1.13-2.35-.02-.01-2.17-.83-2.19-3.3zM10.7 3.5c.57-.7.96-1.66.85-2.62-.82.03-1.82.55-2.41 1.23-.53.6-1 1.57-.87 2.51.92.07 1.86-.46 2.43-1.12z"/>
    </svg>
  );
  return (
    <button style={{
      flex: 1, height: 52, border: `1.5px solid ${border}`, cursor: 'pointer',
      background: bg, color,
      fontFamily: 'inherit', fontWeight: 800, fontSize: 14,
      borderRadius: 14, display:'flex', alignItems:'center', justifyContent:'center', gap: 10,
    }}>
      {icon}
      <span>{provider === 'google' ? 'Google' : 'Apple'}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Demo creds pill — expands on tap
// ─────────────────────────────────────────────────────────────
function DemoPill({ variant = 'light' }) {
  const [open, setOpen] = React.useState(false);
  const dark = variant === 'dark';
  return (
    <div style={{ display:'flex', justifyContent:'center' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          border: 0, cursor: 'pointer',
          background: dark ? 'rgba(255, 191, 0, 0.16)' : promyTokens.surfaceWarm,
          color: dark ? promyTokens.yellow : promyTokens.ink,
          borderRadius: 999,
          padding: open ? '10px 16px' : '8px 14px',
          display:'flex', alignItems:'center', gap: 8,
          fontFamily:'inherit', fontSize: 12, fontWeight: 800,
          border: `1px solid ${dark ? 'rgba(255,191,0,0.25)' : promyTokens.border}`,
          transition: 'all 0.25s ease',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        {open ? (
          <span style={{ display: 'flex', gap: 10, alignItems:'center' }}>
            <span style={{opacity:0.6}}>cliente@promy.com</span>
            <span style={{
              width: 1, height: 10,
              background: dark ? 'rgba(255,191,0,0.4)' : promyTokens.textMuted, opacity: 0.3,
            }}/>
            <span style={{opacity:0.6}}>demo1234</span>
          </span>
        ) : (
          <span>Ver credenciales demo</span>
        )}
      </button>
    </div>
  );
}

Object.assign(window, {
  promyTokens, PhoneFrame, AuthTabs, Field, PrimaryButton, SocialButton, DemoPill,
});
