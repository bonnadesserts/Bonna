// =======================================================
// BonnaGo — DATOS (productos + categorías + config pagos)
// En producción esto vendría de la API / admin panel.
// =======================================================

const STORAGE_KEYS = {
  products: 'bonnago_products_v2',
  categories: 'bonnago_categories_v1',
  toppings: 'bonnago_toppings_v2',
  promotions: 'bonnago_promotions_v1',
  cart: 'bonnago_cart_v1',
  orders: 'bonnago_orders_v1',
  ordersUnread: 'bonnago_orders_unread_v1',
  banner: 'bonnago_banner_v1',
  adminSession: 'bonnago_admin_session_v1',
  adminUsers: 'bonnago_admin_users_v1',
  payment: 'bonnago_payment_v1',
};

const DEFAULT_CATEGORIES = [
  { id: 'cat-tortas',   name: 'Tortas',   emoji: '🍰' },
  { id: 'cat-jars',     name: 'Jars',     emoji: '🍮' },
  { id: 'cat-porciones', name: 'Galletas', emoji: '🍪' },
];

// Categorías fijas de toppings
const TOPPING_CATEGORIES = [
  { id: 'sauce',  name: 'Salsas',  emoji: '🍯' },
  { id: 'fruit',  name: 'Frutas',  emoji: '🍓' },
  { id: 'other',  name: 'Otros',   emoji: '✨' },
];

// Catálogo GLOBAL de toppings — el admin los crea aquí
// y luego los asigna a los productos que permitan toppings.
const DEFAULT_TOPPINGS = [
  { id: 't-fresa',    name: 'Fresa natural',   emoji: '🍓', price: 0,    grams: 30, category: 'fruit' },
  { id: 't-arequipe', name: 'Arequipe',        emoji: '🍯', price: 0,    grams: 25, category: 'sauce' },
  { id: 't-oreo',     name: 'Oreo crunch',     emoji: '🍪', price: 2000, grams: 20, category: 'other' },
  { id: 't-almendra', name: 'Almendras',       emoji: '🌰', price: 2000, grams: 15, category: 'other' },
  { id: 't-coco',     name: 'Coco rallado',    emoji: '🥥', price: 1500, grams: 10, category: 'other' },
  { id: 't-nueces',   name: 'Nueces',          emoji: '🌰', price: 2000, grams: 15, category: 'other' },
  { id: 't-malv',     name: 'Malvaviscos',     emoji: '🍡', price: 1500, grams: 15, category: 'other' },
  { id: 't-crema',    name: 'Crema chantilly', emoji: '🍦', price: 2000, grams: 30, category: 'sauce' },
  { id: 't-choco',    name: 'Chocolate líquido', emoji: '🍫', price: 1500, grams: 20, category: 'sauce' },
  { id: 't-banano',   name: 'Banano',          emoji: '🍌', price: 1000, grams: 25, category: 'fruit' },
  { id: 't-mora',     name: 'Mora',            emoji: '🫐', price: 1500, grams: 25, category: 'fruit' },
];

// Promociones para el home (carrusel)
const DEFAULT_PROMOTIONS = [
  {
    id: 'promo-1',
    title: 'Pide tus postres favoritos listos en un día',
    titleHighlight: 'listos en un día',
    description: 'Artesanales, frescos y hechos el día que los necesitas. Elige tu fecha de entrega y paga fácil vía WhatsApp.',
    ctaLabel: 'Pide ahora',
    imageUrl: '',
    badge: '',
    active: true,
  },
  {
    id: 'promo-2',
    title: 'Cheesecakes con 10% OFF esta semana',
    titleHighlight: '10% OFF',
    description: 'Aprovecha descuentos en nuestros cheesecakes seleccionados. Solo por tiempo limitado.',
    ctaLabel: 'Ver oferta',
    imageUrl: '',
    badge: 'Oferta',
    active: true,
  },
  {
    id: 'promo-3',
    title: 'Jars del día desde $18.000',
    titleHighlight: '$18.000',
    description: 'Postres en frasco listos para llevar. Sabores únicos, porciones generosas.',
    ctaLabel: 'Ver jars',
    imageUrl: '',
    badge: 'Nuevo',
    active: true,
  },
];

