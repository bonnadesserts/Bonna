# BonnaGo — Plataforma de pedidos para Cartagena

Tienda online sin backend para hacer pedidos vía WhatsApp. Toda la información se gestiona desde el panel de administración y se guarda en el navegador (localStorage).

---

## 🚀 Despliegue en GitHub Pages

### 1. Crea un repositorio en GitHub

1. Ve a [github.com/new](https://github.com/new)
2. Nombre del repo: `bonnago` (o el que prefieras)
3. Visibilidad: **Public** (GitHub Pages gratis solo funciona en repos públicos)
4. Crea el repo (sin README ni .gitignore)

### 2. Sube el código desde tu computador

Abre una terminal en la carpeta `bonnago/` y ejecuta:

```bash
git init
git add .
git commit -m "BonnaGo — versión inicial"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/bonnago.git
git push -u origin main
```

Reemplaza `TU-USUARIO` por tu usuario de GitHub.

### 3. Activa GitHub Pages

1. En tu repo, ve a **Settings → Pages**
2. En **Source**, selecciona `Deploy from a branch`
3. Branch: `main`, Folder: `/ (root)`
4. Guarda. En 1-2 minutos tu sitio estará en:

   ```
   https://TU-USUARIO.github.io/bonnago/
   ```

### 4. Comparte la URL con tus clientes

- **Tienda:** `https://TU-USUARIO.github.io/bonnago/`
- **Admin:** `https://TU-USUARIO.github.io/bonnago/admin/`

---

## 🔐 Credenciales del admin (cámbialas)

Por defecto:
- **Usuario:** `admin@bonnago.co`
- **Contraseña:** `bonnago123`

Para cambiarlas, abre `js/data.js` y edita `DEFAULT_ADMIN`. También puedes crear más admins desde la sección Admins una vez logueado.

---

## ⚙️ Configurar tu WhatsApp y datos de pago

Una vez desplegado, entra al panel admin y ve a **Pagos**. Allí configuras:
- Número de WhatsApp del negocio (donde llegan los pedidos)
- Datos de Nequi
- Datos de Bancolombia
- Llave Bre-B

Sin esto, los pedidos no podrán enviarse correctamente.

---

## ⚠️ Limitación crítica: localStorage

**Los datos se guardan en el navegador del usuario, no en un servidor compartido.**

Esto significa que:
- ✅ El admin ve sus productos, pedidos y clientes desde su navegador
- ❌ Si un cliente entra desde otro dispositivo, **no verá los productos** que creaste en otro
- ❌ Los pedidos que haga un cliente desde su celular **no aparecen** en el admin de otro dispositivo
- ❌ Modo incógnito tiene su propio localStorage vacío

Para que la tienda funcione **como una tienda real** (datos compartidos entre todos), necesitas migrar a un backend. Las opciones recomendadas son:

- **Firebase** (https://firebase.google.com/) — gratis hasta cierto uso
- **Supabase** (https://supabase.com/) — alternativa open-source

La migración requiere modificar `js/data.js` para que en lugar de leer/escribir `localStorage`, llame a la API de Firebase/Supabase. Es trabajo de un desarrollador.

---

## 🧱 Estructura del proyecto

```
bonnago/
├── index.html              # Tienda (cliente)
├── admin/
│   ├── index.html          # Panel admin
│   ├── admin.js
│   └── admin.css
├── css/
│   └── styles.css
├── js/
│   ├── data.js             # Datos por defecto + API localStorage
│   └── app.js
└── README.md
```

---

## 🎨 Funcionalidades incluidas

### Cliente (tienda)
- Carrusel de promociones en el home
- Bottom nav flotante mobile (Inicio / Tortas / Jars / Porciones)
- Selector de tamaños con precios diferentes
- Toppings agrupados por categoría (Salsas / Frutas / Otros)
- Checkout en 3 pasos
- Regla de fecha entrega: Tortas requieren mínimo 2 días
- Pedido se envía por WhatsApp con código de seguimiento
- Tracker en tiempo real para que el cliente vea el estado

### Admin
- Dashboard con stats, gráfica de barras (pedidos por día/semana/mes/año) y de torta (productos más vendidos)
- Pedidos: vista lista o cards, filtros por estado, total acumulado al pie
- Workflow: pendiente → confirmado → preparando → enviado → entregado
- Productos: vista lista o cards, CRUD, sizes, toppings, imágenes, clonar
- Toppings: CRUD con categorías
- Promociones, Categorías, Banner, Pagos, Admins

---

## 📝 Licencia

Uso personal y comercial libre. Hecho con ❤️ para BonnaGo · Cartagena.
