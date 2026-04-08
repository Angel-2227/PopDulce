# PopDulce – Guía de configuración

## Estructura del proyecto

```
popdulce/
├── index.html              ← Tienda pública
├── admin.html              ← Panel de administración
├── _redirects              ← Cloudflare Pages routing
├── css/
│   ├── main.css
│   ├── catalog.css
│   └── admin.css
├── js/
│   ├── firebase-config.js  ← ⚠️ EDITAR con tus credenciales
│   ├── catalog.js
│   ├── stories.js
│   └── admin.js
└── assets/
    └── logo.png
```

---

## 1. Firebase: crear proyecto

1. Ve a https://console.firebase.google.com → **Agregar proyecto**
2. Nombre: `popdulce`
3. Desactiva Google Analytics (opcional) → **Crear proyecto**

---

## 2. Firestore

1. Panel izquierdo → **Firestore Database** → **Crear base de datos**
2. Modo producción → región: `southamerica-east1` → **Habilitar**

### Reglas (ya las tienes configuradas)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /products/{docId} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.token.email in [
          'rubioquirozailyn@gmail.com',
          'juanrubio2277@gmail.com'
        ];
    }
    match /stories/{docId} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.token.email in [
          'rubioquirozailyn@gmail.com',
          'juanrubio2277@gmail.com'
        ];
    }
    match /orders/{docId} {
      allow create: if true;
      allow read, update, delete: if request.auth != null
        && request.auth.token.email in [
          'rubioquirozailyn@gmail.com',
          'juanrubio2277@gmail.com'
        ];
    }
  }
}
```

---

## 3. Authentication

1. Panel → **Authentication** → **Comenzar**
2. Activa **Correo/Contraseña**
3. (Opcional) Activa **Google**
4. Pestaña **Users** → **Agregar usuario**:
   - `rubioquirozailyn@gmail.com` + contraseña
   - `juanrubio2277@gmail.com` + contraseña

---

## 4. Credenciales de la app

1. ⚙️ **Configuración del proyecto** → **Tus apps** → **Web** (`</>`)
2. Nombre: `popdulce-web` → registrar
3. Copia el objeto `firebaseConfig` que aparece
4. Pégalo en `js/firebase-config.js`:

```js
const FIREBASE_CONFIG = {
  apiKey:            "...",
  authDomain:        "popdulce.firebaseapp.com",
  projectId:         "popdulce",
  storageBucket:     "...",
  messagingSenderId: "...",
  appId:             "..."
};
```

> ⚠️ La configuración actual en el archivo ya es real. Si creaste un proyecto diferente, reemplázala.

---

## 5. Imágenes (sin Firebase Storage)

### Google Drive ⭐ recomendado
1. Sube la imagen → clic derecho → **Compartir** → "Cualquier persona con el enlace"
2. Copia el enlace tal cual, ej:
   `https://drive.google.com/file/d/1Nm6B5LX.../view?usp=drive_link`
3. Pégalo en el campo "URL de imagen" del admin. La conversión a
   `https://lh3.googleusercontent.com/d/FILE_ID` se hace automáticamente.

### Imgur
1. https://imgur.com/upload → sube → clic derecho en la imagen → **Copiar dirección de imagen**

### Cloudinary (25 GB gratis)
1. https://cloudinary.com → crear cuenta → subir desde el dashboard

---

## 6. Despliegue en Cloudflare Pages

### Opción A – GitHub (recomendada para actualizaciones continuas)
1. Sube la carpeta `popdulce/` a un repositorio GitHub
2. https://pages.cloudflare.com → **Crear aplicación** → **Conectar a Git**
3. Selecciona el repo
4. Build settings:
   - **Framework preset:** None
   - **Build command:** (vacío)
   - **Build output directory:** `/`
5. **Save and Deploy**

### Opción B – Subida directa
1. https://pages.cloudflare.com → **Crear aplicación** → **Carga directa**
2. Arrastra la carpeta `popdulce/`

---

## 7. Categorías de productos

Las categorías se crean al escribirlas en el campo "Categoría" del formulario de producto en el admin. Cuando ya existen categorías, el campo muestra sugerencias automáticas. No hay que crearlas por separado.

---

## 8. Ajustar distribución de ganancias

En `js/admin.js`, función `loadAnalytics()`:

```js
const pctAilyn  = 0.5;   // ← 50%
const pctSamuel = 0.5;   // ← 50%
```

Cambia los valores según lo acordado (deben sumar 1).

---

## 9. Números de WhatsApp

- **Ailyn (pedidos):** 319 369 6869 → `WA_AILYN = '573193696869'`
- **Samuel:** 316 771 9181 → `WA_SAMUEL = '573167719181'`

Los pedidos de clientes van al número de Ailyn. Para cambiarlos, edita las constantes `WA_AILYN` y `WA_SAMUEL` en `js/catalog.js` y `js/admin.js`.

---

## 10. Checklist antes de publicar

- [ ] `js/firebase-config.js` con credenciales correctas
- [ ] Reglas de Firestore publicadas
- [ ] Usuarios admin creados en Authentication
- [ ] Al menos un producto agregado desde el admin
- [ ] `assets/logo.png` en su lugar
- [ ] Dominio configurado en Cloudflare (opcional)
