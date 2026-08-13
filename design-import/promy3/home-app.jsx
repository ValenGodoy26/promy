// home-app.jsx — artboard mount for the Home screen

function HomeApp() {
  return (
    <DesignCanvas>
      <div style={{padding: '20px 60px 32px'}}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: 'rgba(60,50,40,0.55)',
          letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4,
        }}>PROMY · Home Screen</div>
        <div style={{
          fontSize: 38, fontWeight: 900, color: '#1A1614', letterSpacing: -1.2,
          lineHeight: 1.05,
        }}>Home PROMY</div>
        <div style={{
          fontSize: 15, fontWeight: 500, color: 'rgba(60,50,40,0.7)',
          maxWidth: 640, marginTop: 8, lineHeight: 1.5,
        }}>
          Mobile 375×812 · Header grafito con glows · hero promo rojo · ofertas HOT · rubros · cerca tuyo · CTA comercios · tab bar con FAB central PROMY.
        </div>
      </div>

      <DCSection
        title="Home — Default state"
        subtitle="Scroll natural. Header sticky-style, hero protagonista, secciones con ritmo visual cálido."
      >
        <DCArtboard label="375 × 812 · Home default" width={375} height={812} style={{borderRadius: 44, boxShadow:'0 30px 60px rgba(0,0,0,0.18), 0 8px 20px rgba(0,0,0,0.08)'}}>
          <HomeScreen/>
        </DCArtboard>

        <DCPostIt top={40} left={430} rotate={-2} width={230}>
          <b>Header grafito</b> con glow rojo y amarillo — tu ubicación en Concordia, greeting y buscador con P-bolt al costado.
        </DCPostIt>
        <DCPostIt top={300} left={430} rotate={2} width={230}>
          Hero rojo con <b>sello PROMY</b> girado 12°, badge amarillo, barrita de metadata al pie.
        </DCPostIt>
        <DCPostIt top={560} left={430} rotate={-1.5} width={230}>
          Rubros como <b>chips</b> con círculo de color de acento, sobre fondo cálido. Sin look infantil.
        </DCPostIt>
        <DCPostIt top={760} left={430} rotate={2.5} width={230}>
          CTA amarillo para <b>comercios</b> con la P-glyph roja como recurso gráfico. Botón rojo con shadow duro.
        </DCPostIt>
        <DCPostIt top={960} left={430} rotate={-2} width={230}>
          Tab bar con <b>FAB central</b> (P-glyph) · activo con halo rojo y label roja.
        </DCPostIt>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<HomeApp/>);
