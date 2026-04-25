# BonnaGo · Plataforma de pedidos

Plataforma web responsiva para captura de pedidos de alimentos, optimizada para cierre vía WhatsApp. HTML + CSS + JS vanilla, sin frameworks.

## Estructura

```
dulce/
├── index.html          # Tienda (cliente)
├── css/
│   └── styles.css      # Sistema de diseño compartido
├── js/
│   ├── data.js         # Datos, storage, helpers
│   └── app.js          # Lógica del cliente (carrito, checkout, WhatsApp)
└── admin/
    ├── index.html      # Login + panel admin
    ├── admin.css       # Estilos del panel
    └── admin.js        # Lógica CRUD
```

> La carpeta raíz se llama `dulce/` por el nombre interno del proyecto — puedes renombrarla libremente, no afecta el funcionamiento.

## Identidad visual

- **Marca:** BonnaGo
- **Color principal:** `#0B2465` (azul marino)
- **Color base:** `#FFFFFF` (blanco)
- **Acentos:** `#C7C7EA` (lila suave) y `#000000` (negro)
- **Tipografía:** Poppins (400, 500, 600, 700, 800)

## Cómo ejecutar

**Opción A — Doble click:** abre `dulce/index.html` directamente en el navegador. Funciona todo.

**Opción B — Servidor local** (recomendado para pruebas más fieles a producción):
```bash
cd dulce
python3 -m http.server 8000
# Luego abre http://localhost:8000
```

## Uso del cliente

1. Navega el menú filtrando por categorías
2. Toca el `+` en un producto para abrir el modal
3. Elige toppings opcionales y cantidad, confirma
4. La barra inferior aparece con tu total — tócala para ver el carrito
5. Finaliza el pedido: datos → método de pago → resumen → pagar
6. En el modal de pago copias los datos, pagas externamente y tocas **"Enviar pedido por WhatsApp"**

El mensaje se abre automáticamente en WhatsApp con todo el resumen estructurado.

## Panel admin

Accede a `/admin/` o toca **"Admin"** en el nav.

**Credenciales demo:**
- Email: `admin@bonnago.co`
- Contraseña: `bonnago123`

Desde el panel puedes:
- **Dashboard:** estadísticas rápidas, accesos a crear productos/categorías y restaurar datos de ejemplo
- **Productos:** CRUD completo, con editor dinámico de toppings y descuento %
- **Categorías:** CRUD (no permite borrar si hay productos asignados)
- **Pagos:** configurar datos de Nequi, Bancolombia, Bre-B y el número de WhatsApp
- **Admins:** crear nuevos administradores o cambiar contraseñas

Los cambios se reflejan inmediatamente en el frontend (localStorage).

## Personalización rápida

- **Paleta:** variables CSS al inicio de `styles.css` (`--ink`, `--brand-soft`, `--bg`, etc.)
- **Tipografía:** cambia el import de Google Fonts y las variables `--font-display` / `--font-body`
- **Datos por defecto:** edita `DEFAULT_PRODUCTS`, `DEFAULT_CATEGORIES`, `DEFAULT_PAYMENT` en `js/data.js`

## Notas técnicas

- **Persistencia:** usa `localStorage` para carrito, productos, categorías, configuración de pagos y sesión admin (prefijo `bonnago_`)
- **Sin dependencias:** solo Google Fonts (Poppins)
- **Responsive:** mobile-first, breakpoints en 860px y 420px
- **Accesibilidad:** `aria-label` en botones icono, focus-visible estilizado, navegación por teclado (ESC cierra modales)
- **Seguridad del admin:** autenticación básica en cliente para demo. Para producción, mueve login a un backend real y hashea las contraseñas.

## Flujo del mensaje WhatsApp

El mensaje generado tiene este formato:

```
Hola, este es mi pedido:

📦 Pedido:
- 1x Torta de zanahoria
- 1x Jars de chocolate
  · Toppings: Fresa natural, Arequipe

📅 Fecha de entrega: viernes, 25 de diciembre de 2026

👤 Nombre: María Pérez
📞 Teléfono: 3001234567
📍 Dirección: Cra 7 #10-23, Cartagena

💳 Método de pago: Nequi
💰 Total: $ 83.000

Adjunto mi comprobante de pago. ¡Gracias!
```

Se envía vía `https://wa.me/<número>?text=<mensaje_encoded>` — URL oficial de WhatsApp.