const DEFAULT_PRODUCTS = [
 const DEFAULT_PRODUCTS = [
  {
    id: 'p-1',
    name: 'Torta Bonnav (1 LB)',
    categoryId: 'cat-tortas',
    price: 53990,
    discount: 0,
    emoji: '🥕',
    description: 'Suave, reconfortante y hecha para compartir. Ideal para esas pausas que se alargan y los momentos que se recuerdan.',
    allowsToppings: false,
    toppingIds: [],
    tag: 'Favorita',
  },
  {
    id: 'p-2',
    name: 'Bonnav Jar (9 Onz)',
    categoryId: 'cat-jars',
    price: 10000,
    discount: 0,
    emoji: '🥕',
    description: 'Suave y reconfortante. Ideal para esos momentos que se alargan sin darte cuenta.',
    allowsToppings: false,
    toppingIds: [],
    tag: 'Favorita',
  },
];

const DEFAULT_PAYMENT = {
  nequi:       { account: '3001234567', holder: 'BonnaGo' },
  bancolombia: { account: '12345678901', holder: 'BonnaGo', type: 'Ahorros' },
  bre:         { key:     'pago@bonnago.co', holder: 'BonnaGo' },
  whatsapp:    '573001234567', // sin el +, formato wa.me
};

const DEFAULT_BANNER = {
  eyebrow: 'BonnaGo · Cartagena',
  title: 'Pide tus postres favoritos listos en un día.',
  titleHighlight: 'listos en un día', // se renderiza en lila dentro del title
  description: 'Artesanales, frescos y hechos el día que los necesitas. Elige tu fecha de entrega y paga fácil vía WhatsApp.',
  ctaLabel: 'Pide ahora',
  imageUrl: '', // si está vacío se muestra la decoración por defecto
};

// Estados del pedido — orden lineal
const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];
const ORDER_STATUS_META = {
  pending:   { label: 'Pendiente de pago',   short: 'Pendiente',   icon: '⏳', cust: 'Esperando confirmación de pago', step: 0 },
  confirmed: { label: 'Pago confirmado',     short: 'Confirmado',  icon: '✅', cust: '¡Recibimos tu pago! Pronto empezaremos a preparar tu pedido', step: 1 },
  preparing: { label: 'Preparando',          short: 'Preparando',  icon: '👩‍🍳', cust: 'Estamos preparando tu pedido con amor', step: 2 },
  shipped:   { label: 'Enviado',             short: 'Enviado',     icon: '🛵', cust: '¡Tu pedido salió! Va en camino', step: 3 },
  delivered: { label: 'Entregado',           short: 'Entregado',   icon: '📦', cust: '¡Tu pedido fue entregado! Gracias por tu compra', step: 4 },
  cancelled: { label: 'Cancelado',           short: 'Cancelado',   icon: '❌', cust: 'Este pedido fue cancelado', step: -1 },
};

const DEFAULT_ADMIN = {
  // credenciales por defecto para demo — en producción hashear
  email: 'admin@bonnago.co',
  password: 'bonnago123',
};

// ---------- Storage helpers ----------
const Store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
  remove(key) { localStorage.removeItem(key); },
};

