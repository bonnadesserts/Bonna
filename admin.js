// =======================================================
// BonnaGo — Admin
// =======================================================
(() => {
  const { DataAPI, formatCOP, Store, STORAGE_KEYS } = window.DulceData;

  const $  = (s, c=document) => c.querySelector(s);
  const $$ = (s, c=document) => [...c.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  // ---------- Image upload helper (redimensiona y devuelve base64) ----------
  function readImageAsResizedDataURL(file, maxDim = 800, quality = 0.82) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('No file'));
      if (!file.type.startsWith('image/')) return reject(new Error('No es una imagen'));
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) { height = Math.round(height * (maxDim / width)); width = maxDim; }
            else { width = Math.round(width * (maxDim / height)); height = maxDim; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('Imagen no válida'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('No se pudo leer'));
      reader.readAsDataURL(file);
    });
  }

  // Componente reutilizable: input de imagen con preview y borrar.
  // Devuelve un string HTML; el setup se hace con bindImageUploader.
  function imageUploaderHTML(currentUrl, inputId) {
    return `
      <div class="img-uploader" id="${inputId}-wrap">
        <div class="img-uploader__preview ${currentUrl ? 'has-img' : ''}">
          ${currentUrl ? `<img src="${esc(currentUrl)}" alt="">` : `<span class="img-uploader__placeholder">Sin imagen</span>`}
        </div>
        <div class="img-uploader__actions">
          <label class="img-uploader__btn">
            <input type="file" accept="image/*" id="${inputId}" hidden>
            ${currentUrl ? 'Cambiar imagen' : 'Subir imagen'}
          </label>
          ${currentUrl ? `<button type="button" class="img-uploader__remove" data-clear="${inputId}">Quitar</button>` : ''}
        </div>
        <p class="img-uploader__hint">JPG / PNG. Se redimensiona automáticamente.</p>
      </div>
    `;
  }

  // Bind para un img uploader. onUpdate(dataUrlOrNull) se llama cuando cambia.
  function bindImageUploader(inputId, onUpdate) {
    const input = $('#' + inputId);
    const wrap = $('#' + inputId + '-wrap');
    if (!input || !wrap) return;
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const dataUrl = await readImageAsResizedDataURL(file);
        onUpdate(dataUrl);
        // re-render preview
        const preview = wrap.querySelector('.img-uploader__preview');
        preview.classList.add('has-img');
        preview.innerHTML = `<img src="${dataUrl}" alt="">`;
        const label = wrap.querySelector('.img-uploader__btn');
        label.firstChild.nodeValue = '';
        label.appendChild(document.createTextNode('Cambiar imagen'));
        // añadir botón quitar si no existía
        if (!wrap.querySelector('[data-clear]')) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'img-uploader__remove';
          btn.dataset.clear = inputId;
          btn.textContent = 'Quitar';
          btn.addEventListener('click', () => clearImage(inputId, onUpdate));
          wrap.querySelector('.img-uploader__actions').appendChild(btn);
        }
      } catch (err) {
        toast(err.message || 'No se pudo procesar la imagen');
      }
    });
    const clearBtn = wrap.querySelector('[data-clear]');
    if (clearBtn) clearBtn.addEventListener('click', () => clearImage(inputId, onUpdate));
  }

  function clearImage(inputId, onUpdate) {
    const wrap = $('#' + inputId + '-wrap');
    onUpdate(null);
    const preview = wrap.querySelector('.img-uploader__preview');
    preview.classList.remove('has-img');
    preview.innerHTML = `<span class="img-uploader__placeholder">Sin imagen</span>`;
    const label = wrap.querySelector('.img-uploader__btn');
    label.firstChild.nodeValue = '';
    label.appendChild(document.createTextNode('Subir imagen'));
    const rm = wrap.querySelector('[data-clear]');
    if (rm) rm.remove();
    const input = $('#' + inputId);
    if (input) input.value = '';
  }

  // Format date short
  const formatDateShort = (iso) => {
    try { return new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
    catch { return iso; }
  };

  // ---------- Auth ----------
  const getSession = () => Store.get(STORAGE_KEYS.adminSession, null);
  const setSession = (s) => Store.set(STORAGE_KEYS.adminSession, s);
  const logout = () => { Store.remove(STORAGE_KEYS.adminSession); location.reload(); };

  function handleLogin() {
    const form = $('#loginForm');
    const err = $('#loginErr');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = $('#l-email').value.trim().toLowerCase();
      const password = $('#l-pass').value;
      const users = DataAPI.getAdminUsers();
      const user = users.find(u => u.email.toLowerCase() === email && u.password === password);
      if (!user) {
        err.textContent = 'Credenciales incorrectas. Verifica e intenta de nuevo.';
        err.classList.add('is-visible');
        return;
      }
      setSession({ email: user.email, at: Date.now() });
      location.reload();
    });
  }

  // ---------- Render shell ----------
  const sections = [
    { id: 'dashboard',  label: 'Dashboard',   icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
    { id: 'orders',     label: 'Pedidos',     icon: 'M5 4h14l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 4zm3 0V2h8v2M9 10v6M15 10v6' },
    { id: 'products',   label: 'Productos',   icon: 'M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4v13a2 2 0 002 2h12a2 2 0 002-2V7zM10 5h4v2h-4V5z' },
    { id: 'toppings',   label: 'Toppings',    icon: 'M12 2C8 2 4 6 4 10c0 4 4 6 8 6s8-2 8-6c0-4-4-8-8-8zM6 18h12l-1 4H7l-1-4z' },
    { id: 'categories', label: 'Categorías',  icon: 'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z' },
    { id: 'promotions', label: 'Promociones', icon: 'M5 12l5-9h4l5 9-2 7H7l-2-7zM9 14h6M10 9h4' },
    { id: 'banner',     label: 'Publicidad',  icon: 'M3 5h18v14H3V5zm2 2v10h14V7H5zm2 2h6v2H7V9zm0 4h10v2H7v-2z' },
    { id: 'payment',    label: 'Pagos',       icon: 'M21 4H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V6a2 2 0 00-2-2zM3 6h18v3H3V6zm0 12v-6h18v6H3z' },
    { id: 'admins',     label: 'Admins',      icon: 'M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5c0-3-4-5.5-9-5.5z' },
  ];

  let currentSection = 'dashboard';

  function renderSidebar() {
    const session = getSession();
    const unreadCount = DataAPI.getUnreadOrderIds().length;
    const sidebarHTML = `
      <aside class="sidebar">
        <div class="sidebar__brand">
          <div class="brand__mark">B</div>
          <strong>BonnaGo<span style="color:rgba(255,255,255,0.55); font-weight:400;"> · admin</span></strong>
        </div>
        <nav class="sidebar__nav" id="sidebarNav">
          ${sections.map(s => {
            const showBadge = s.id === 'orders' && unreadCount > 0;
            return `
              <div class="sidebar__item ${s.id === currentSection ? 'is-active' : ''}" data-section="${s.id}">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="${s.icon}"/></svg>
                <span>${s.label}</span>
                ${showBadge ? `<span class="sidebar__badge">${unreadCount}</span>` : ''}
              </div>
            `;
          }).join('')}
        </nav>
        <div class="sidebar__foot">
          <div class="sidebar__user">${esc(session.email)}</div>
          <button class="sidebar__logout" id="logoutBtn">Cerrar sesión</button>
        </div>
      </aside>
    `;
    return sidebarHTML;
  }

  function refreshSidebar() {
    const existing = $('.sidebar');
    if (!existing) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderSidebar();
    existing.replaceWith(wrapper.firstElementChild);
    bindSidebar();
  }

  function bindSidebar() {
    $$('[data-section]').forEach(item => {
      item.addEventListener('click', () => {
        currentSection = item.dataset.section;
        $$('.sidebar__item').forEach(i => i.classList.toggle('is-active', i === item));
        renderSection();
      });
    });
    const lo = $('#logoutBtn');
    if (lo) lo.addEventListener('click', logout);
  }

  function renderShell() {
    document.body.innerHTML = `
      <div class="admin-shell">
        ${renderSidebar()}
        <main class="admin-main" id="mainArea"></main>
      </div>
      <div class="form-modal" id="formModal"><div class="form-modal__panel" id="formPanel"></div></div>
      <div class="toast" id="toast"><span class="toast__icon">✓</span><span class="toast__msg"></span></div>
    `;
    bindSidebar();
    renderSection();
    startOrdersPolling();
  }

  // ---------- Polling de pedidos nuevos ----------
  let lastOrderCount = 0;
  let pollInterval = null;
  function startOrdersPolling() {
    lastOrderCount = DataAPI.getOrders().length;
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(() => {
      const orders = DataAPI.getOrders();
      if (orders.length > lastOrderCount) {
        const newOnes = orders.length - lastOrderCount;
        lastOrderCount = orders.length;
        toast(`🔔 ${newOnes === 1 ? 'Nuevo pedido recibido' : `${newOnes} pedidos nuevos`}`);
        // sonar bell o vibrar
        try { navigator.vibrate?.(200); } catch {}
        refreshSidebar();
        if (currentSection === 'dashboard' || currentSection === 'orders') renderSection();
      }
    }, 3000); // cada 3 segundos
  }

  function renderSection() {
    switch (currentSection) {
      case 'dashboard':  return renderDashboard();
      case 'orders':     return renderOrders();
      case 'products':   return renderProducts();
      case 'toppings':   return renderToppings();
      case 'categories': return renderCategories();
      case 'promotions': return renderPromotionsAdmin();
      case 'banner':     return renderBannerEditor();
      case 'payment':    return renderPayment();
      case 'admins':     return renderAdmins();
    }
  }

  // ---------- Dashboard ----------
  let dashFilter = { orders: 'week', products: 'month' };

  function renderDashboard() {
    const products = DataAPI.getProducts();
    const cats = DataAPI.getCategories();
    const orders = DataAPI.getOrders();
    const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);

    $('#mainArea').innerHTML = `
      <div class="admin-head">
        <div>
          <h1>Hola 👋</h1>
          <p>Resumen de tu negocio.</p>
        </div>
      </div>

      <div class="stats">
        <div class="stat">
          <div class="stat__label">Pedidos totales</div>
          <div class="stat__value">${orders.length}</div>
          <div class="stat__sub">históricos</div>
        </div>
        <div class="stat">
          <div class="stat__label">Ingresos totales</div>
          <div class="stat__value" style="font-size:24px;">${formatCOP(totalRevenue)}</div>
          <div class="stat__sub">suma de pedidos</div>
        </div>
        <div class="stat">
          <div class="stat__label">Productos</div>
          <div class="stat__value">${products.length}</div>
          <div class="stat__sub">en catálogo</div>
        </div>
        <div class="stat">
          <div class="stat__label">Categorías</div>
          <div class="stat__value">${cats.length}</div>
        </div>
      </div>

      <div class="charts-grid">
        <div class="panel">
          <div class="panel__head">
            <h3>📊 Pedidos en el tiempo</h3>
            <div class="filter-chips">
              <button data-filter-orders="day"   class="${dashFilter.orders === 'day' ? 'is-active' : ''}">Día</button>
              <button data-filter-orders="week"  class="${dashFilter.orders === 'week' ? 'is-active' : ''}">Semana</button>
              <button data-filter-orders="month" class="${dashFilter.orders === 'month' ? 'is-active' : ''}">Mes</button>
              <button data-filter-orders="year"  class="${dashFilter.orders === 'year' ? 'is-active' : ''}">Año</button>
            </div>
          </div>
          <div id="chartOrders" class="chart-wrap">${buildBarChart(orders, dashFilter.orders)}</div>
        </div>

        <div class="panel">
          <div class="panel__head">
            <h3>🥧 Productos más vendidos</h3>
            <div class="filter-chips">
              <button data-filter-products="day"   class="${dashFilter.products === 'day' ? 'is-active' : ''}">Día</button>
              <button data-filter-products="week"  class="${dashFilter.products === 'week' ? 'is-active' : ''}">Semana</button>
              <button data-filter-products="month" class="${dashFilter.products === 'month' ? 'is-active' : ''}">Mes</button>
              <button data-filter-products="year"  class="${dashFilter.products === 'year' ? 'is-active' : ''}">Año</button>
            </div>
          </div>
          <div id="chartProducts" class="chart-wrap">${buildPieChart(orders, dashFilter.products)}</div>
        </div>
      </div>

      <div class="panel">
        <h3 style="font-family:var(--font-display); font-size:18px; margin-bottom:14px;">⚡️ Accesos rápidos</h3>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn btn--dark btn--sm" data-quick="new-product">+ Nuevo producto</button>
          <button class="btn btn--ghost btn--sm" data-quick="new-promo">+ Nueva promoción</button>
          <a class="btn btn--ghost btn--sm" href="../index.html" target="_blank">Ver tienda</a>
        </div>
      </div>
    `;

    $$('[data-filter-orders]').forEach(b => b.addEventListener('click', () => {
      dashFilter.orders = b.dataset.filterOrders;
      renderDashboard();
    }));
    $$('[data-filter-products]').forEach(b => b.addEventListener('click', () => {
      dashFilter.products = b.dataset.filterProducts;
      renderDashboard();
    }));
    $$('[data-quick]').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.quick;
      if (a === 'new-product')  { currentSection = 'products';  refreshSidebar(); renderSection(); setTimeout(() => $('#newProduct')?.click(), 100); }
      if (a === 'new-promo')    { currentSection = 'promotions'; refreshSidebar(); renderSection(); setTimeout(() => $('#newPromo')?.click(), 100); }
    }));
  }

  // ---------- Charts (SVG puro, sin librería) ----------
  function periodKey(date, period) {
    const d = new Date(date);
    if (period === 'day')   return d.toISOString().slice(0, 10);
    if (period === 'week')  { const f = new Date(d); f.setDate(d.getDate() - d.getDay()); return f.toISOString().slice(0, 10); }
    if (period === 'month') return d.toISOString().slice(0, 7);
    if (period === 'year')  return d.toISOString().slice(0, 4);
    return '';
  }
  function periodLabel(key, period) {
    if (period === 'day')   { const d = new Date(key); return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }); }
    if (period === 'week')  { const d = new Date(key); return 'Sem ' + d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }); }
    if (period === 'month') { const [y, m] = key.split('-'); return new Date(y, m-1, 1).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }); }
    if (period === 'year')  return key;
    return key;
  }

  function buildBarChart(orders, period) {
    const buckets = {};
    orders.forEach(o => {
      const k = periodKey(o.createdAt, period);
      if (!buckets[k]) buckets[k] = 0;
      buckets[k]++;
    });
    const keys = Object.keys(buckets).sort().slice(-12); // máximo 12 columnas
    if (keys.length === 0) {
      return `<div class="chart-empty">📊 Sin datos suficientes. Cuando entren pedidos verás aquí su evolución.</div>`;
    }
    const max = Math.max(...keys.map(k => buckets[k]));
    const W = 600, H = 220, padL = 36, padR = 16, padT = 16, padB = 36;
    const barW = (W - padL - padR) / keys.length;
    const chartH = H - padT - padB;

    const bars = keys.map((k, i) => {
      const v = buckets[k];
      const h = max > 0 ? (v / max) * chartH : 0;
      const x = padL + i * barW + 4;
      const y = padT + chartH - h;
      const w = barW - 8;
      return `
        <g>
          <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#0B2465"/>
          <text x="${x + w/2}" y="${y - 6}" text-anchor="middle" font-size="11" fill="#0B2465" font-weight="700">${v}</text>
          <text x="${x + w/2}" y="${H - 12}" text-anchor="middle" font-size="10" fill="#6E7796">${periodLabel(k, period)}</text>
        </g>
      `;
    }).join('');
    // grid lines
    const gridLines = [0, 0.25, 0.5, 0.75, 1].map(p => {
      const y = padT + chartH * (1 - p);
      const v = Math.round(max * p);
      return `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#E5E7EB" stroke-dasharray="2,3"/><text x="${padL - 6}" y="${y + 3}" text-anchor="end" font-size="10" fill="#9CA1B8">${v}</text>`;
    }).join('');

    return `<svg viewBox="0 0 ${W} ${H}" class="chart-svg">${gridLines}${bars}</svg>`;
  }

  function buildPieChart(orders, period) {
    const now = new Date();
    let cutoff;
    if (period === 'day')   { cutoff = new Date(now); cutoff.setHours(0,0,0,0); }
    else if (period === 'week')  { cutoff = new Date(now); cutoff.setDate(now.getDate() - 7); }
    else if (period === 'month') { cutoff = new Date(now); cutoff.setMonth(now.getMonth() - 1); }
    else { cutoff = new Date(now); cutoff.setFullYear(now.getFullYear() - 1); }

    const productCount = {};
    orders
      .filter(o => new Date(o.createdAt) >= cutoff)
      .forEach(o => {
        (o.items || []).forEach(it => {
          if (!productCount[it.productName]) productCount[it.productName] = 0;
          productCount[it.productName] += it.qty;
        });
      });

    const entries = Object.entries(productCount).sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (entries.length === 0) {
      return `<div class="chart-empty">🥧 Sin pedidos en este período. Los productos más vendidos aparecerán aquí.</div>`;
    }
    const total = entries.reduce((s, [, v]) => s + v, 0);
    const colors = ['#0B2465', '#C7C7EA', '#7B8AC9', '#3B4F8E', '#A6B3D9', '#5C6FB0'];
    const cx = 110, cy = 110, r = 95;
    let acc = 0;

    const slices = entries.map(([name, v], i) => {
      const start = (acc / total) * 2 * Math.PI - Math.PI / 2;
      acc += v;
      const end = (acc / total) * 2 * Math.PI - Math.PI / 2;
      const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end),   y2 = cy + r * Math.sin(end);
      const large = (end - start) > Math.PI ? 1 : 0;
      const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
      return `<path d="${path}" fill="${colors[i % colors.length]}" stroke="#fff" stroke-width="2"/>`;
    }).join('');

    const legend = entries.map(([name, v], i) => `
      <div class="pie-legend__item">
        <span class="pie-legend__dot" style="background:${colors[i % colors.length]}"></span>
        <span class="pie-legend__name">${esc(name)}</span>
        <span class="pie-legend__val">${v} (${Math.round(v/total*100)}%)</span>
      </div>
    `).join('');

    return `
      <div class="pie-chart">
        <svg viewBox="0 0 220 220" class="pie-svg">${slices}</svg>
        <div class="pie-legend">${legend}</div>
      </div>
    `;
  }

  // ---------- Productos ----------
  function renderProducts() {
    const products = DataAPI.getProducts();
    const cats = DataAPI.getCategories();
    const catName = (id) => cats.find(c => c.id === id)?.name || '—';
    const view = Store.get('bonnago_admin_products_view', 'list');

    const cardsHTML = products.map(p => {
      const numTops = DataAPI.resolveProductToppings(p).length;
      const thumb = p.imageUrl
        ? `<div class="prod-card__media" style="background-image:url('${esc(p.imageUrl)}');"></div>`
        : `<div class="prod-card__media prod-card__media--emoji">${esc(p.emoji || '🍽️')}</div>`;
      return `
        <div class="prod-card">
          ${thumb}
          <div class="prod-card__body">
            <div class="prod-card__cat">${esc(catName(p.categoryId))}</div>
            <div class="prod-card__name">${esc(p.name)}</div>
            <div class="prod-card__price">
              ${p.discount > 0 ? `<s>${formatCOP(p.price)}</s>` : ''}
              <strong>${formatCOP(productPrice(p))}</strong>
            </div>
            <div class="prod-card__meta">
              ${p.allowsToppings ? `<span class="badge badge--green">${numTops} toppings</span>` : ''}
              ${Array.isArray(p.sizes) && p.sizes.length ? `<span class="badge badge--orange">${p.sizes.length} tamaños</span>` : ''}
            </div>
            <div class="prod-card__actions">
              <button data-edit="${esc(p.id)}">Editar</button>
              <button data-clone="${esc(p.id)}">Clonar</button>
              <button class="btn-danger" data-del="${esc(p.id)}">Borrar</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    $('#mainArea').innerHTML = `
      <div class="admin-head">
        <div>
          <h1>Productos</h1>
          <p>Crea, edita, clona y gestiona tu catálogo.</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <div class="view-toggle">
            <button class="${view === 'list' ? 'is-active' : ''}" data-view="list" aria-label="Vista lista">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
              Lista
            </button>
            <button class="${view === 'cards' ? 'is-active' : ''}" data-view="cards" aria-label="Vista cards">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              Cards
            </button>
          </div>
          <button class="btn btn--dark btn--sm" id="newProduct">+ Nuevo producto</button>
        </div>
      </div>

      ${view === 'cards' ? `<div class="prod-cards-grid">${cardsHTML}</div>` : `

      <div class="table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Desc.</th>
              <th>Toppings</th>
              <th style="text-align:right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => {
              const numTops = DataAPI.resolveProductToppings(p).length;
              const thumb = p.imageUrl
                ? `<div class="cell-emoji" style="background-image:url('${esc(p.imageUrl)}'); background-size:cover; background-position:center;"></div>`
                : `<div class="cell-emoji">${esc(p.emoji || '🍽️')}</div>`;
              return `
              <tr>
                <td>
                  <div class="cell-product">
                    ${thumb}
                    <div>
                      <div class="cell-name">${esc(p.name)}</div>
                      <div class="cell-desc">${esc(p.description.slice(0, 60))}${p.description.length > 60 ? '…' : ''}</div>
                    </div>
                  </div>
                </td>
                <td>${esc(catName(p.categoryId))}</td>
                <td>${formatCOP(p.price)}</td>
                <td>${p.discount > 0 ? `<span class="badge badge--orange">-${p.discount}%</span>` : '<span style="color:var(--ink-4);">—</span>'}</td>
                <td>
                  ${p.allowsToppings
                    ? `<span class="badge badge--green">${numTops} opcs.</span>`
                    : `<span class="badge badge--gray">No</span>`}
                </td>
                <td class="row-actions">
                  <button data-edit="${esc(p.id)}">Editar</button>
                  <button data-clone="${esc(p.id)}">Clonar</button>
                  <button class="btn-danger" data-del="${esc(p.id)}">Borrar</button>
                </td>
              </tr>
            `;}).join('')}
            ${products.length === 0 ? `<tr><td colspan="6" style="text-align:center; padding:40px; color:var(--ink-3);">No hay productos aún. Crea el primero.</td></tr>` : ''}
          </tbody>
        </table>
      </div>
      `}
    `;

    $('#newProduct').addEventListener('click', () => openProductForm());
    $$('[data-view]').forEach(b => b.addEventListener('click', () => {
      Store.set('bonnago_admin_products_view', b.dataset.view);
      renderProducts();
    }));
    $$('[data-edit]').forEach(b => b.addEventListener('click', () => openProductForm(b.dataset.edit)));
    $$('[data-clone]').forEach(b => b.addEventListener('click', () => cloneProduct(b.dataset.clone)));
    $$('[data-del]').forEach(b => b.addEventListener('click', () => deleteProduct(b.dataset.del)));
  }

  function cloneProduct(id) {
    const products = DataAPI.getProducts();
    const original = products.find(p => p.id === id);
    if (!original) return;
    const copy = JSON.parse(JSON.stringify(original));
    copy.id = 'p-' + Date.now();
    copy.name = original.name + ' (copia)';
    products.push(copy);
    DataAPI.setProducts(products);
    renderProducts();
    toast('Producto clonado');
  }

  // Estado temporal del form de producto
  let tmpProductState = { imageUrl: '', toppingIds: new Set(), sizes: [] };

  // Decide si la categoría seleccionada permite configurar tamaños.
  // Por defecto: tortas y jars sí; porciones no.
  function shouldShowSizes(catId, cats) {
    if (!catId) return false;
    const cat = (cats || []).find(c => c.id === catId);
    if (!cat) return false;
    if (typeof cat.allowsSizes === 'boolean') return cat.allowsSizes;
    // Heurística por id si la categoría no tiene la flag
    return /tortas|jars/i.test(catId) || /tortas|jars/i.test(cat.name || '');
  }

  function openProductForm(productId = null) {
    const products = DataAPI.getProducts();
    const cats = DataAPI.getCategories();
    const allToppings = DataAPI.getToppings();
    const editing = productId ? products.find(p => p.id === productId) : null;

    tmpProductState = {
      imageUrl: editing?.imageUrl || '',
      toppingIds: new Set(editing?.toppingIds || []),
      sizes: Array.isArray(editing?.sizes) ? JSON.parse(JSON.stringify(editing.sizes)) : [],
    };

    const TC = window.BonnaGoData.TOPPING_CATEGORIES;
    // Agrupar toppings por categoría
    const groups = {};
    TC.forEach(c => groups[c.id] = []);
    const uncategorized = [];
    allToppings.forEach(t => {
      if (t.category && groups[t.category]) groups[t.category].push(t);
      else uncategorized.push(t);
    });

    function renderToppingItem(t) {
      return `
        <div class="topping-pick ${tmpProductState.toppingIds.has(t.id) ? 'is-selected' : ''}" data-toggle-top="${esc(t.id)}">
          <span class="topping-pick__main">
            <span class="topping-pick__emoji">${esc(t.emoji || '✨')}</span>
            <span>
              <span class="topping-pick__name">${esc(t.name)}</span>
              <span class="topping-pick__meta">${t.grams ? t.grams + 'g · ' : ''}${t.price > 0 ? '+' + formatCOP(t.price) : 'incluido'}</span>
            </span>
          </span>
          <span class="topping-pick__check">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12l5 5L20 7"/>
            </svg>
          </span>
        </div>
      `;
    }

    let toppingsListHTML;
    if (allToppings.length === 0) {
      toppingsListHTML = `<p style="font-size:13px;color:var(--ink-3);text-align:center;padding:14px;">
           No hay toppings creados aún. Ve a la sección <strong>Toppings</strong> y crea algunos primero.
         </p>`;
    } else {
      toppingsListHTML = TC
        .filter(c => groups[c.id].length > 0)
        .map(c => `
          <div class="topping-group">
            <div class="topping-group__title">
              <span>${esc(c.emoji)}</span>
              <span>${esc(c.name)}</span>
              <span class="topping-group__count">${groups[c.id].length}</span>
            </div>
            <div class="topping-group__items">
              ${groups[c.id].map(renderToppingItem).join('')}
            </div>
          </div>
        `).join('');
      if (uncategorized.length > 0) {
        toppingsListHTML += `
          <div class="topping-group">
            <div class="topping-group__title">
              <span>📦</span>
              <span>Sin categoría</span>
              <span class="topping-group__count">${uncategorized.length}</span>
            </div>
            <div class="topping-group__items">
              ${uncategorized.map(renderToppingItem).join('')}
            </div>
          </div>
        `;
      }
    }

    $('#formPanel').innerHTML = `
      <h2 class="form-modal__title">${editing ? 'Editar producto' : 'Nuevo producto'}</h2>

      <div class="field">
        <label>Imagen del producto</label>
        ${imageUploaderHTML(tmpProductState.imageUrl, 'p-img')}
      </div>

      <div class="field">
        <label>Nombre</label>
        <input id="p-name" type="text" value="${esc(editing?.name || '')}" placeholder="Torta de zanahoria">
      </div>
      <div class="field">
        <label>Descripción (orientada a venta)</label>
        <textarea id="p-desc" rows="3" placeholder="Húmeda, especiada, con frosting de queso crema.">${esc(editing?.description || '')}</textarea>
      </div>
      <div class="form-row">
        <div class="field">
          <label>Precio (COP)</label>
          <input id="p-price" type="number" min="0" step="500" value="${editing?.price || ''}" placeholder="50000">
        </div>
        <div class="field">
          <label>Descuento (%)</label>
          <input id="p-discount" type="number" min="0" max="100" value="${editing?.discount || 0}">
        </div>
      </div>
      <div class="form-row">
        <div class="field">
          <label>Categoría</label>
          <select id="p-cat">
            ${cats.map(c => `<option value="${esc(c.id)}" ${editing?.categoryId === c.id ? 'selected' : ''}>${esc(c.emoji)} ${esc(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Emoji (fallback si no hay imagen)</label>
          <input id="p-emoji" type="text" value="${esc(editing?.emoji || '🍰')}" placeholder="🍰" maxlength="4">
        </div>
      </div>
      <div class="field">
        <label>Etiqueta opcional (ej. "Favorita", "10% OFF")</label>
        <input id="p-tag" type="text" value="${esc(editing?.tag || '')}" placeholder="Más vendido">
      </div>

      <div id="sizesWrap" class="sizes-section" style="display:${shouldShowSizes(editing?.categoryId, cats) ? 'block' : 'none'};">
        <div class="field">
          <label>Tamaños disponibles</label>
          <p style="font-size:12px;color:var(--ink-3);margin-bottom:8px;">
            Define las opciones de tamaño con su precio. El cliente elegirá uno al añadir al carrito.
          </p>
          <div id="sizesList" class="sizes-list"></div>
          <button type="button" class="btn btn--ghost btn--sm" id="addSizeBtn" style="margin-top:8px;">
            + Agregar tamaño
          </button>
          <p style="font-size:11px;color:var(--ink-4);margin-top:8px;">
            Si no agregas tamaños, se usará el "Precio (COP)" base del producto.
          </p>
        </div>
      </div>

      <button type="button" class="toggle-btn ${editing?.allowsToppings ? 'is-on' : ''}" id="p-toggle-btn" aria-pressed="${editing?.allowsToppings ? 'true' : 'false'}">
        <span class="toggle-btn__track"><span class="toggle-btn__thumb"></span></span>
        <span class="toggle-btn__label">Permite toppings</span>
      </button>

      <div id="toppingsWrap" style="display:${editing?.allowsToppings ? 'block' : 'none'}; margin-top:14px;">
        <div class="field">
          <label>Selecciona los toppings disponibles para este producto</label>
          <div class="topping-picker" id="toppingPicker">
            ${toppingsListHTML}
          </div>
        </div>
      </div>

      <div class="form-modal__foot">
        <button class="btn btn--ghost" id="cancelForm">Cancelar</button>
        <button class="btn btn--primary" id="saveForm">${editing ? 'Guardar cambios' : 'Crear producto'}</button>
      </div>
    `;

    // Estado del toggle (un solo handler limpio)
    let allows = !!editing?.allowsToppings;
    const toggleBtn = $('#p-toggle-btn');
    toggleBtn.addEventListener('click', () => {
      allows = !allows;
      toggleBtn.classList.toggle('is-on', allows);
      toggleBtn.setAttribute('aria-pressed', allows ? 'true' : 'false');
      $('#toppingsWrap').style.display = allows ? 'block' : 'none';
    });

    // ----- SIZES editor -----
    function renderSizesList() {
      const listEl = $('#sizesList');
      if (!listEl) return;
      if (tmpProductState.sizes.length === 0) {
        listEl.innerHTML = '<p style="font-size:13px;color:var(--ink-4);text-align:center;padding:12px;">Aún no hay tamaños. Agrega al menos uno.</p>';
        return;
      }
      listEl.innerHTML = tmpProductState.sizes.map((s, i) => `
        <div class="size-row" data-size-row="${i}">
          <input type="text" class="size-row__name" placeholder="Ej: Mediana (12 porciones)" value="${esc(s.name || '')}" data-size-field="name">
          <input type="number" class="size-row__price" placeholder="Precio" min="0" step="500" value="${s.price || 0}" data-size-field="price">
          <button type="button" class="size-row__remove" data-size-remove="${i}" aria-label="Quitar tamaño">✕</button>
        </div>
      `).join('');

      // Bind inputs
      listEl.querySelectorAll('[data-size-field]').forEach(inp => {
        inp.addEventListener('input', () => {
          const row = inp.closest('[data-size-row]');
          const idx = Number(row.dataset.sizeRow);
          const field = inp.dataset.sizeField;
          if (field === 'price') tmpProductState.sizes[idx].price = Number(inp.value) || 0;
          else tmpProductState.sizes[idx][field] = inp.value;
        });
      });
      listEl.querySelectorAll('[data-size-remove]').forEach(btn => {
        btn.addEventListener('click', () => {
          tmpProductState.sizes.splice(Number(btn.dataset.sizeRemove), 1);
          renderSizesList();
        });
      });
    }
    renderSizesList();

    $('#addSizeBtn').addEventListener('click', () => {
      tmpProductState.sizes.push({
        id: 's-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
        name: '',
        price: 0,
      });
      renderSizesList();
    });

    // Mostrar/ocultar sección de tamaños según categoría seleccionada
    $('#p-cat').addEventListener('change', () => {
      const catId = $('#p-cat').value;
      $('#sizesWrap').style.display = shouldShowSizes(catId, cats) ? 'block' : 'none';
    });

    bindImageUploader('p-img', (url) => { tmpProductState.imageUrl = url || ''; });

    $$('[data-toggle-top]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const id = item.dataset.toggleTop;
        if (tmpProductState.toppingIds.has(id)) tmpProductState.toppingIds.delete(id);
        else tmpProductState.toppingIds.add(id);
        item.classList.toggle('is-selected');
      });
    });

    $('#cancelForm').addEventListener('click', closeFormModal);
    $('#saveForm').addEventListener('click', () => saveProduct(productId, allows));

    openFormModal();
  }

  function saveProduct(productId, allowsToppings) {
    const name = $('#p-name').value.trim();
    const desc = $('#p-desc').value.trim();
    const price = Number($('#p-price').value);
    const discount = Number($('#p-discount').value) || 0;
    const categoryId = $('#p-cat').value;
    const emoji = $('#p-emoji').value.trim() || '🍽️';
    const tag = $('#p-tag').value.trim() || null;

    if (!name || !desc || !price || !categoryId) {
      toast('Completa los campos obligatorios');
      return;
    }

    // Validar y filtrar sizes solo si la categoría los permite
    const cats = DataAPI.getCategories();
    const catAllowsSizes = shouldShowSizes(categoryId, cats);
    let sizes = [];
    if (catAllowsSizes) {
      sizes = tmpProductState.sizes.filter(s => s.name && s.name.trim() && s.price > 0);
      // Si el admin abrió el editor de tamaños pero dejó alguno vacío, avisar
      if (tmpProductState.sizes.length > 0 && sizes.length !== tmpProductState.sizes.length) {
        toast('Hay tamaños incompletos. Completa nombre y precio o elimínalos.');
        return;
      }
    }

    const products = DataAPI.getProducts();
    const payload = {
      id: productId || ('p-' + Date.now()),
      name, description: desc, price, discount, categoryId, emoji, tag,
      imageUrl: tmpProductState.imageUrl || '',
      allowsToppings,
      toppingIds: allowsToppings ? [...tmpProductState.toppingIds] : [],
      sizes,
    };

    const idx = products.findIndex(p => p.id === productId);
    if (idx >= 0) products[idx] = payload;
    else products.push(payload);

    try {
      DataAPI.setProducts(products);
    } catch (e) {
      toast('No se pudo guardar (¿imagen muy pesada?)');
      return;
    }
    closeFormModal();
    renderProducts();
    toast(productId ? 'Producto actualizado' : 'Producto creado');
  }

  function deleteProduct(id) {
    if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;
    const products = DataAPI.getProducts().filter(p => p.id !== id);
    DataAPI.setProducts(products);
    renderProducts();
    toast('Producto eliminado');
  }

  // ---------- Categorías ----------
  function renderCategories() {
    const cats = DataAPI.getCategories();
    const products = DataAPI.getProducts();

    $('#mainArea').innerHTML = `
      <div class="admin-head">
        <div>
          <h1>Categorías</h1>
          <p>Organiza tu menú por tipo de producto.</p>
        </div>
        <button class="btn btn--dark btn--sm" id="newCat">+ Nueva categoría</button>
      </div>

      <div class="table-wrap">
        <table class="admin-table">
          <thead>
            <tr><th>Categoría</th><th>Productos</th><th style="text-align:right;">Acciones</th></tr>
          </thead>
          <tbody>
            ${cats.map(c => `
              <tr>
                <td>
                  <div class="cell-product">
                    <div class="cell-emoji">${esc(c.emoji)}</div>
                    <div class="cell-name">${esc(c.name)}</div>
                  </div>
                </td>
                <td>${products.filter(p => p.categoryId === c.id).length}</td>
                <td class="row-actions">
                  <button data-edit="${esc(c.id)}">Editar</button>
                  <button data-clone="${esc(c.id)}">Clonar</button>
                  <button class="btn-danger" data-del="${esc(c.id)}">Borrar</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    $('#newCat').addEventListener('click', () => openCategoryForm());
    $$('[data-edit]').forEach(b => b.addEventListener('click', () => openCategoryForm(b.dataset.edit)));
    $$('[data-clone]').forEach(b => b.addEventListener('click', () => cloneCategory(b.dataset.clone)));
    $$('[data-del]').forEach(b => b.addEventListener('click', () => deleteCategory(b.dataset.del)));
  }

  function cloneCategory(id) {
    const cats = DataAPI.getCategories();
    const original = cats.find(c => c.id === id);
    if (!original) return;
    cats.push({ id: 'cat-' + Date.now(), name: original.name + ' (copia)', emoji: original.emoji });
    DataAPI.setCategories(cats);
    renderCategories();
    toast('Categoría clonada');
  }

  function openCategoryForm(catId = null) {
    const cats = DataAPI.getCategories();
    const editing = catId ? cats.find(c => c.id === catId) : null;

    $('#formPanel').innerHTML = `
      <h2 class="form-modal__title">${editing ? 'Editar categoría' : 'Nueva categoría'}</h2>
      <div class="form-row">
        <div class="field">
          <label>Emoji</label>
          <input id="c-emoji" type="text" value="${esc(editing?.emoji || '✨')}" maxlength="4">
        </div>
        <div class="field">
          <label>Nombre</label>
          <input id="c-name" type="text" value="${esc(editing?.name || '')}" placeholder="Tortas">
        </div>
      </div>
      <div class="form-modal__foot">
        <button class="btn btn--ghost" id="cancelForm">Cancelar</button>
        <button class="btn btn--primary" id="saveForm">${editing ? 'Guardar' : 'Crear'}</button>
      </div>
    `;
    $('#cancelForm').addEventListener('click', closeFormModal);
    $('#saveForm').addEventListener('click', () => {
      const name = $('#c-name').value.trim();
      const emoji = $('#c-emoji').value.trim() || '✨';
      if (!name) { toast('Falta el nombre', 'warn'); return; }
      const newCats = DataAPI.getCategories();
      const idx = newCats.findIndex(c => c.id === catId);
      const payload = { id: catId || ('cat-' + Date.now()), name, emoji };
      if (idx >= 0) newCats[idx] = payload;
      else newCats.push(payload);
      DataAPI.setCategories(newCats);
      closeFormModal();
      renderCategories();
      toast(catId ? 'Categoría actualizada' : 'Categoría creada');
    });
    openFormModal();
  }

  function deleteCategory(id) {
    const products = DataAPI.getProducts();
    const used = products.filter(p => p.categoryId === id);
    if (used.length > 0) {
      toast(`No puedes eliminar: hay ${used.length} productos en esta categoría.`, 'warn');
      return;
    }
    if (!confirm('¿Eliminar esta categoría?')) return;
    DataAPI.setCategories(DataAPI.getCategories().filter(c => c.id !== id));
    renderCategories();
    toast('Categoría eliminada');
  }

  // ---------- Pagos ----------
  function renderPayment() {
    const p = DataAPI.getPayment();
    $('#mainArea').innerHTML = `
      <div class="admin-head">
        <div>
          <h1>Métodos de pago</h1>
          <p>Configura los datos que verán tus clientes al pagar.</p>
        </div>
      </div>

      <div class="panel">
        <h3 style="font-family:var(--font-display);font-size:20px;margin-bottom:4px;">WhatsApp de cierre</h3>
        <p style="color:var(--ink-3);font-size:13px;margin-bottom:16px;">Número al que se enviarán los pedidos (formato internacional, sin + ni espacios).</p>
        <div class="field">
          <input id="pay-wa" type="text" value="${esc(p.whatsapp)}" placeholder="573001234567">
        </div>
      </div>

      <div class="panel">
        <h3 style="font-family:var(--font-display);font-size:20px;margin-bottom:4px;">Nequi</h3>
        <div class="form-row">
          <div class="field"><label>Número</label><input id="pay-nequi-account" type="text" value="${esc(p.nequi.account)}"></div>
          <div class="field"><label>Titular</label><input id="pay-nequi-holder" type="text" value="${esc(p.nequi.holder)}"></div>
        </div>
      </div>

      <div class="panel">
        <h3 style="font-family:var(--font-display);font-size:20px;margin-bottom:4px;">Bancolombia</h3>
        <div class="form-row">
          <div class="field"><label>Cuenta</label><input id="pay-banco-account" type="text" value="${esc(p.bancolombia.account)}"></div>
          <div class="field"><label>Titular</label><input id="pay-banco-holder" type="text" value="${esc(p.bancolombia.holder)}"></div>
        </div>
        <div class="field" style="margin-top:8px;"><label>Tipo de cuenta</label><input id="pay-banco-type" type="text" value="${esc(p.bancolombia.type)}"></div>
      </div>

      <div class="panel">
        <h3 style="font-family:var(--font-display);font-size:20px;margin-bottom:4px;">Llave Bre-B</h3>
        <div class="form-row">
          <div class="field"><label>Llave (email, cel, etc.)</label><input id="pay-bre-key" type="text" value="${esc(p.bre.key)}"></div>
          <div class="field"><label>Titular</label><input id="pay-bre-holder" type="text" value="${esc(p.bre.holder)}"></div>
        </div>
      </div>

      <button class="btn btn--primary" id="savePayment" style="max-width:260px;">Guardar cambios</button>
    `;

    $('#savePayment').addEventListener('click', () => {
      const payload = {
        whatsapp: $('#pay-wa').value.trim(),
        nequi:    { account: $('#pay-nequi-account').value.trim(), holder: $('#pay-nequi-holder').value.trim() },
        bancolombia: {
          account: $('#pay-banco-account').value.trim(),
          holder:  $('#pay-banco-holder').value.trim(),
          type:    $('#pay-banco-type').value.trim() || 'Ahorros',
        },
        bre: { key: $('#pay-bre-key').value.trim(), holder: $('#pay-bre-holder').value.trim() },
      };
      DataAPI.setPayment(payload);
      toast('Datos de pago guardados');
    });
  }

  // ---------- Admins ----------
  function renderAdmins() {
    const users = DataAPI.getAdminUsers();
    const current = getSession().email;

    $('#mainArea').innerHTML = `
      <div class="admin-head">
        <div>
          <h1>Administradores</h1>
          <p>Gestiona quién puede acceder al panel.</p>
        </div>
        <button class="btn btn--dark btn--sm" id="newAdmin">+ Nuevo admin</button>
      </div>

      <div class="table-wrap">
        <table class="admin-table">
          <thead>
            <tr><th>Email</th><th>Estado</th><th style="text-align:right;">Acciones</th></tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>${esc(u.email)}</td>
                <td>${u.email === current ? '<span class="badge badge--green">Tú</span>' : '<span class="badge badge--gray">Admin</span>'}</td>
                <td class="row-actions">
                  <button data-edit="${esc(u.email)}">Cambiar clave</button>
                  ${u.email === current ? '' : `<button class="btn-danger" data-del="${esc(u.email)}">Borrar</button>`}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    $('#newAdmin').addEventListener('click', () => openAdminForm());
    $$('[data-edit]').forEach(b => b.addEventListener('click', () => openAdminForm(b.dataset.edit)));
    $$('[data-del]').forEach(b => b.addEventListener('click', () => {
      if (!confirm('¿Eliminar este admin?')) return;
      const users = DataAPI.getAdminUsers().filter(u => u.email !== b.dataset.del);
      DataAPI.setAdminUsers(users);
      renderAdmins();
      toast('Admin eliminado');
    }));
  }

  function openAdminForm(email = null) {
    const editing = email ? DataAPI.getAdminUsers().find(u => u.email === email) : null;
    $('#formPanel').innerHTML = `
      <h2 class="form-modal__title">${editing ? 'Cambiar contraseña' : 'Nuevo administrador'}</h2>
      <div class="field">
        <label>Email</label>
        <input id="a-email" type="email" value="${esc(editing?.email || '')}" ${editing ? 'disabled' : ''} placeholder="admin@bonnago.co">
      </div>
      <div class="field">
        <label>Contraseña</label>
        <input id="a-pass" type="text" placeholder="Elige una contraseña segura">
      </div>
      <div class="form-modal__foot">
        <button class="btn btn--ghost" id="cancelForm">Cancelar</button>
        <button class="btn btn--primary" id="saveForm">Guardar</button>
      </div>
    `;
    $('#cancelForm').addEventListener('click', closeFormModal);
    $('#saveForm').addEventListener('click', () => {
      const em = $('#a-email').value.trim().toLowerCase();
      const pw = $('#a-pass').value;
      if (!em || !pw) { toast('Completa ambos campos', 'warn'); return; }
      const users = DataAPI.getAdminUsers();
      const idx = users.findIndex(u => u.email.toLowerCase() === em);
      if (editing) {
        users[idx] = { ...users[idx], password: pw };
      } else {
        if (idx >= 0) { toast('Ya existe un admin con ese email', 'warn'); return; }
        users.push({ email: em, password: pw });
      }
      DataAPI.setAdminUsers(users);
      closeFormModal();
      renderAdmins();
      toast('Guardado');
    });
    openFormModal();
  }

  // ============================================================
  // PEDIDOS
  // ============================================================
  let ordersFilter = 'active'; // 'active' | 'all' | <status>

  function renderOrders() {
    const allOrders = DataAPI.getOrders();
    const unread = new Set(DataAPI.getUnreadOrderIds());
    const META = window.BonnaGoData.ORDER_STATUS_META;

    // Aplicar filtro
    let orders;
    if (ordersFilter === 'all') orders = allOrders;
    else if (ordersFilter === 'active') {
      orders = allOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
    } else {
      orders = allOrders.filter(o => o.status === ordersFilter);
    }

    // Conteos por estado para los chips
    const counts = {
      active: allOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length,
      pending: allOrders.filter(o => o.status === 'pending').length,
      confirmed: allOrders.filter(o => o.status === 'confirmed').length,
      preparing: allOrders.filter(o => o.status === 'preparing').length,
      shipped: allOrders.filter(o => o.status === 'shipped').length,
      delivered: allOrders.filter(o => o.status === 'delivered').length,
      cancelled: allOrders.filter(o => o.status === 'cancelled').length,
      all: allOrders.length,
    };

    const filterChip = (id, label) => `
      <button class="orders-filter ${ordersFilter === id ? 'is-active' : ''}" data-filter="${id}">
        ${label} ${counts[id] > 0 ? `<span class="orders-filter__count">${counts[id]}</span>` : ''}
      </button>
    `;

    const ordersView = Store.get('bonnago_admin_orders_view', 'cards');

    $('#mainArea').innerHTML = `
      <div class="admin-head">
        <div>
          <h1>Pedidos</h1>
          <p>${allOrders.length === 0 ? 'Aún no hay pedidos.' : `${allOrders.length} pedido${allOrders.length === 1 ? '' : 's'} · ${unread.size} sin leer`}</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <div class="view-toggle">
            <button class="${ordersView === 'list' ? 'is-active' : ''}" data-orders-view="list">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
              Lista
            </button>
            <button class="${ordersView === 'cards' ? 'is-active' : ''}" data-orders-view="cards">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              Cards
            </button>
          </div>
          ${unread.size > 0 ? `<button class="btn btn--ghost btn--sm" id="markAllRead">Marcar todo como leído</button>` : ''}
        </div>
      </div>

      <div class="orders-filters">
        ${filterChip('active', 'Activos')}
        ${filterChip('pending', `${META.pending.icon} Pendientes`)}
        ${filterChip('confirmed', `${META.confirmed.icon} Confirmados`)}
        ${filterChip('preparing', `${META.preparing.icon} Preparando`)}
        ${filterChip('shipped', `${META.shipped.icon} Enviados`)}
        ${filterChip('delivered', `${META.delivered.icon} Entregados`)}
        ${filterChip('cancelled', `${META.cancelled.icon} Cancelados`)}
        ${filterChip('all', 'Todos')}
      </div>

      ${orders.length === 0
        ? `<div class="panel" style="text-align:center; padding:40px; color:var(--ink-3);">
             <div style="font-size:48px; margin-bottom:8px;">📭</div>
             <p>${ordersFilter === 'active' ? 'No hay pedidos activos en este momento.' : 'No hay pedidos en esta categoría.'}</p>
           </div>`
        : ordersView === 'list'
          ? `<div class="table-wrap">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th style="text-align:right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${orders.map(o => {
                    const meta = META[o.status] || META.pending;
                    return `
                      <tr data-order-row="${esc(o.id)}" style="cursor:pointer;${unread.has(o.id) ? 'background:rgba(199,199,234,0.18);' : ''}">
                        <td><strong>#${esc(o.code || o.id.slice(-5).toUpperCase())}</strong></td>
                        <td>${esc(o.customer.name)}<div style="font-size:11px;color:var(--ink-3);">${esc(o.customer.phone)}</div></td>
                        <td style="font-size:12px;color:var(--ink-3);">${formatDateShort(o.createdAt)}</td>
                        <td><span class="order-status is-${o.status}">${meta.icon} ${meta.short}</span></td>
                        <td style="text-align:right;font-weight:700;">${formatCOP(o.total)}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>`
          : `<div class="orders-list">${orders.map(o => renderOrderCard(o, unread.has(o.id))).join('')}</div>`
      }

      ${orders.length > 0 ? `
        <div class="orders-summary">
          <div class="orders-summary__row">
            <span class="orders-summary__label">Total de pedidos mostrados</span>
            <span class="orders-summary__value">${orders.length}</span>
          </div>
          <div class="orders-summary__row orders-summary__row--main">
            <span class="orders-summary__label">Suma total</span>
            <span class="orders-summary__value orders-summary__value--main">${formatCOP(orders.reduce((s, o) => s + (o.total || 0), 0))}</span>
          </div>
        </div>
      ` : ''}
    `;

    $$('[data-filter]').forEach(b => b.addEventListener('click', () => {
      ordersFilter = b.dataset.filter;
      renderOrders();
    }));

    $$('[data-orders-view]').forEach(b => b.addEventListener('click', () => {
      Store.set('bonnago_admin_orders_view', b.dataset.ordersView);
      renderOrders();
    }));

    $$('[data-order-row]').forEach(row => {
      row.addEventListener('click', () => {
        // En vista lista, click en fila cambia a cards y abre ese pedido
        Store.set('bonnago_admin_orders_view', 'cards');
        const id = row.dataset.orderRow;
        renderOrders();
        setTimeout(() => {
          const card = document.querySelector(`[data-order-toggle="${id}"]`);
          if (card) {
            card.click();
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 50);
      });
    });

    const ma = $('#markAllRead');
    if (ma) ma.addEventListener('click', () => { DataAPI.markAllOrdersRead(); refreshSidebar(); renderOrders(); });

    $$('[data-order-toggle]').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.orderToggle;
        const body = $(`#order-body-${id}`);
        body.classList.toggle('is-open');
        if (unread.has(id)) {
          DataAPI.markOrderRead(id);
          card.classList.remove('is-unread');
          refreshSidebar();
        }
      });
    });

    $$('[data-order-status]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const newStatus = btn.dataset.orderStatus;
        DataAPI.setOrderStatus(btn.dataset.orderId, newStatus);
        renderOrders();
        const META = window.BonnaGoData.ORDER_STATUS_META;
        toast(`Pedido marcado como "${META[newStatus]?.short || newStatus}"`);
      });
    });

    $$('[data-order-del]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm('¿Eliminar este pedido del registro?')) return;
        DataAPI.deleteOrder(btn.dataset.orderDel);
        refreshSidebar();
        renderOrders();
        toast('Pedido eliminado');
      });
    });
  }

  function renderOrderCard(o, isUnread) {
    const META = window.BonnaGoData.ORDER_STATUS_META;
    const meta = META[o.status] || META.pending;
    const dateStr = new Date(o.deliveryDate + 'T12:00:00').toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long'
    });

    // Acciones disponibles según el estado actual
    const nextActions = {
      pending:   [{ status: 'confirmed', label: 'Marcar pago confirmado', primary: true }],
      confirmed: [{ status: 'preparing', label: 'Empezar a preparar',     primary: true }],
      preparing: [{ status: 'shipped',   label: 'Marcar enviado',         primary: true }],
      shipped:   [{ status: 'delivered', label: 'Marcar entregado',       primary: true }],
      delivered: [],
      cancelled: [],
    }[o.status] || [];

    const cancelBtn = (o.status !== 'delivered' && o.status !== 'cancelled')
      ? `<button class="btn btn--ghost btn--sm" data-order-status="cancelled" data-order-id="${esc(o.id)}">Cancelar pedido</button>`
      : '';

    return `
      <div class="order-card ${isUnread ? 'is-unread' : ''}" data-order-toggle="${esc(o.id)}">
        <div class="order-card__head">
          <div class="order-card__head-left">
            <div class="order-card__customer">
              ${isUnread ? '<span class="order-card__dot" title="Nuevo"></span>' : ''}
              ${esc(o.customer.name)}
              <span class="order-card__code">#${esc(o.code || o.id.slice(-5).toUpperCase())}</span>
            </div>
            <div class="order-card__meta">
              ${formatDateShort(o.createdAt)} · ${esc(o.customer.phone)} · ${esc(o.paymentLabel)}
            </div>
          </div>
          <div class="order-card__right">
            <span class="order-status is-${o.status}">${meta.icon} ${meta.short}</span>
            <strong class="order-card__total">${formatCOP(o.total)}</strong>
          </div>
        </div>
        <div class="order-card__body" id="order-body-${esc(o.id)}">
          <div class="order-detail">
            <h4>Productos</h4>
            <ul>
              ${o.items.map(it => `
                <li>
                  <div>
                    <strong>${it.qty}× ${esc(it.productName)}</strong>
                    ${it.toppings.length ? `<small>+ ${it.toppings.map(t => esc(t.name)).join(', ')}</small>` : ''}
                  </div>
                  <span>${formatCOP(it.lineTotal)}</span>
                </li>
              `).join('')}
            </ul>
          </div>
          <div class="order-detail">
            <h4>Entrega</h4>
            <p>📅 ${esc(dateStr)}</p>
            <p>📍 ${esc(o.customer.address)}</p>
          </div>
          <div class="order-detail order-actions">
            ${nextActions.map(a => `
              <button class="btn ${a.primary ? 'btn--primary' : 'btn--ghost'} btn--sm" data-order-status="${a.status}" data-order-id="${esc(o.id)}">${esc(a.label)}</button>
            `).join('')}
            ${cancelBtn}
            <button class="btn btn--ghost btn--sm" data-order-del="${esc(o.id)}" style="color:var(--danger);">Eliminar</button>
          </div>
        </div>
      </div>
    `;
  }

  // ============================================================
  // TOPPINGS (CRUD global)
  // ============================================================
  let tmpToppingState = { imageUrl: '' };

  function renderToppings() {
    const toppings = DataAPI.getToppings();
    const TC = window.BonnaGoData.TOPPING_CATEGORIES;
    const catMap = {};
    TC.forEach(c => { catMap[c.id] = c; });

    $('#mainArea').innerHTML = `
      <div class="admin-head">
        <div>
          <h1>Toppings</h1>
          <p>Crea los toppings categorizados (Salsas, Frutas, Otros) que luego asignarás a productos.</p>
        </div>
        <button class="btn btn--dark btn--sm" id="newTopping">+ Nuevo topping</button>
      </div>

      <div class="table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Topping</th>
              <th>Categoría</th>
              <th>Gramos</th>
              <th>Precio extra</th>
              <th>Usado en</th>
              <th style="text-align:right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${toppings.map(t => {
              const usedIn = DataAPI.getProducts().filter(p => p.allowsToppings && (p.toppingIds || []).includes(t.id)).length;
              const thumb = t.imageUrl
                ? `<div class="cell-emoji" style="background-image:url('${esc(t.imageUrl)}'); background-size:cover; background-position:center;"></div>`
                : `<div class="cell-emoji">${esc(t.emoji || '✨')}</div>`;
              const cat = catMap[t.category] || { name: 'Sin categoría', emoji: '📦' };
              return `
              <tr>
                <td>
                  <div class="cell-product">
                    ${thumb}
                    <div class="cell-name">${esc(t.name)}</div>
                  </div>
                </td>
                <td><span class="badge badge--green">${esc(cat.emoji)} ${esc(cat.name)}</span></td>
                <td>${t.grams ? t.grams + 'g' : '—'}</td>
                <td>${t.price > 0 ? '+' + formatCOP(t.price) : '<span style="color:var(--ink-4);">incluido</span>'}</td>
                <td>${usedIn} producto${usedIn === 1 ? '' : 's'}</td>
                <td class="row-actions">
                  <button data-edit="${esc(t.id)}">Editar</button>
                  <button data-clone="${esc(t.id)}">Clonar</button>
                  <button class="btn-danger" data-del="${esc(t.id)}">Borrar</button>
                </td>
              </tr>
            `;}).join('')}
            ${toppings.length === 0 ? `<tr><td colspan="6" style="text-align:center; padding:40px; color:var(--ink-3);">No hay toppings aún. Crea el primero.</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    `;

    $('#newTopping').addEventListener('click', () => openToppingForm());
    $$('[data-edit]').forEach(b => b.addEventListener('click', () => openToppingForm(b.dataset.edit)));
    $$('[data-clone]').forEach(b => b.addEventListener('click', () => cloneTopping(b.dataset.clone)));
    $$('[data-del]').forEach(b => b.addEventListener('click', () => deleteTopping(b.dataset.del)));
  }

  function openToppingForm(toppingId = null) {
    const all = DataAPI.getToppings();
    const TC = window.BonnaGoData.TOPPING_CATEGORIES;
    const editing = toppingId ? all.find(t => t.id === toppingId) : null;
    tmpToppingState = { imageUrl: editing?.imageUrl || '' };

    $('#formPanel').innerHTML = `
      <h2 class="form-modal__title">${editing ? 'Editar topping' : 'Nuevo topping'}</h2>

      <div class="field">
        <label>Imagen del topping (opcional)</label>
        ${imageUploaderHTML(tmpToppingState.imageUrl, 't-img')}
      </div>

      <div class="form-row">
        <div class="field">
          <label>Emoji (fallback)</label>
          <input id="t-emoji" type="text" value="${esc(editing?.emoji || '✨')}" maxlength="4">
        </div>
        <div class="field">
          <label>Nombre</label>
          <input id="t-name" type="text" value="${esc(editing?.name || '')}" placeholder="Fresa natural">
        </div>
      </div>

      <div class="field">
        <label>Categoría</label>
        <select id="t-cat">
          ${TC.map(c => `<option value="${esc(c.id)}" ${(editing?.category || 'other') === c.id ? 'selected' : ''}>${esc(c.emoji)} ${esc(c.name)}</option>`).join('')}
        </select>
      </div>

      <div class="form-row">
        <div class="field">
          <label>Gramos</label>
          <input id="t-grams" type="number" min="0" step="1" value="${editing?.grams || 0}" placeholder="30">
        </div>
        <div class="field">
          <label>Precio extra (COP)</label>
          <input id="t-price" type="number" min="0" step="500" value="${editing?.price || 0}" placeholder="0">
        </div>
      </div>

      <p style="font-size:12px; color:var(--ink-3); margin-top:4px;">
        Si el precio es 0, el topping se mostrará al cliente como "incluido".
      </p>

      <div class="form-modal__foot">
        <button class="btn btn--ghost" id="cancelForm">Cancelar</button>
        <button class="btn btn--primary" id="saveForm">${editing ? 'Guardar' : 'Crear'}</button>
      </div>
    `;

    bindImageUploader('t-img', (url) => { tmpToppingState.imageUrl = url || ''; });

    $('#cancelForm').addEventListener('click', closeFormModal);
    $('#saveForm').addEventListener('click', () => {
      const name = $('#t-name').value.trim();
      const emoji = $('#t-emoji').value.trim() || '✨';
      const grams = Number($('#t-grams').value) || 0;
      const price = Number($('#t-price').value) || 0;
      const category = $('#t-cat').value || 'other';
      if (!name) { toast('Falta el nombre'); return; }

      const all = DataAPI.getToppings();
      const payload = {
        id: toppingId || ('t-' + Date.now()),
        name, emoji, grams, price, category,
        imageUrl: tmpToppingState.imageUrl || '',
      };
      const idx = all.findIndex(t => t.id === toppingId);
      if (idx >= 0) all[idx] = payload;
      else all.push(payload);
      try { DataAPI.setToppings(all); }
      catch { toast('No se pudo guardar (¿imagen muy pesada?)'); return; }
      closeFormModal();
      renderToppings();
      toast(toppingId ? 'Topping actualizado' : 'Topping creado');
    });

    openFormModal();
  }

  function cloneTopping(id) {
    const all = DataAPI.getToppings();
    const original = all.find(t => t.id === id);
    if (!original) return;
    const copy = { ...original, id: 't-' + Date.now(), name: original.name + ' (copia)' };
    all.push(copy);
    DataAPI.setToppings(all);
    renderToppings();
    toast('Topping clonado');
  }

  function deleteTopping(id) {
    const usedIn = DataAPI.getProducts().filter(p => (p.toppingIds || []).includes(id)).length;
    if (usedIn > 0) {
      if (!confirm(`Este topping está asignado a ${usedIn} producto${usedIn === 1 ? '' : 's'}. ¿Eliminar de todos modos? Se quitará automáticamente de esos productos.`)) return;
      // limpiar referencias en productos
      const products = DataAPI.getProducts().map(p => ({
        ...p,
        toppingIds: (p.toppingIds || []).filter(tid => tid !== id),
      }));
      DataAPI.setProducts(products);
    } else {
      if (!confirm('¿Eliminar este topping?')) return;
    }
    DataAPI.setToppings(DataAPI.getToppings().filter(t => t.id !== id));
    renderToppings();
    toast('Topping eliminado');
  }

  // ============================================================
  // BANNER / PUBLICIDAD
  // ============================================================
  // ============================================================
  // PROMOCIONES (carrusel del home)
  // ============================================================
  let tmpPromoState = { imageUrl: '' };

  function renderPromotionsAdmin() {
    const promos = DataAPI.getPromotions();
    $('#mainArea').innerHTML = `
      <div class="admin-head">
        <div>
          <h1>Promociones</h1>
          <p>Gestiona las promociones que aparecen en el carrusel del home.</p>
        </div>
        <button class="btn btn--dark btn--sm" id="newPromo">+ Nueva promoción</button>
      </div>

      <div class="table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Promoción</th>
              <th>Badge</th>
              <th>Estado</th>
              <th style="text-align:right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${promos.map(p => {
              const thumb = p.imageUrl
                ? `<div class="cell-emoji" style="background-image:url('${esc(p.imageUrl)}'); background-size:cover; background-position:center;"></div>`
                : `<div class="cell-emoji">📣</div>`;
              return `
              <tr>
                <td>
                  <div class="cell-product">
                    ${thumb}
                    <div>
                      <div class="cell-name">${esc(p.title)}</div>
                      <div class="cell-desc">${esc((p.description || '').slice(0, 70))}${(p.description || '').length > 70 ? '…' : ''}</div>
                    </div>
                  </div>
                </td>
                <td>${p.badge ? `<span class="badge badge--orange">${esc(p.badge)}</span>` : '<span style="color:var(--ink-4);">—</span>'}</td>
                <td>${p.active !== false
                  ? '<span class="badge badge--green">Activa</span>'
                  : '<span class="badge badge--gray">Inactiva</span>'}</td>
                <td class="row-actions">
                  <button data-toggle-active="${esc(p.id)}">${p.active !== false ? 'Pausar' : 'Activar'}</button>
                  <button data-edit="${esc(p.id)}">Editar</button>
                  <button data-clone="${esc(p.id)}">Clonar</button>
                  <button class="btn-danger" data-del="${esc(p.id)}">Borrar</button>
                </td>
              </tr>
            `;}).join('')}
            ${promos.length === 0 ? `<tr><td colspan="4" style="text-align:center; padding:40px; color:var(--ink-3);">No hay promociones aún. Crea la primera.</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    `;

    $('#newPromo').addEventListener('click', () => openPromoForm());
    $$('[data-edit]').forEach(b => b.addEventListener('click', () => openPromoForm(b.dataset.edit)));
    $$('[data-clone]').forEach(b => b.addEventListener('click', () => clonePromo(b.dataset.clone)));
    $$('[data-del]').forEach(b => b.addEventListener('click', () => deletePromo(b.dataset.del)));
    $$('[data-toggle-active]').forEach(b => b.addEventListener('click', () => togglePromoActive(b.dataset.toggleActive)));
  }

  function openPromoForm(promoId = null) {
    const all = DataAPI.getPromotions();
    const editing = promoId ? all.find(p => p.id === promoId) : null;
    tmpPromoState = { imageUrl: editing?.imageUrl || '' };

    $('#formPanel').innerHTML = `
      <h2 class="form-modal__title">${editing ? 'Editar promoción' : 'Nueva promoción'}</h2>

      <div class="field">
        <label>Imagen de la promoción (recomendado)</label>
        ${imageUploaderHTML(tmpPromoState.imageUrl, 'promo-img')}
      </div>

      <div class="field">
        <label>Título principal</label>
        <textarea id="promo-title" rows="2" placeholder="Cheesecakes con 10% OFF esta semana">${esc(editing?.title || '')}</textarea>
      </div>

      <div class="field">
        <label>Parte destacada del título (se mostrará en lila)</label>
        <input id="promo-highlight" type="text" value="${esc(editing?.titleHighlight || '')}" placeholder="10% OFF">
        <p style="font-size:12px; color:var(--ink-3); margin-top:4px;">
          Debe ser una porción exacta del título.
        </p>
      </div>

      <div class="field">
        <label>Descripción</label>
        <textarea id="promo-desc" rows="3" placeholder="Aprovecha descuentos en nuestros cheesecakes seleccionados.">${esc(editing?.description || '')}</textarea>
      </div>

      <div class="form-row">
        <div class="field">
          <label>Badge (opcional, ej. "Oferta", "Nuevo")</label>
          <input id="promo-badge" type="text" value="${esc(editing?.badge || '')}" placeholder="Oferta">
        </div>
        <div class="field">
          <label>Texto del botón</label>
          <input id="promo-cta" type="text" value="${esc(editing?.ctaLabel || 'Pide ahora')}" placeholder="Pide ahora">
        </div>
      </div>

      <button type="button" class="toggle-btn ${editing?.active !== false ? 'is-on' : ''}" id="promo-active-btn" aria-pressed="${editing?.active !== false ? 'true' : 'false'}">
        <span class="toggle-btn__track"><span class="toggle-btn__thumb"></span></span>
        <span class="toggle-btn__label">Promoción activa (visible en el carrusel)</span>
      </button>

      <div class="form-modal__foot">
        <button class="btn btn--ghost" id="cancelForm">Cancelar</button>
        <button class="btn btn--primary" id="saveForm">${editing ? 'Guardar' : 'Crear'}</button>
      </div>
    `;

    let active = editing ? editing.active !== false : true;
    const activeBtn = $('#promo-active-btn');
    activeBtn.addEventListener('click', () => {
      active = !active;
      activeBtn.classList.toggle('is-on', active);
      activeBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    bindImageUploader('promo-img', (url) => { tmpPromoState.imageUrl = url || ''; });

    $('#cancelForm').addEventListener('click', closeFormModal);
    $('#saveForm').addEventListener('click', () => {
      const title = $('#promo-title').value.trim();
      const titleHighlight = $('#promo-highlight').value.trim();
      const description = $('#promo-desc').value.trim();
      const badge = $('#promo-badge').value.trim();
      const ctaLabel = $('#promo-cta').value.trim() || 'Pide ahora';
      if (!title) { toast('Falta el título'); return; }

      const promos = DataAPI.getPromotions();
      const payload = {
        id: promoId || ('promo-' + Date.now()),
        title, titleHighlight, description, badge, ctaLabel,
        imageUrl: tmpPromoState.imageUrl || '',
        active,
      };
      const idx = promos.findIndex(p => p.id === promoId);
      if (idx >= 0) promos[idx] = payload;
      else promos.push(payload);
      try { DataAPI.setPromotions(promos); }
      catch { toast('No se pudo guardar (¿imagen muy pesada?)'); return; }
      closeFormModal();
      renderPromotionsAdmin();
      toast(promoId ? 'Promoción actualizada' : 'Promoción creada');
    });

    openFormModal();
  }

  function clonePromo(id) {
    const all = DataAPI.getPromotions();
    const original = all.find(p => p.id === id);
    if (!original) return;
    const copy = { ...original, id: 'promo-' + Date.now(), title: original.title + ' (copia)', active: false };
    all.push(copy);
    DataAPI.setPromotions(all);
    renderPromotionsAdmin();
    toast('Promoción clonada (inactiva)');
  }

  function deletePromo(id) {
    if (!confirm('¿Eliminar esta promoción?')) return;
    DataAPI.setPromotions(DataAPI.getPromotions().filter(p => p.id !== id));
    renderPromotionsAdmin();
    toast('Promoción eliminada');
  }

  function togglePromoActive(id) {
    const all = DataAPI.getPromotions().map(p =>
      p.id === id ? { ...p, active: !(p.active !== false) } : p
    );
    DataAPI.setPromotions(all);
    renderPromotionsAdmin();
  }

  // ============================================================
  // BANNER / PUBLICIDAD
  // ============================================================
  let tmpBannerState = { imageUrl: '' };

  function renderBannerEditor() {
    const b = DataAPI.getBanner();
    tmpBannerState = { imageUrl: b.imageUrl || '' };

    $('#mainArea').innerHTML = `
      <div class="admin-head">
        <div>
          <h1>Publicidad</h1>
          <p>Edita el banner principal que ven tus clientes al entrar.</p>
        </div>
      </div>

      <div class="panel">
        <div class="field">
          <label>Imagen del banner (opcional)</label>
          ${imageUploaderHTML(b.imageUrl, 'b-img')}
        </div>
        <div class="field">
          <label>Eyebrow (texto pequeño superior)</label>
          <input id="b-eyebrow" type="text" value="${esc(b.eyebrow)}" placeholder="BonnaGo · Cartagena">
        </div>
        <div class="field">
          <label>Título principal</label>
          <textarea id="b-title" rows="2" placeholder="Pide tus postres favoritos listos en un día.">${esc(b.title)}</textarea>
        </div>
        <div class="field">
          <label>Parte destacada del título (se mostrará en lila)</label>
          <input id="b-highlight" type="text" value="${esc(b.titleHighlight || '')}" placeholder="listos en un día">
          <p style="font-size:12px; color:var(--ink-3); margin-top:4px;">
            Debe ser una porción exacta del título. Si no coincide, el título completo se mostrará en blanco.
          </p>
        </div>
        <div class="field">
          <label>Descripción</label>
          <textarea id="b-desc" rows="3" placeholder="Artesanales, frescos...">${esc(b.description)}</textarea>
        </div>
        <div class="field">
          <label>Texto del botón</label>
          <input id="b-cta" type="text" value="${esc(b.ctaLabel)}" placeholder="Pide ahora">
        </div>

        <button class="btn btn--primary" id="saveBanner" style="max-width:260px; margin-top:8px;">Guardar cambios</button>
      </div>
    `;

    bindImageUploader('b-img', (url) => { tmpBannerState.imageUrl = url || ''; });

    $('#saveBanner').addEventListener('click', () => {
      const payload = {
        eyebrow: $('#b-eyebrow').value.trim(),
        title: $('#b-title').value.trim(),
        titleHighlight: $('#b-highlight').value.trim(),
        description: $('#b-desc').value.trim(),
        ctaLabel: $('#b-cta').value.trim() || 'Pide ahora',
        imageUrl: tmpBannerState.imageUrl || '',
      };
      try { DataAPI.setBanner(payload); }
      catch { toast('No se pudo guardar (¿imagen muy pesada?)'); return; }
      toast('Banner actualizado · recarga la tienda para ver los cambios');
    });
  }

  // ---------- Form modal helpers ----------
  function openFormModal() { $('#formModal').classList.add('is-open'); document.body.style.overflow = 'hidden'; }
  function closeFormModal() { $('#formModal').classList.remove('is-open'); document.body.style.overflow = ''; }

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    if (!t) return;
    t.querySelector('.toast__msg').textContent = msg;
    t.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-visible'), 2200);
  }

  // ---------- Init ----------
  document.addEventListener('DOMContentLoaded', () => {
    if (!getSession()) {
      handleLogin();
    } else {
      renderShell();
    }
  });
})();
