// profile-app.jsx — artboard mount for the Profile screen

function ProfileApp() {
  return (
    <DesignCanvas>
      <div style={{padding: '20px 60px 32px'}}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: 'rgba(60,50,40,0.55)',
          letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4,
        }}>PROMY · Profile Screen</div>
        <div style={{
          fontSize: 38, fontWeight: 900, color: '#1A1614', letterSpacing: -1.2,
          lineHeight: 1.05,
        }}>Perfil PROMY</div>
        <div style={{
          fontSize: 15, fontWeight: 500, color: 'rgba(60,50,40,0.7)',
          maxWidth: 640, marginTop: 8, lineHeight: 1.5,
        }}>
          Mobile 375×812 · header grafito con avatar P-glyph y CTAs, card protagonista de ahorro mensual, mini stats, accesos rápidos grandes, actividad reciente con canjes, settings limpios y cerrar sesión en rojo acento.
        </div>
      </div>

      <DCSection
        title="Perfil — Default state"
        subtitle="Identidad PROMY: contraste cálido, bordes duros, glows, P-glyph como marca personal. No es un settings genérico."
      >
        <DCArtboard label="375 × 812 · Perfil default" width={375} height={812} style={{borderRadius: 44, boxShadow:'0 30px 60px rgba(0,0,0,0.18), 0 8px 20px rgba(0,0,0,0.08)'}}>
          <ProfileScreen/>
        </DCArtboard>

        <DCPostIt top={40} left={430} rotate={-2} width={240}>
          <b>Header grafito</b> con glows amarillo/rojo, P-glyph como avatar con ring punteado y check verde verificado. CTAs <i>Editar perfil</i> + <i>Mi QR</i>.
        </DCPostIt>
        <DCPostIt top={260} left={430} rotate={1.5} width={240}>
          <b>Card protagonista: ahorro del mes.</b> Número grande, barra de progreso hacia meta, tendencia vs. mes anterior, footer dashed con total acumulado.
        </DCPostIt>
        <DCPostIt top={500} left={430} rotate={-1.5} width={240}>
          <b>3 mini stats</b> — canjes, favoritos, promos. Iconos tintados, valores grandes, metadata muted.
        </DCPostIt>
        <DCPostIt top={700} left={430} rotate={2} width={240}>
          <b>Accesos rápidos</b> como cards grandes con sombra dura, mezcla de fondos amarillo/crema/blanco. Ribbon rojo para novedades.
        </DCPostIt>
        <DCPostIt top={920} left={430} rotate={-2} width={240}>
          <b>Actividad reciente</b> — lista de canjes con foto placeholder, badge de tienda, check verde de éxito, ahorro en verde. No se siente una tabla.
        </DCPostIt>
        <DCPostIt top={1140} left={430} rotate={1.5} width={240}>
          <b>Settings agrupados</b> + cerrar sesión con rojo acento, sin exagerar. Footer con versión y <i>Hecho en Concordia</i>.
        </DCPostIt>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<ProfileApp/>);