// ---------- API de datos (unifica storage + defaults) ----------
const DataAPI = {
  getProducts()   { return Store.get(STORAGE_KEYS.products, DEFAULT_PRODUCTS); },
  setProducts(p)  { Store.set(STORAGE_KEYS.products, p); },
  getCategories() { return Store.get(STORAGE_KEYS.categories, DEFAULT_CATEGORIES); },
  setCategories(c){ Store.set(STORAGE_KEYS.categories, c); },
  getToppings()   { return Store.get(STORAGE_KEYS.toppings, DEFAULT_TOPPINGS); },
  setToppings(t)  { Store.set(STORAGE_KEYS.toppings, t); },
  getPayment()    { return Store.get(STORAGE_KEYS.payment, DEFAULT_PAYMENT); },
  setPayment(p)   { Store.set(STORAGE_KEYS.payment, p); },
  getAdminUsers() {
    return Store.get(STORAGE_KEYS.adminUsers, [DEFAULT_ADMIN]);
  },
  setAdminUsers(u){ Store.set(STORAGE_KEYS.adminUsers, u); },

  // Pedidos
  getOrders()     { return Store.get(STORAGE_KEYS.orders, []); },
  setOrders(o)    { Store.set(STORAGE_KEYS.orders, o); },
  addOrder(order) {
    const orders = this.getOrders();
    orders.unshift(order); // más nuevo primero
    this.setOrders(orders);
    // marcar como sin leer
    const unread = Store.get(STORAGE_KEYS.ordersUnread, []);
    unread.push(order.id);
    Store.set(STORAGE_KEYS.ordersUnread, unread);
  },
  getUnreadOrderIds() { return Store.get(STORAGE_KEYS.ordersUnread, []); },
  markOrderRead(id) {
    const unread = Store.get(STORAGE_KEYS.ordersUnread, []).filter(x => x !== id);
    Store.set(STORAGE_KEYS.ordersUnread, unread);
  },
  markAllOrdersRead() { Store.set(STORAGE_KEYS.ordersUnread, []); },
  updateOrder(id, patch) {
    const orders = this.getOrders().map(o => o.id === id ? { ...o, ...patch } : o);
    this.setOrders(orders);
  },
  // Cambiar estado registrando timestamp en el timeline
  setOrderStatus(id, status) {
    const orders = this.getOrders().map(o => {
      if (o.id !== id) return o;
      const timeline = { ...(o.timeline || {}) };
      timeline[status] = new Date().toISOString();
      return { ...o, status, timeline };
    });
    this.setOrders(orders);
  },
  // Búsqueda case-insensitive por código corto (los últimos 5 chars del id) o teléfono
  findOrderByCode(query) {
    if (!query) return null;
    const q = query.trim().toLowerCase();
    const orders = this.getOrders();
    return orders.find(o =>
      o.code?.toLowerCase() === q ||
      o.id.toLowerCase().endsWith(q) ||
      o.customer.phone === q
    );
  },
  deleteOrder(id) {
    this.setOrders(this.getOrders().filter(o => o.id !== id));
    this.markOrderRead(id);
  },

  // Banner
  getBanner()     { return Store.get(STORAGE_KEYS.banner, DEFAULT_BANNER); },
  setBanner(b)    { Store.set(STORAGE_KEYS.banner, b); },

  // Promociones (carrusel del home)
  getPromotions()    { return Store.get(STORAGE_KEYS.promotions, DEFAULT_PROMOTIONS); },
  setPromotions(p)   { Store.set(STORAGE_KEYS.promotions, p); },
  getActivePromotions() {
    return this.getPromotions().filter(p => p.active !== false);
  },

  // Dado un producto, devuelve los objetos topping completos que tiene asignados.
  // Ignora toppingIds que ya no existan (por ejemplo si el admin eliminó el topping).
  resolveProductToppings(product) {
    if (!product || !product.allowsToppings) return [];
    const all = this.getToppings();
    const ids = product.toppingIds || [];
    return ids
      .map(id => all.find(t => t.id === id))
      .filter(Boolean);
  },
};

// ---------- Formato COP ----------
const formatCOP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

// ---------- Calcula precio con descuento ----------
const productPrice = (p) => {
  const d = Number(p.discount) || 0;
  return Math.round(p.price * (1 - d / 100));
};

// Expose globals
window.BonnaGoData = { STORAGE_KEYS, DataAPI, formatCOP, productPrice, Store, ORDER_STATUSES, ORDER_STATUS_META, TOPPING_CATEGORIES };
// Alias por compatibilidad con app.js / admin.js existentes
window.DulceData = window.BonnaGoData;
