// Variant 2 — ILUSTRADA
// Header con fondo AMARILLO plano (color de marca), logo + nombre PROMY centrado,
// form crema flotante pisando el header -24px.

function LoginIllustrated() {
  const [tab, setTab] = React.useState('login');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  return (
    <PhoneFrame bg={promyTokens.bg} statusDark={false}>
      {/* Flat yellow header */}
      <div style={{
        position:'absolute', top: 0, left: 0, right: 0,
        height: 348,
        background: promyTokens.yellow,
        overflow:'hidden',
      }}>
        {/* Content on header */}
        <div style={{
          position:'absolute', inset: 0,
          padding: '62px 24px 0',
          display:'flex', flexDirection:'column', alignItems:'center',
        }}>
          {/* Top row: Concordia pill centered-top */}
          <div style={{
            display:'flex', alignItems:'center', gap: 6,
            background: 'rgba(17,17,17,0.08)',
            border: '1px solid rgba(17,17,17,0.14)',
            padding: '6px 12px', borderRadius: 999,
            fontSize: 10, fontWeight: 800, letterSpacing: 0.3,
            color: promyTokens.headerDark,
            marginBottom: 20,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={promyTokens.red} strokeWidth="2.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            CONCORDIA, ENTRE RÍOS
          </div>

          {/* Centered mascot + PROMY name below */}
          <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap: 10, marginTop: 6}}>
            <PromyMascot size={160} rotate={0}/>
            <div style={{
              color: promyTokens.headerDark,
              fontWeight: 900, fontSize: 44, letterSpacing: -2,
              lineHeight: 1,
            }}>PROMY</div>
            <div style={{
              color: 'rgba(17,17,17,0.7)',
              fontWeight: 700, fontSize: 11, letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}>Descuentos reales · cerca tuyo</div>
          </div>
        </div>
      </div>

      {/* Floating form card — pisa el header -24 */}
      <div style={{
        position:'absolute', top: 324, left: 16, right: 16, bottom: 12,
        background: promyTokens.surface,
        border: `1px solid ${promyTokens.border}`,
        borderRadius: 24,
        boxShadow: promyTokens.shadowStrong,
        padding: '20px 20px 16px',
        display:'flex', flexDirection:'column',
      }}>
        <div style={{ marginBottom: 14 }}>
          <AuthTabs tab={tab} setTab={setTab} variant="light"/>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap: 10, marginBottom: 10 }}>
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="tu@email.com"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="m22 7-10 5L2 7"/>
              </svg>
            }
          />
          <Field
            label="Contraseña"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            }
          />
          <div style={{textAlign:'right', marginTop: -2}}>
            <a href="#" style={{
              fontSize: 11, fontWeight: 700, color: promyTokens.textMuted, textDecoration:'none',
            }}>¿Olvidaste tu contraseña?</a>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <PrimaryButton>
            {tab === 'login' ? 'Iniciá sesión' : 'Crear cuenta'}
          </PrimaryButton>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 10 }}>
          <div style={{flex:1, height:1, background: promyTokens.border}}/>
          <span style={{fontSize: 10, fontWeight: 800, color: promyTokens.textMuted, letterSpacing: 0.4}}>O CONTINUÁ CON</span>
          <div style={{flex:1, height:1, background: promyTokens.border}}/>
        </div>

        <div style={{ display:'flex', gap: 8, marginBottom: 12 }}>
          <SocialButton provider="google"/>
          <SocialButton provider="apple"/>
        </div>

        <div style={{flex:1}}/>
        <DemoPill/>
      </div>
    </PhoneFrame>
  );
}

Object.assign(window, { LoginIllustrated });
