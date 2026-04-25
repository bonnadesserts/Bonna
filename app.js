// =======================================================
// BonnaGo — App del cliente
// =======================================================
(() => {
  const { DataAPI, formatCOP, productPrice, Store, STORAGE_KEYS } = window.DulceData;

  // ---------- Estado ----------
  const state = {
    activeCategory: 'all',
    cart: Store.get(STORAGE_KEYS.cart, []),  // items: {cartId, productId, qty, toppingIds[]}
    checkoutStep: 1,
    customer: { name: '', phone: '', address: '', date: '', payment: '' },
  };

  const saveCart = () => Store.set(STORAGE_KEYS.cart, state.cart);

  // ---------- Helpers DOM ----------
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  // ---------- Renderizado de categorías ----------
  function renderCategories() {
    const cats = DataAPI.getCategories();
    const container = $('#cats');
    const items = [
      { id: 'all', name: 'Todo', emoji: '✨' },
      ...cats,
    ];
    container.innerHTML = items.map(c => `
      <button class="cat ${c.id === state.activeCategory ? 'is-active' : ''}" data-cat="${esc(c.id)}">
        <span class="cat__emoji">${esc(c.emoji)}</span>
        <span>${esc(c.name)}</span>
      </button>
    `).join('');
    $$('.cat', container).forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeCategory = btn.dataset.cat;
        renderCategories();
        renderProducts();
        syncBottomNav();
      });
    });

    // Actualizar título de la sección
    const titleEl = $('#sectionTitle');
    if (titleEl) {
      const activeCat = items.find(c => c.id === state.activeCategory);
      if (state.activeCategory === 'all') {
        titleEl.innerHTML = 'Algo rico para <em>cada antojo</em>';
      } else if (activeCat) {
        titleEl.innerHTML = `${esc(activeCat.emoji)} <em>${esc(activeCat.name)}</em>`;
      }
    }
  }

  // Mantiene el bottom nav sincronizado con la categoría activa
  function syncBottomNav() {
    const items = $$('.bottom-nav__item');
    items.forEach(i => {
      const tab = i.dataset.tab;
      const isHome = tab === 'home' && state.activeCategory === 'all' && window.scrollY < 100;
      const isCat = tab === state.activeCategory;
      i.classList.toggle('is-active', isHome || isCat);
    });
  }

  // ---------- Renderizado de productos ----------
  function renderProducts() {
    const products = DataAPI.getProducts();
    const filtered = state.activeCategory === 'all'
      ? products
      : products.filter(p => p.categoryId === state.activeCategory);

    const grid = $('#grid');
    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--ink-3);">
        No hay productos en esta categoría todavía.
      </div>`;
      return;
    }

    grid.innerHTML = filtered.map(p => {
      const finalPrice = productPrice(p);
      const hasDiscount = p.discount && p.discount > 0;
      const mediaContent = p.imageUrl
        ? `<img class="product__photo" src="${esc(p.imageUrl)}" alt="${esc(p.name)}" loading="lazy">`
        : `<div class="product__img">${esc(p.emoji || '🍽️')}</div>`;
      return `
        <article class="product" data-id="${esc(p.id)}">
          <div class="product__media">
            ${mediaContent}
            ${p.tag ? `<span class="product__tag ${hasDiscount ? 'product__tag--sale' : ''}">${esc(p.tag)}</span>` : ''}
            <button class="product__fav" aria-label="Favorito" data-fav>♡</button>
          </div>
          <h3 class="product__name">${esc(p.name)}</h3>
          <p class="product__desc">${esc(p.description)}</p>
          <div class="product__foot">
            <div class="product__price">
              ${hasDiscount ? `<s>${formatCOP(p.price)}</s>` : ''}
              <strong>${formatCOP(finalPrice)}</strong>
            </div>
            <button class="product__add" aria-label="Agregar" data-add>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </button>
          </div>
        </article>
      `;
    }).join('');

    // Bind
    $$('[data-add]', grid).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.closest('.product').dataset.id;
        openProductModal(id);
      });
    });
    $$('[data-fav]', grid).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        btn.classList.toggle('is-active');
        btn.textContent = btn.classList.contains('is-active') ? '♥' : '♡';
      });
    });
    $$('.product', grid).forEach(card => {
      card.addEventListener('click', () => openProductModal(card.dataset.id));
    });
  }

  // ---------- Modal de producto ----------
  const modalEl = $('#productModal');
  const scrimEl = $('#scrim');
  let modalCtx = null; // {product, qty, selectedToppings: Set}

  function openProductModal(productId) {
    const p = DataAPI.getProducts().find(x => x.id === productId);
    if (!p) return;
    modalCtx = { product: p, qty: 1, selectedToppings: new Set() };
    renderProductModal();
    modalEl.classList.add('is-open');
    scrimEl.classList.add('is-open');
    scrimEl.dataset.closes = 'modal';
    document.body.style.overflow = 'hidden';
  }

  function closeProductModal() {
    modalEl.classList.remove('is-open');
    scrimEl.classList.remove('is-open');
    document.body.style.overflow = '';
    modalCtx = null;
  }

  function renderProductModal() {
    if (!modalCtx) return;
    const { product: p, qty, selectedToppings } = modalCtx;
    const baseFinal = productPrice(p);
    const productToppings = DataAPI.resolveProductToppings(p);
    const toppingsTotal = productToppings
      .filter(t => selectedToppings.has(t.id))
      .reduce((s, t) => s + (t.price || 0), 0);
    const total = (baseFinal + toppingsTotal) * qty;

    const TC = window.BonnaGoData.TOPPING_CATEGORIES;
    // Agrupar por categoría
    const groups = {};
    TC.forEach(c => groups[c.id] = []);
    const uncategorized = [];
    productToppings.forEach(t => {
      if (t.category && groups[t.category]) groups[t.category].push(t);
      else uncategorized.push(t);
    });

    const renderTopItem = (t) => `
      <label class="topping ${selectedToppings.has(t.id) ? 'is-selected' : ''}" data-topping="${esc(t.id)}">
        <span class="topping__label">
          <span class="topping__emoji">${esc(t.emoji)}</span>
          <span>${esc(t.name)}${t.grams ? ` · ${t.grams}g` : ''}${t.price > 0 ? ` · +${formatCOP(t.price)}` : ''}</span>
        </span>
        <span class="topping__check">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12l5 5L20 7"/>
          </svg>
        </span>
      </label>
    `;

    const groupedHTML = TC
      .filter(c => groups[c.id].length > 0)
      .map(c => `
        <div class="topping-group-cust">
          <div class="topping-group-cust__title">
            <span>${esc(c.emoji)}</span>
            <span>${esc(c.name)}</span>
          </div>
          ${groups[c.id].map(renderTopItem).join('')}
        </div>
      `).join('');

    const uncatHTML = uncategorized.length > 0
      ? `<div class="topping-group-cust">
           <div class="topping-group-cust__title"><span>📦</span><span>Otros</span></div>
           ${uncategorized.map(renderTopItem).join('')}
         </div>`
      : '';

    const toppingsHTML = p.allowsToppings && productToppings.length
      ? `
        <div class="modal__section-title">
          <span>Elige tus toppings</span>
          <small>Opcional</small>
        </div>
        ${groupedHTML}${uncatHTML}
      `
      : '';

    modalEl.querySelector('.modal__panel').innerHTML = `
      <div class="modal__hero ${p.imageUrl ? 'modal__hero--img' : ''}">
        ${p.imageUrl
          ? `<img src="${esc(p.imageUrl)}" alt="${esc(p.name)}">`
          : `<span>${esc(p.emoji || '🍽️')}</span>`}
        <button class="modal__close" aria-label="Cerrar" data-close>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M6 6l12 12M18 6L6 18"/>
          </svg>
        </button>
      </div>
      <div class="modal__body">
        <h2 class="modal__title">${esc(p.name)}</h2>
        <p class="modal__desc">${esc(p.description)}</p>

        ${toppingsHTML}

        <div class="modal__section-title" style="margin-top:24px;">
          <span>Cantidad</span>
          <div class="qty-stepper">
            <button data-qty="-1" aria-label="Menos">−</button>
            <span>${qty}</span>
            <button data-qty="+1" aria-label="Más">+</button>
          </div>
        </div>

        <div class="modal__foot">
          <button class="btn btn--ghost" data-close>Cancelar</button>
          <button class="btn btn--primary" data-confirm>
            Agregar · ${formatCOP(total)}
          </button>
        </div>
      </div>
    `;

    modalEl.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeProductModal));
    modalEl.querySelectorAll('[data-topping]').forEach(l => {
      l.addEventListener('click', (e) => {
        e.preventDefault();
        const id = l.dataset.topping;
        if (selectedToppings.has(id)) selectedToppings.delete(id);
        else selectedToppings.add(id);
        renderProductModal();
      });
    });
    modalEl.querySelectorAll('[data-qty]').forEach(b => {
      b.addEventListener('click', () => {
        modalCtx.qty = Math.max(1, modalCtx.qty + Number(b.dataset.qty));
        renderProductModal();
      });
    });
    modalEl.querySelector('[data-confirm]').addEventListener('click', () => {
      addToCart(p.id, modalCtx.qty, [...selectedToppings]);
      closeProductModal();
      toast(`${p.name} agregado ✨`);
    });
  }

  // ---------- Carrito ----------
  function addToCart(productId, qty, toppingIds) {
    const cartId = `${productId}_${toppingIds.slice().sort().join('-')}`;
    const existing = state.cart.find(i => i.cartId === cartId);
    if (existing) existing.qty += qty;
    else state.cart.push({ cartId, productId, qty, toppingIds });
    saveCart();
    renderCartBar(true);
    renderCartDrawer();
  }

  function updateQty(cartId, delta) {
    const it = state.cart.find(i => i.cartId === cartId);
    if (!it) return;
    it.qty += delta;
    if (it.qty <= 0) removeItem(cartId);
    else { saveCart(); renderCartBar(); renderCartDrawer(); }
  }

  function removeItem(cartId) {
    state.cart = state.cart.filter(i => i.cartId !== cartId);
    saveCart();
    renderCartBar();
    renderCartDrawer();
  }

  function clearCart() {
    state.cart = [];
    saveCart();
    renderCartBar();
    renderCartDrawer();
  }

  function computeCart() {
    const products = DataAPI.getProducts();
    let subtotal = 0;
    const lines = state.cart.map(item => {
      const p = products.find(x => x.id === item.productId);
      if (!p) return null;
      const base = productPrice(p);
      const productTops = DataAPI.resolveProductToppings(p);
      const tops = productTops.filter(t => item.toppingIds.includes(t.id));
      const topsTotal = tops.reduce((s, t) => s + (t.price || 0), 0);
      const unit = base + topsTotal;
      const total = unit * item.qty;
      subtotal += total;
      return { item, product: p, toppings: tops, unit, total };
    }).filter(Boolean);
    return { lines, subtotal, count: state.cart.reduce((s, i) => s + i.qty, 0) };
  }

  function renderCartBar(animate = false) {
    const { subtotal, count } = computeCart();
    const bar = $('#cartBar');
    $('#cartBarCount').textContent = `${count} ${count === 1 ? 'producto' : 'productos'}`;
    $('#cartBarTotal').textContent = formatCOP(subtotal);
    $('#cartCount').textContent = count;
    $('#cartCount').style.display = count > 0 ? '' : 'none';
    bar.classList.toggle('is-visible', count > 0);
    if (animate && count > 0) {
      bar.classList.remove('is-pulse');
      void bar.offsetWidth; // reflow
      bar.classList.add('is-pulse');
    }
  }

  function renderCartDrawer() {
    const { lines, subtotal, count } = computeCart();
    const body = $('#drawerBody');
    const foot = $('#drawerFoot');

    if (state.checkoutStep > 1) { renderCheckoutStep(); return; }

    if (count === 0) {
      body.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty__icon">🧺</div>
          <p style="font-family:var(--font-display);font-weight:700;font-size:20px;color:var(--ink);margin-bottom:6px;">Tu canasta está vacía</p>
          <p style="font-size:14px;">Empieza a agregar productos deliciosos.</p>
        </div>
      `;
      foot.innerHTML = '';
      return;
    }

    body.innerHTML = lines.map(line => `
      <div class="cart-item">
        <div class="cart-item__img">${esc(line.product.emoji || '🍽️')}</div>
        <div>
          <div class="cart-item__name">${esc(line.product.name)}</div>
          ${line.toppings.length ? `<div class="cart-item__toppings">+ ${line.toppings.map(t => esc(t.name)).join(', ')}</div>` : ''}
          <div class="cart-item__controls">
            <button class="cart-item__btn" data-qty="-1" data-cid="${esc(line.item.cartId)}">−</button>
            <span class="cart-item__qty">${line.item.qty}</span>
            <button class="cart-item__btn" data-qty="+1" data-cid="${esc(line.item.cartId)}">+</button>
          </div>
        </div>
        <div class="cart-item__right">
          <div class="cart-item__price">${formatCOP(line.total)}</div>
          <button class="cart-item__remove" data-remove="${esc(line.item.cartId)}">Quitar</button>
        </div>
      </div>
    `).join('');

    foot.innerHTML = `
      <div class="totals">
        <div class="totals__row"><span>Subtotal</span><span>${formatCOP(subtotal)}</span></div>
        <div class="totals__row"><span>Envío</span><span>Se coordina por WhatsApp</span></div>
        <div class="totals__row totals__row--total"><span>Total</span><span>${formatCOP(subtotal)}</span></div>
      </div>
      <button class="btn btn--primary" id="goCheckout">
        Finalizar pedido
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M5 12h14M13 5l7 7-7 7"/>
        </svg>
      </button>
    `;

    $$('[data-qty]', body).forEach(b => b.addEventListener('click', () => updateQty(b.dataset.cid, Number(b.dataset.qty))));
    $$('[data-remove]', body).forEach(b => b.addEventListener('click', () => removeItem(b.dataset.remove)));
    $('#goCheckout').addEventListener('click', () => { state.checkoutStep = 2; renderCheckoutStep(); });
  }

  // ---------- Checkout (3 pasos dentro del drawer) ----------
  function renderCheckoutStep() {
    const body = $('#drawerBody');
    const foot = $('#drawerFoot');
    const s = state.checkoutStep;

    // stepper
    const stepperHTML = `
      <div class="stepper">
        <div class="stepper__dot ${s >= 2 ? 'is-done' : ''} ${s === 2 ? 'is-active' : ''}"></div>
        <div class="stepper__dot ${s >= 3 ? 'is-done' : ''} ${s === 3 ? 'is-active' : ''}"></div>
        <div class="stepper__dot ${s === 4 ? 'is-active' : ''}"></div>
      </div>
    `;

    if (s === 2) {
      // Datos + fecha
      const today = new Date().toISOString().split('T')[0];
      body.innerHTML = `
        ${stepperHTML}
        <div class="step is-active">
          <h2 class="step__title">Cuéntanos de ti</h2>
          <p class="step__hint">Esto nos ayuda a coordinar tu entrega sin fricción.</p>

          <div class="field">
            <label>Nombre completo</label>
            <input type="text" id="f-name" placeholder="Ej. María Pérez" value="${esc(state.customer.name)}">
          </div>
          <div class="field">
            <label>WhatsApp</label>
            <input type="tel" id="f-phone" placeholder="Ej. 3001234567" value="${esc(state.customer.phone)}">
          </div>
          <div class="field">
            <label>Dirección de entrega</label>
            <textarea id="f-address" placeholder="Calle 10 #5-23, Manga, Cartagena">${esc(state.customer.address)}</textarea>
          </div>
          <div class="field">
            <label>¿Cuándo lo quieres?</label>
            <input type="date" id="f-date" min="${today}" value="${esc(state.customer.date)}">
          </div>
        </div>
      `;
      foot.innerHTML = `
        <div class="step-nav">
          <button class="btn btn--ghost btn--back" id="step-back">Atrás</button>
          <button class="btn btn--dark" id="step-next">Continuar</button>
        </div>
      `;
      $('#step-back').addEventListener('click', () => { state.checkoutStep = 1; renderCartDrawer(); });
      $('#step-next').addEventListener('click', () => {
        const name = $('#f-name').value.trim();
        const phone = $('#f-phone').value.replace(/\s+/g, '').trim();
        const address = $('#f-address').value.trim();
        const date = $('#f-date').value;
        if (!name || !phone || !address || !date) {
          toast('Completa todos los campos');
          return;
        }
        if (!/^\+?\d{7,15}$/.test(phone)) {
          toast('Revisa el número de teléfono');
          return;
        }
        if (new Date(date) < new Date(today)) {
          toast('Elige una fecha válida');
          return;
        }
        Object.assign(state.customer, { name, phone, address, date });
        state.checkoutStep = 3;
        renderCheckoutStep();
      });
      return;
    }

    if (s === 3) {
      // Método de pago
      body.innerHTML = `
        ${stepperHTML}
        <div class="step is-active">
          <h2 class="step__title">¿Cómo vas a pagar?</h2>
          <p class="step__hint">Elige tu método favorito. Te damos los datos para transferir.</p>

          <div class="pay-options" id="payOptions">
            <label class="pay-option ${state.customer.payment === 'nequi' ? 'is-selected' : ''}" data-pay="nequi">
              <span class="pay-option__logo pay-option__logo--nequi">Nequi</span>
              <div class="pay-option__info">
                <div class="pay-option__name">Nequi</div>
                <div class="pay-option__meta">Transferencia al instante</div>
              </div>
              <span class="pay-option__radio"></span>
            </label>
            <label class="pay-option ${state.customer.payment === 'bancolombia' ? 'is-selected' : ''}" data-pay="bancolombia">
              <span class="pay-option__logo pay-option__logo--banco">BAN</span>
              <div class="pay-option__info">
                <div class="pay-option__name">Bancolombia</div>
                <div class="pay-option__meta">Cuenta de ahorros</div>
              </div>
              <span class="pay-option__radio"></span>
            </label>
            <label class="pay-option ${state.customer.payment === 'bre' ? 'is-selected' : ''}" data-pay="bre">
              <span class="pay-option__logo pay-option__logo--bre">Bre-B</span>
              <div class="pay-option__info">
                <div class="pay-option__name">Llave Bre-B</div>
                <div class="pay-option__meta">Pago inmediato interbancario</div>
              </div>
              <span class="pay-option__radio"></span>
            </label>
          </div>
        </div>
      `;
      foot.innerHTML = `
        <div class="step-nav">
          <button class="btn btn--ghost btn--back" id="step-back">Atrás</button>
          <button class="btn btn--dark" id="step-next">Revisar pedido</button>
        </div>
      `;
      $$('[data-pay]', body).forEach(opt => {
        opt.addEventListener('click', () => {
          state.customer.payment = opt.dataset.pay;
          renderCheckoutStep();
        });
      });
      $('#step-back').addEventListener('click', () => { state.checkoutStep = 2; renderCheckoutStep(); });
      $('#step-next').addEventListener('click', () => {
        if (!state.customer.payment) { toast('Elige un método de pago', 'warn'); return; }
        state.checkoutStep = 4;
        renderCheckoutStep();
      });
      return;
    }

    if (s === 4) {
      // Resumen final
      const { lines, subtotal } = computeCart();
      const payMethodLabel = { nequi: 'Nequi', bancolombia: 'Bancolombia', bre: 'Llave Bre-B' }[state.customer.payment];
      const dateStr = new Date(state.customer.date + 'T12:00:00').toLocaleDateString('es-CO', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
      body.innerHTML = `
        ${stepperHTML}
        <div class="step is-active">
          <h2 class="step__title">Casi listo 👀</h2>
          <p class="step__hint">Revisa los detalles y continúa al pago.</p>

          <div class="summary-block">
            <h4>📦 Tu pedido</h4>
            <ul>
              ${lines.map(line => `
                <li>
                  <span>
                    ${line.item.qty}× ${esc(line.product.name)}
                    ${line.toppings.length ? `<small>+ ${line.toppings.map(t => esc(t.name)).join(', ')}</small>` : ''}
                  </span>
                  <span>${formatCOP(line.total)}</span>
                </li>
              `).join('')}
            </ul>
          </div>

          <div class="summary-block">
            <h4>📅 Fecha de entrega</h4>
            <p>${esc(dateStr)}</p>
          </div>

          <div class="summary-block">
            <h4>📍 Datos de entrega</h4>
            <p><strong>${esc(state.customer.name)}</strong><br>${esc(state.customer.phone)}<br>${esc(state.customer.address)}</p>
          </div>

          <div class="summary-block">
            <h4>💳 Método de pago</h4>
            <p>${esc(payMethodLabel)}</p>
          </div>

          <div class="summary-block" style="background:var(--ink);color:#fff;border-color:var(--ink);">
            <h4 style="color:#fff;">💰 Total a pagar</h4>
            <p style="font-family:var(--font-display);font-size:28px;color:var(--brand-soft);font-weight:700;">
              ${formatCOP(subtotal)}
            </p>
          </div>
        </div>
      `;
      foot.innerHTML = `
        <div class="step-nav">
          <button class="btn btn--ghost btn--back" id="step-back">Atrás</button>
          <button class="btn btn--primary" id="step-pay">Pagar</button>
        </div>
      `;
      $('#step-back').addEventListener('click', () => { state.checkoutStep = 3; renderCheckoutStep(); });
      $('#step-pay').addEventListener('click', () => openPaymentModal());
    }
  }

  // ---------- Modal de pago final ----------
  const payModalEl = $('#paymentModal');

  function openPaymentModal() {
    const pay = DataAPI.getPayment();
    const method = state.customer.payment;
    const { subtotal } = computeCart();

    const methodData = {
      nequi: {
        title: 'Paga con Nequi',
        logo: 'Nequi',
        logoClass: 'pay-option__logo--nequi',
        label: 'Número Nequi',
        value: pay.nequi.account,
        holder: pay.nequi.holder,
        sub: 'Abre tu Nequi, transfiere y envíanos el comprobante.',
      },
      bancolombia: {
        title: 'Paga con Bancolombia',
        logo: 'BAN',
        logoClass: 'pay-option__logo--banco',
        label: `Cuenta ${pay.bancolombia.type}`,
        value: pay.bancolombia.account,
        holder: pay.bancolombia.holder,
        sub: 'Transferencia desde la app Bancolombia.',
      },
      bre: {
        title: 'Paga con Bre-B',
        logo: 'Bre-B',
        logoClass: 'pay-option__logo--bre',
        label: 'Llave Bre-B',
        value: pay.bre.key,
        holder: pay.bre.holder,
        sub: 'Pago inmediato desde cualquier banco afiliado.',
      },
    }[method];

    payModalEl.querySelector('.modal__panel').innerHTML = `
      <div class="modal__hero" style="aspect-ratio:16/7;background:linear-gradient(135deg, var(--ink), var(--brand-dark));">
        <span style="font-family:var(--font-display);color:#fff;font-size:28px;font-weight:700;letter-spacing:-0.01em;">${esc(methodData.title)}</span>
        <button class="modal__close" aria-label="Cerrar" data-close>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M6 6l12 12M18 6L6 18"/>
          </svg>
        </button>
      </div>
      <div class="modal__body">
        <div class="pay-info">
          <strong>Paso 1.</strong> Transfiere <strong>${formatCOP(subtotal)}</strong> a la siguiente cuenta.<br>
          <strong>Paso 2.</strong> Toca el botón para enviar tu pedido y comprobante por WhatsApp.
        </div>

        <div class="pay-data">
          <div class="pay-data__label">${esc(methodData.label)}</div>
          <div class="pay-data__value">
            <span id="payValue">${esc(methodData.value)}</span>
            <button class="pay-data__copy" id="copyBtn">Copiar</button>
          </div>
          <div class="pay-data__sub">A nombre de <strong style="color:#fff;">${esc(methodData.holder)}</strong></div>
        </div>

        <button class="btn btn--whatsapp" id="sendWA">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.34.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01s-.52.07-.8.37c-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.35.2 1.86.12.57-.08 1.76-.72 2-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35zM12 2C6.48 2 2 6.48 2 12c0 1.78.47 3.44 1.29 4.88L2 22l5.25-1.38A9.96 9.96 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
          </svg>
          Enviar pedido por WhatsApp
        </button>

        <p style="font-size:12px;color:var(--ink-4);text-align:center;margin-top:12px;">
          Una vez recibamos tu comprobante, confirmaremos tu pedido.
        </p>
      </div>
    `;

    payModalEl.classList.add('is-open');
    scrimEl.classList.add('is-open');
    scrimEl.dataset.closes = 'payment';
    document.body.style.overflow = 'hidden';

    payModalEl.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closePaymentModal));
    $('#copyBtn').addEventListener('click', () => {
      navigator.clipboard?.writeText(methodData.value);
      toast('Copiado al portapapeles ✓');
    });
    $('#sendWA').addEventListener('click', sendWhatsApp);
  }

  function closePaymentModal() {
    payModalEl.classList.remove('is-open');
    scrimEl.classList.remove('is-open');
    document.body.style.overflow = '';
    closeTracker();
  }

  // ---------- Generar mensaje WhatsApp ----------
  function buildWhatsAppMessage(code) {
    const { lines, subtotal } = computeCart();
    const c = state.customer;
    const payLabel = { nequi: 'Nequi', bancolombia: 'Bancolombia', bre: 'Llave Bre-B' }[c.payment] || '—';
    const dateStr = new Date(c.date + 'T12:00:00').toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    const itemLines = lines.map(line => {
      const base = `- ${line.item.qty}x ${line.product.name}`;
      if (line.toppings.length) {
        return `${base}\n  · Toppings: ${line.toppings.map(t => t.name).join(', ')}`;
      }
      return base;
    }).join('\n');

    return (
      `Hola, este es mi pedido:\n\n` +
      (code ? `🔖 Código de seguimiento: ${code}\n\n` : '') +
      `📦 Pedido:\n${itemLines}\n\n` +
      `📅 Fecha de entrega: ${dateStr}\n\n` +
      `👤 Nombre: ${c.name}\n` +
      `📞 Teléfono: ${c.phone}\n` +
      `📍 Dirección: ${c.address}\n\n` +
      `💳 Método de pago: ${payLabel}\n` +
      `💰 Total: ${formatCOP(subtotal)}\n\n` +
      `Adjunto mi comprobante de pago. ¡Gracias!`
    );
  }

  function sendWhatsApp() {
    const pay = DataAPI.getPayment();
    const { lines, subtotal } = computeCart();
    const c = state.customer;
    const payLabel = { nequi: 'Nequi', bancolombia: 'Bancolombia', bre: 'Llave Bre-B' }[c.payment] || '—';

    // Código corto para el cliente (5 chars alfanuméricos)
    const code = Math.random().toString(36).slice(2, 7).toUpperCase();
    const nowISO = new Date().toISOString();

    // 1) Registrar el pedido en el admin
    const order = {
      id: 'order-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      code,
      createdAt: nowISO,
      status: 'pending',
      timeline: { pending: nowISO },
      customer: {
        name: c.name,
        phone: c.phone,
        address: c.address,
      },
      deliveryDate: c.date,
      paymentMethod: c.payment,
      paymentLabel: payLabel,
      total: subtotal,
      items: lines.map(line => ({
        productId: line.product.id,
        productName: line.product.name,
        productEmoji: line.product.emoji || '🍽️',
        productImage: line.product.imageUrl || '',
        qty: line.item.qty,
        unitPrice: line.unit,
        lineTotal: line.total,
        toppings: line.toppings.map(t => ({ id: t.id, name: t.name, price: t.price || 0 })),
      })),
    };
    DataAPI.addOrder(order);

    // Guardar el código del último pedido en localStorage para que el cliente pueda consultarlo
    Store.set('bonnago_last_order_code', code);

    // 2) Abrir WhatsApp (con el código incluido en el mensaje)
    const msg = encodeURIComponent(buildWhatsAppMessage(code));
    const url = `https://wa.me/${pay.whatsapp}?text=${msg}`;
    window.open(url, '_blank');

    // 3) Reset + cerrar todo + mostrar pantalla de seguimiento
    setTimeout(() => {
      clearCart();
      state.checkoutStep = 1;
      state.customer = { name: '', phone: '', address: '', date: '', payment: '' };
      closePaymentModal();
      closeDrawer();
      // Abrir pantalla de seguimiento del pedido recién creado
      openTrackerByCode(code);
    }, 400);
  }

  // ---------- Tracker de pedido (cliente) ----------
  let trackerCode = null;
  let trackerInterval = null;
  const { ORDER_STATUSES, ORDER_STATUS_META } = window.BonnaGoData;

  function openTrackerByCode(code) {
    trackerCode = code;
    renderTracker();
    payModalEl.classList.add('is-open');
    scrimEl.classList.add('is-open');
    scrimEl.dataset.closes = 'payment'; // reusa el closer del modal de pago
    document.body.style.overflow = 'hidden';
    // Auto-refrescar cada 4s para reflejar cambios desde el admin
    if (trackerInterval) clearInterval(trackerInterval);
    trackerInterval = setInterval(() => {
      if (payModalEl.classList.contains('is-open') && trackerCode) renderTracker();
    }, 4000);
  }

  function closeTracker() {
    trackerCode = null;
    if (trackerInterval) { clearInterval(trackerInterval); trackerInterval = null; }
  }

  function openTrackerLookup() {
    payModalEl.querySelector('.modal__panel').innerHTML = `
      <div class="modal__hero" style="aspect-ratio:16/7;background:linear-gradient(135deg, var(--ink), var(--brand-dark));">
        <span style="font-family:var(--font-display);color:#fff;font-size:24px;font-weight:700;">🔖 Mi pedido</span>
        <button class="modal__close" aria-label="Cerrar" data-close>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M6 6l12 12M18 6L6 18"/>
          </svg>
        </button>
      </div>
      <div class="modal__body">
        <p class="step__hint" style="margin-bottom:16px;">Ingresa tu código de seguimiento para ver el estado de tu pedido.</p>
        <div class="field">
          <label>Código de pedido</label>
          <input id="trackerInput" type="text" placeholder="Ej. AB12C" maxlength="10" style="text-transform:uppercase;letter-spacing:0.1em;font-family:var(--font-display);font-size:18px;text-align:center;">
        </div>
        <button class="btn btn--primary" id="trackerLookupBtn">Buscar</button>
        <div id="trackerError" style="margin-top:12px;font-size:13px;color:var(--danger);text-align:center;display:none;"></div>
      </div>
    `;
    payModalEl.classList.add('is-open');
    scrimEl.classList.add('is-open');
    scrimEl.dataset.closes = 'payment';
    document.body.style.overflow = 'hidden';

    payModalEl.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closePaymentModal));

    const lastCode = Store.get('bonnago_last_order_code', null);
    if (lastCode) $('#trackerInput').value = lastCode;
    $('#trackerInput').focus();
    $('#trackerInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); $('#trackerLookupBtn').click(); }
    });
    $('#trackerLookupBtn').addEventListener('click', () => {
      const code = $('#trackerInput').value.trim().toUpperCase();
      const order = DataAPI.findOrderByCode(code);
      if (!order) {
        const err = $('#trackerError');
        err.textContent = 'No encontramos un pedido con ese código.';
        err.style.display = 'block';
        return;
      }
      openTrackerByCode(order.code);
    });
  }

  function renderTracker() {
    if (!trackerCode) return;
    const order = DataAPI.findOrderByCode(trackerCode);
    if (!order) {
      payModalEl.querySelector('.modal__panel').innerHTML = `
        <div class="modal__body" style="text-align:center; padding:40px 24px;">
          <div style="font-size:48px;">🔍</div>
          <p style="margin:14px 0;">Pedido no encontrado.</p>
          <button class="btn btn--ghost" data-close>Cerrar</button>
        </div>
      `;
      payModalEl.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closePaymentModal));
      return;
    }

    const meta = ORDER_STATUS_META[order.status] || ORDER_STATUS_META.pending;
    const isCancelled = order.status === 'cancelled';
    const flowStatuses = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];
    const currentStep = meta.step;

    const stepsHTML = flowStatuses.map((s, i) => {
      const m = ORDER_STATUS_META[s];
      const ts = order.timeline?.[s];
      const isDone = !isCancelled && currentStep >= i;
      const isCurrent = !isCancelled && currentStep === i;
      return `
        <div class="track-step ${isDone ? 'is-done' : ''} ${isCurrent ? 'is-current' : ''}">
          <div class="track-step__bullet">${m.icon}</div>
          <div class="track-step__content">
            <div class="track-step__label">${m.short}</div>
            ${ts ? `<div class="track-step__time">${formatTrackerTime(ts)}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    const itemsHTML = order.items.map(it => `
      <li>
        <div>
          <strong>${it.qty}× ${esc(it.productName)}</strong>
          ${it.toppings.length ? `<small>+ ${it.toppings.map(t => esc(t.name)).join(', ')}</small>` : ''}
        </div>
        <span>${formatCOP(it.lineTotal)}</span>
      </li>
    `).join('');

    payModalEl.querySelector('.modal__panel').innerHTML = `
      <div class="modal__hero ${isCancelled ? 'tracker__hero--cancel' : 'tracker__hero'}">
        <div class="tracker__hero-top">
          <span class="tracker__code">Código <strong>${esc(order.code)}</strong></span>
          <button class="modal__close" aria-label="Cerrar" data-close>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M6 6l12 12M18 6L6 18"/>
            </svg>
          </button>
        </div>
        <div class="tracker__status-icon">${meta.icon}</div>
        <div class="tracker__status-label">${meta.short}</div>
        <div class="tracker__status-msg">${esc(meta.cust)}</div>
      </div>
      <div class="modal__body">
        ${isCancelled ? '' : `
          <div class="track-steps">${stepsHTML}</div>
        `}

        <div class="summary-block">
          <h4>📦 Tu pedido</h4>
          <ul>${itemsHTML}</ul>
          <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid var(--line);margin-top:8px;font-weight:700;">
            <span>Total</span>
            <span>${formatCOP(order.total)}</span>
          </div>
        </div>

        <div class="summary-block">
          <h4>📍 Entrega</h4>
          <p>${esc(order.customer.address)}</p>
          <p style="font-size:12px;color:var(--ink-3);margin-top:4px;">${esc(order.customer.name)} · ${esc(order.customer.phone)}</p>
        </div>

        <button class="btn btn--ghost" data-close style="margin-top:8px;">Cerrar</button>
      </div>
    `;

    payModalEl.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closePaymentModal));
  }

  function formatTrackerTime(iso) {
    try {
      const d = new Date(iso);
      const today = new Date();
      const sameDay = d.toDateString() === today.toDateString();
      return sameDay
        ? d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  }


  // ---------- Drawer ----------
  const drawerEl = $('#drawer');

  function openDrawer() {
    renderCartDrawer();
    drawerEl.classList.add('is-open');
    scrimEl.classList.add('is-open');
    scrimEl.dataset.closes = 'drawer';
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawerEl.classList.remove('is-open');
    scrimEl.classList.remove('is-open');
    document.body.style.overflow = '';
    state.checkoutStep = 1; // resetear flujo al cerrar
  }

  // ---------- Toast ----------
  let toastTimer;
  function toast(message) {
    const el = $('#toast');
    el.querySelector('.toast__msg').textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2200);
  }

  // ---------- Banner dinámico ----------
  // ---------- Carrusel de promociones ----------
  let promoIndex = 0;
  let promoAutoTimer = null;

  function renderPromotionsCarousel() {
    const promos = DataAPI.getActivePromotions();
    const track = $('#promoTrack');
    const dots = $('#promoDots');
    if (!track) return;

    if (promos.length === 0) {
      // Fallback: mostrar el banner único si no hay promos
      const b = DataAPI.getBanner();
      promos.push({
        id: 'banner-default',
        title: b.title,
        titleHighlight: b.titleHighlight,
        description: b.description,
        ctaLabel: b.ctaLabel,
        imageUrl: b.imageUrl,
        badge: '',
      });
    }

    track.innerHTML = promos.map((p, i) => {
      let titleHTML = esc(p.title || '');
      if (p.titleHighlight && p.title && p.title.includes(p.titleHighlight)) {
        const parts = p.title.split(p.titleHighlight);
        titleHTML = `${esc(parts[0])}<em>${esc(p.titleHighlight)}</em>${esc(parts.slice(1).join(p.titleHighlight))}`;
      }
      const visualHTML = p.imageUrl
        ? `<div class="promo-slide__visual"><img class="promo-slide__photo" src="${esc(p.imageUrl)}" alt=""></div>`
        : `<div class="promo-slide__visual">
             <div class="hero__blob"></div>
             <div class="hero__plate"></div>
             <div class="hero__sprinkles"><span></span><span></span><span></span><span></span></div>
           </div>`;
      return `
        <article class="promo-slide" data-idx="${i}">
          <div class="promo-slide__content">
            ${p.badge ? `<div class="promo-slide__badge">${esc(p.badge)}</div>` : `<div class="promo-slide__eyebrow">BonnaGo · Cartagena</div>`}
            <h1 class="promo-slide__title">${titleHTML}</h1>
            <p class="promo-slide__desc">${esc(p.description || '')}</p>
            <button class="promo-slide__cta" data-promo-cta>
              ${esc(p.ctaLabel || 'Ver más')}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
          ${visualHTML}
        </article>
      `;
    }).join('');

    dots.innerHTML = promos.map((_, i) => `
      <button class="promo-carousel__dot ${i === promoIndex ? 'is-active' : ''}" data-dot="${i}" aria-label="Ir a slide ${i+1}"></button>
    `).join('');

    // Bind dots
    $$('[data-dot]', dots).forEach(d => d.addEventListener('click', () => {
      promoIndex = Number(d.dataset.dot);
      updateCarousel();
      restartAutoplay();
    }));

    // Bind CTAs (cualquier slide)
    $$('[data-promo-cta]', track).forEach(btn => btn.addEventListener('click', () => {
      $('#products').scrollIntoView({ behavior: 'smooth' });
    }));

    // Nav buttons
    $('#promoPrev')?.addEventListener('click', () => {
      promoIndex = (promoIndex - 1 + promos.length) % promos.length;
      updateCarousel();
      restartAutoplay();
    });
    $('#promoNext')?.addEventListener('click', () => {
      promoIndex = (promoIndex + 1) % promos.length;
      updateCarousel();
      restartAutoplay();
    });

    // Touch swipe
    let startX = 0, deltaX = 0;
    track.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX; deltaX = 0;
    }, { passive: true });
    track.addEventListener('touchmove', (e) => {
      deltaX = e.touches[0].clientX - startX;
    }, { passive: true });
    track.addEventListener('touchend', () => {
      if (Math.abs(deltaX) > 50) {
        if (deltaX < 0) promoIndex = (promoIndex + 1) % promos.length;
        else promoIndex = (promoIndex - 1 + promos.length) % promos.length;
        updateCarousel();
        restartAutoplay();
      }
    });

    updateCarousel();
    restartAutoplay();

    function updateCarousel() {
      track.style.transform = `translateX(-${promoIndex * 100}%)`;
      $$('[data-dot]', dots).forEach((d, i) => d.classList.toggle('is-active', i === promoIndex));
    }
    function restartAutoplay() {
      if (promoAutoTimer) clearInterval(promoAutoTimer);
      if (promos.length > 1) {
        promoAutoTimer = setInterval(() => {
          promoIndex = (promoIndex + 1) % promos.length;
          updateCarousel();
        }, 6000);
      }
    }
  }

  // ---------- Bottom nav (mobile) ----------
  function setupBottomNav() {
    const items = $$('.bottom-nav__item');
    items.forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        items.forEach(i => i.classList.toggle('is-active', i === item));

        if (tab === 'home') {
          // Volver al carrusel
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          // Filtrar por categoría y scrollear a productos
          state.activeCategory = tab;
          renderCategories();
          renderProducts();
          // Pequeño delay para que el render termine
          setTimeout(() => {
            $('#products').scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 50);
        }
      });
    });

    // Cuando el usuario hace scroll manual, marcar "Inicio" si está arriba
    let scrollTimer;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        if (window.scrollY < 100) {
          items.forEach(i => i.classList.toggle('is-active', i.dataset.tab === 'home'));
        }
      }, 100);
    }, { passive: true });
  }

  // ---------- Bind global ----------
  function init() {
    renderPromotionsCarousel();
    renderCategories();
    renderProducts();
    renderCartBar();
    setupBottomNav();

    $('#cartBtn').addEventListener('click', openDrawer);
    $('#cartBar').addEventListener('click', openDrawer);
    $('#drawerClose').addEventListener('click', closeDrawer);
    const trackBtn = $('#trackBtn');
    if (trackBtn) trackBtn.addEventListener('click', openTrackerLookup);

    scrimEl.addEventListener('click', () => {
      if (scrimEl.dataset.closes === 'payment') closePaymentModal();
      else if (scrimEl.dataset.closes === 'modal') closeProductModal();
      else closeDrawer();
    });

    // ESC cierra
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (payModalEl.classList.contains('is-open')) closePaymentModal();
        else if (modalEl.classList.contains('is-open')) closeProductModal();
        else if (drawerEl.classList.contains('is-open')) closeDrawer();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
