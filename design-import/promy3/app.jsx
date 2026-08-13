// app.jsx — Single artboard: Illustrated variant only

function App() {
  return (
    <DesignCanvas>
      <div style={{padding: '20px 60px 40px'}}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: 'rgba(60,50,40,0.55)',
          letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4,
        }}>PROMY · Login Screen</div>
        <div style={{
          fontSize: 38, fontWeight: 900, color: '#1A1614', letterSpacing: -1.2,
          lineHeight: 1.05,
        }}>Login PROMY</div>
        <div style={{
          fontSize: 15, fontWeight: 500, color: 'rgba(60,50,40,0.7)',
          maxWidth: 600, marginTop: 8, lineHeight: 1.5,
        }}>
          Mobile 375×812 · Header amarillo plano con mascota + wordmark PROMY · form crema flotante.
        </div>
      </div>

      <DCSection
        title="Login — Ilustrada"
        subtitle="Fondo amarillo plano · mascota centrada con PROMY debajo · form crema pisa el header"
      >
        <DCArtboard label="375 × 812" width={375} height={812} style={{borderRadius: 44, boxShadow:'0 30px 60px rgba(0,0,0,0.18), 0 8px 20px rgba(0,0,0,0.08)'}}>
          <LoginIllustrated/>
        </DCArtboard>
        <DCPostIt top={20} left={420} rotate={-2} width={220}>
          Header <b>amarillo plano</b> (#FFBF00).
          Mascota 160px centrada, wordmark PROMY 44px debajo.
        </DCPostIt>
        <DCPostIt top={380} left={420} rotate={2.5} width={220}>
          Form <b>flotando -24px</b> sobre el header. Toggle Iniciar/Registrarse, inputs, CTA rojo, social, demo pill.
        </DCPostIt>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
