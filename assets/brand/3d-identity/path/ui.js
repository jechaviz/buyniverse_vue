const ui = document.getElementById('ui');

ui.innerHTML = `
  <nav class="navbar">
    <div class="nav-logo"><span class="dot"></span> Buyniverse</div>
    <div class="nav-links">
      <a href="#ecosystem">Ecosistema</a>
      <a href="#features">Plataforma</a>
      <a href="#metrics">Resultados</a>
      <a href="#brand">Marca</a>
    </div>
    <button class="nav-cta">Solicitar Demo</button>
  </nav>

  <section class="section hero">
    <div class="eyebrow"><span class="pulse"></span> Escrow inteligente en vivo · Ciclo de 3 días</div>
    <h1>El <span>universo</span> de las compras estratégicas y el talento global.</h1>
    <p>Buyniverse conecta compradores B2B y proveedores de talento en un ecosistema sin fronteras: transparente, seguro y con contratos inteligentes de principio a fin.</p>
    <div class="hero-actions">
      <button class="btn-primary">Comenzar ahora</button>
      <button class="btn-secondary">Ver cómo funciona</button>
    </div>
    <div class="hero-stats">
      <div>
        <div class="stat-value mint">30%</div>
        <div class="stat-label">Ahorro promedio (BAFO)</div>
      </div>
      <div>
        <div class="stat-value">3 días</div>
        <div class="stat-label">Tiempo de ciclo</div>
      </div>
      <div>
        <div class="stat-value amber">0%</div>
        <div class="stat-label">Comisiones ocultas</div>
      </div>
    </div>
    <div class="scroll-cue"><div class="line"></div> Desplázate para explorar</div>
  </section>

  <section class="section" id="ecosystem">
    <div class="section-tag">El símbolo</div>
    <h2>Un doble lazo. Dos fuerzas. Un mismo universo.</h2>
    <p class="lead">El monograma B-Infinito representa la relación simbiótica entre comprador y proveedor: geometría de precisión, fluidez transaccional y custodia en fideicomiso.</p>
    <div class="dual-grid">
      <div class="dual-card buyer">
        <span class="dual-tag">Comprador</span>
        <h3>Adquisiciones B2B sin fricción</h3>
        <p>RFQs estructurados, subastas BAFO en vivo y visibilidad total del ahorro generado en cada ciclo de compra.</p>
        <ul class="dual-list">
          <li>Subastas inversas en tiempo real</li>
          <li>Contratos inteligentes con escrow</li>
          <li>Tableros de ahorro y cumplimiento</li>
        </ul>
      </div>
      <div class="dual-card seller">
        <span class="dual-tag">Proveedor / Talento</span>
        <h3>Visibilidad para los mejores</h3>
        <p>Insignias Hero y Top Rated, liberación de fondos garantizada y acceso directo a demanda global verificada.</p>
        <ul class="dual-list">
          <li>Fideicomiso liberado al instante</li>
          <li>Insignias de talento verificado</li>
          <li>Alertas de hito y temporizadores</li>
        </ul>
      </div>
    </div>
  </section>

  <section class="section" id="features">
    <div class="section-tag">La plataforma</div>
    <h2>Diseñada para directores de compras y los mejores freelancers del mundo.</h2>
    <p class="lead">Cada interacción está construida sobre precisión geométrica, datos financieros claros y una experiencia sin la burocracia del software legado.</p>
    <div class="cards-grid">
      <div class="card">
        <div class="card-icon" style="background:rgba(229,72,77,0.12); color:#FF4D6D;">◆</div>
        <h3>Subastas BAFO en vivo</h3>
        <p>Mejores ofertas finales con temporizadores de hito y estados de ahorro visibles en tiempo real.</p>
      </div>
      <div class="card">
        <div class="card-icon" style="background:rgba(16,185,129,0.12); color:#10B981;">✓</div>
        <h3>Fideicomiso (Escrow)</h3>
        <p>Custodia segura de fondos con liberación automática al cumplimiento verificado de hitos.</p>
      </div>
      <div class="card">
        <div class="card-icon" style="background:rgba(245,158,11,0.12); color:#F59E0B;">★</div>
        <h3>Talento Hero &amp; Top Rated</h3>
        <p>Insignias de verificación que destacan a las agencias y freelancers de mayor desempeño.</p>
      </div>
    </div>
  </section>

  <section class="section" id="metrics">
    <div class="section-tag">Resultados cuantitativos</div>
    <h2>Valor medible, no promesas.</h2>
    <div class="metrics-band">
      <div class="metric">
        <div class="num coral">30%</div>
        <div class="desc">Ahorro promedio por ciclo de subasta BAFO</div>
      </div>
      <div class="metric">
        <div class="num">3 días</div>
        <div class="desc">Tiempo de ciclo de contratación y compra</div>
      </div>
      <div class="metric">
        <div class="num amber">0%</div>
        <div class="desc">Comisiones ocultas en cada transacción</div>
      </div>
      <div class="metric">
        <div class="num mint">100%</div>
        <div class="desc">Fondos resguardados en fideicomiso</div>
      </div>
    </div>
  </section>

  <section class="section" id="brand">
    <div class="section-tag">Identidad corporativa</div>
    <h2>Una paleta institucional, vanguardista y confiable.</h2>
    <p class="lead">Cuatro tonos que codifican el significado de cada estado del ecosistema: marca, seguridad, ahorro y prioridad.</p>
    <div class="palette-grid">
      <div class="swatch" style="background:#E5484D;">
        <span class="name" style="color:#1A1F45;">Crimson Coral</span>
        <span class="hex" style="color:#1A1F45;">#E5484D</span>
      </div>
      <div class="swatch" style="background:#0F172A;">
        <span class="name" style="color:#F8FAFC;">Deep Indigo</span>
        <span class="hex" style="color:#94A3B8;">#0F172A</span>
      </div>
      <div class="swatch" style="background:#10B981;">
        <span class="name" style="color:#022C22;">Emerald Mint</span>
        <span class="hex" style="color:#022C22;">#10B981</span>
      </div>
      <div class="swatch" style="background:#F59E0B;">
        <span class="name" style="color:#451A03;">Amber Gold</span>
        <span class="hex" style="color:#451A03;">#F59E0B</span>
      </div>
      <div class="swatch" style="background:#64748B;">
        <span class="name" style="color:#F8FAFC;">Warm Slate</span>
        <span class="hex" style="color:#F1F5F9;">#64748B</span>
      </div>
    </div>
  </section>

  <section class="section cta-section">
    <div class="section-tag" style="align-self:center;">Únete al ecosistema</div>
    <h2>Tu universo de compras estratégicas empieza aquí.</h2>
    <p class="lead" style="margin-left:auto; margin-right:auto; text-align:center;">Regístrate como comprador o proveedor y descubre por qué Buyniverse redefine la contratación B2B.</p>
    <div class="hero-actions" style="justify-content:center; margin-left:auto; margin-right:auto;">
      <button class="btn-primary">Crear cuenta gratuita</button>
      <button class="btn-secondary">Hablar con ventas</button>
    </div>
  </section>

  <footer class="footer">
    <div class="footer-left"><span class="dot" style="width:8px;height:8px;border-radius:50%;background:#E5484D;display:inline-block;"></span> Buyniverse</div>
    <div class="footer-right">© 2024 Buyniverse. Manual de Identidad Corporativa.</div>
  </footer>
`;