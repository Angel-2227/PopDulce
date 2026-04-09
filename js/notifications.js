// ============================================================
//  PopDulce – notifications.js  (v3 · sin FCM · plan Spark)
//  Notificaciones internas al abrir el panel admin.
//
//  Cómo funciona:
//    1. Al hacer login, lee `adminSessions/{emailHash}` para saber
//       cuándo fue la última visita de este admin.
//    2. Consulta pedidos y reseñas creados DESPUÉS de esa fecha.
//    3. Muestra un toast por cada novedad.
//    4. Actualiza lastSeenAt → la próxima vez solo verá lo nuevo.
//
//  Sin tokens FCM, sin Cloud Functions, sin plan Blaze.
// ============================================================

import {
  doc, getDoc, setDoc, collection, query,
  where, orderBy, getDocs, serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Punto de entrada (llamar desde admin.js tras login) ──────
export async function checkInboxNotifications(db, userEmail) {
  try {
    const sessionKey  = btoa(userEmail).replace(/[^a-zA-Z0-9]/g, "").slice(0, 24);
    const sessionRef  = doc(db, "adminSessions", sessionKey);
    const sessionSnap = await getDoc(sessionRef);

    // Si es la primera visita, guardamos ahora y no mostramos nada
    // (no queremos inundar con TODO el historial)
    if (!sessionSnap.exists()) {
      await setDoc(sessionRef, { email: userEmail, lastSeenAt: serverTimestamp() });
      return;
    }

    const lastSeen = sessionSnap.data().lastSeenAt; // Firestore Timestamp

    // Actualizar lastSeenAt ANTES de mostrar (así si el admin recarga
    // no vuelve a ver las mismas notificaciones)
    await setDoc(sessionRef, { email: userEmail, lastSeenAt: serverTimestamp() }, { merge: true });

    // Consultar novedades en paralelo
    const [newOrders, newReviews] = await Promise.all([
      getNewOrders(db, lastSeen),
      getNewReviews(db, lastSeen),
    ]);

    // Esperar un momento para que el dashboard ya esté visible
    setTimeout(() => {
      showInboxSummary(newOrders, newReviews);
    }, 600);

  } catch (err) {
    // Silencioso: las notificaciones no son críticas
    console.warn("Inbox notifications:", err.message);
  }
}

// ── Consultas Firestore ──────────────────────────────────────
async function getNewOrders(db, since) {
  try {
    const q = query(
      collection(db, "orders"),
      where("createdAt", ">", since),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch { return []; }
}

async function getNewReviews(db, since) {
  try {
    const q = query(
      collection(db, "reviews"),
      where("createdAt", ">", since),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch { return []; }
}

// ── Lógica de presentación ───────────────────────────────────
function showInboxSummary(orders, reviews) {
  const total = orders.length + reviews.length;
  if (!total) return;

  // Si hay pocas novedades, un toast por cada una
  // Si hay muchas, un toast resumen para no saturar
  const MAX_INDIVIDUAL = 4;

  if (total <= MAX_INDIVIDUAL) {
    let delay = 0;
    orders.forEach(o => {
      setTimeout(() => showToast({
        type:  "order",
        title: `🛒 Nuevo pedido de ${o.clientName || "Cliente"}`,
        body:  buildOrderBody(o),
        panel: "orders",
      }), delay);
      delay += 400;
    });
    reviews.forEach(r => {
      setTimeout(() => showToast({
        type:  "review",
        title: `${"⭐".repeat(Math.min(r.rating || 5, 5))} Reseña de ${r.name || "Alguien"}`,
        body:  (r.text || "").slice(0, 80) || "Sin texto.",
        panel: "reviews",
      }), delay);
      delay += 400;
    });
  } else {
    // Toast resumen
    const parts = [];
    if (orders.length)  parts.push(`${orders.length} pedido${orders.length > 1 ? "s" : ""} nuevo${orders.length > 1 ? "s" : ""}`);
    if (reviews.length) parts.push(`${reviews.length} reseña${reviews.length > 1 ? "s" : ""} nueva${reviews.length > 1 ? "s" : ""}`);
    showToast({
      type:  "summary",
      title: "📬 Novedades desde tu última visita",
      body:  parts.join(" · "),
      panel: orders.length >= reviews.length ? "orders" : "reviews",
    });
  }
}

function buildOrderBody(order) {
  const fmt    = n => new Intl.NumberFormat("es-CO", { style:"currency", currency:"COP", maximumFractionDigits:0 }).format(n);
  const items  = (order.items || []).map(i => `${i.name} ×${i.qty}`).join(", ");
  const total  = fmt(order.total || 0);
  return items ? `${items} · ${total}` : total;
}

// ── Toast visual ─────────────────────────────────────────────
function showToast({ title, body, type, panel }) {
  // Contenedor
  let container = document.getElementById("pd-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "pd-toast-container";
    container.style.cssText = `
      position:fixed;top:1rem;right:1rem;z-index:9999;
      display:flex;flex-direction:column;gap:.6rem;
      pointer-events:none;
    `;
    document.body.appendChild(container);
  }

  const color = type === "order"   ? "#c9547a"
              : type === "review"  ? "#8a5cf6"
              : "#3b82f6";
  const emoji = type === "order"   ? "🛒"
              : type === "review"  ? "⭐"
              : "📬";

  const toast = document.createElement("div");
  toast.style.cssText = `
    background:#fff;
    border-left:4px solid ${color};
    border-radius:12px;
    box-shadow:0 4px 20px rgba(0,0,0,.15);
    padding:.85rem 1rem .85rem .9rem;
    max-width:320px;min-width:260px;
    display:flex;align-items:flex-start;gap:.75rem;
    pointer-events:all;cursor:pointer;
    animation:pdToastIn .3s cubic-bezier(.34,1.56,.64,1) forwards;
    font-family:var(--font-body,'DM Sans',sans-serif);
  `;
  toast.innerHTML = `
    <img src="assets/avatar.png" alt=""
         style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0;background:#fce4ec"
         onerror="this.style.display='none'" />
    <div style="flex:1;min-width:0">
      <div style="font-weight:700;font-size:.84rem;color:#1a1a1a;line-height:1.2">${emoji} ${title}</div>
      <div style="font-size:.76rem;color:#666;margin-top:.2rem;line-height:1.4;
                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${body}</div>
      <div style="font-size:.68rem;color:${color};margin-top:.35rem;font-weight:600">
        Toca para ver →
      </div>
    </div>
    <button style="background:none;border:none;cursor:pointer;color:#ccc;font-size:1rem;
                   padding:0;line-height:1;flex-shrink:0" aria-label="Cerrar">✕</button>
  `;

  // Clic → navegar al panel correspondiente
  toast.addEventListener("click", e => {
    if (e.target.tagName === "BUTTON") { dismissToast(toast); return; }
    const navBtn = document.querySelector(`.nav-item[data-panel="${panel}"]`);
    if (navBtn) navBtn.click();
    dismissToast(toast);
  });

  container.appendChild(toast);

  // Auto-cerrar tras 8 segundos
  setTimeout(() => dismissToast(toast), 8000);

  // Inyectar keyframes una sola vez
  if (!document.getElementById("pd-toast-styles")) {
    const style = document.createElement("style");
    style.id = "pd-toast-styles";
    style.textContent = `
      @keyframes pdToastIn  { from{opacity:0;transform:translateX(20px) scale(.95)} to{opacity:1;transform:none} }
      @keyframes pdToastOut { from{opacity:1;transform:none} to{opacity:0;transform:translateX(20px) scale(.95)} }
    `;
    document.head.appendChild(style);
  }
}

function dismissToast(toast) {
  toast.style.animation = "pdToastOut .3s ease forwards";
  setTimeout(() => toast.remove(), 300);
}