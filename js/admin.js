// ============================================================
//  PopDulce – admin.js  (v3)
//  Auth · Pedidos · Productos · Stories · Analytics · Reseñas
// ============================================================

import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  GoogleAuthProvider, signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, where, orderBy, serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const ADMIN_EMAILS = ['rubioquirozailyn@gmail.com','samuzuluaga4@gmail.com','juanrubio2277@gmail.com'];
const WA_AILYN     = '573193696869';
const WA_SAMUEL    = '573167719181';

const fmt = n => new Intl.NumberFormat('es-CO', {
  style:'currency', currency:'COP', maximumFractionDigits:0
}).format(n);

const fmtDate = ts => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
};

function toDriveImgUrl(url) {
  if (!url) return '';
  const m1 = url.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (m1) return `https://lh3.googleusercontent.com/d/${m1[1]}`;
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m2) return `https://lh3.googleusercontent.com/d/${m2[1]}`;
  return url;
}

const statusLabel = s => ({ pending:'Pendiente', approved:'Aprobado', rejected:'Rechazado' }[s] || s);

export function initAdmin() {
  setupAuth();
  setupNavigation();
  setupMobileSidebar();
  setupAdminBottomNav();
}

// ── Auth ──────────────────────────────────────────────────────
function setupAuth() {
  const auth = window._auth;

  onAuthStateChanged(auth, user => {
    if (user && ADMIN_EMAILS.includes(user.email)) {
      document.getElementById('loginGate').style.display = 'none';
      document.getElementById('dashboard').style.display = 'grid';
      const short = user.email.split('@')[0];
      document.getElementById('userInfoMobile').textContent = short;
      document.getElementById('userInfoSidebar').textContent = user.email;
      loadOrders();
    } else {
      document.getElementById('loginGate').style.display = 'flex';
      document.getElementById('dashboard').style.display = 'none';
      if (user) { signOut(auth); showLoginError('Este correo no tiene acceso de administrador.'); }
    }
  });

  document.getElementById('loginBtn').addEventListener('click', async () => {
    const btn = document.getElementById('loginBtn');
    btn.textContent = 'Ingresando...'; btn.disabled = true;
    try {
      await signInWithEmailAndPassword(auth,
        document.getElementById('loginEmail').value.trim(),
        document.getElementById('loginPass').value);
    } catch (e) {
      showLoginError(loginErrMsg(e.code));
      btn.textContent = 'Ingresar'; btn.disabled = false;
    }
  });

  document.getElementById('googleLoginBtn').addEventListener('click', async () => {
    const btn = document.getElementById('googleLoginBtn');
    btn.textContent = 'Conectando...'; btn.disabled = true;
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      showLoginError('Error con Google: ' + (e.message || e.code));
      btn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" alt="Google" /> Continuar con Google';
      btn.disabled = false;
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    if (confirm('¿Confirmas cerrar sesión?')) signOut(auth);
  });
  document.getElementById('abn-logout')?.addEventListener('click', () => {
    if (confirm('¿Confirmas cerrar sesión?')) signOut(auth);
  });
}

function showLoginError(msg) {
  const el = document.getElementById('loginError');
  el.textContent = msg; el.style.display = 'block';
}
function loginErrMsg(code) {
  const m = {
    'auth/user-not-found':     'No existe una cuenta con ese correo.',
    'auth/wrong-password':     'Contraseña incorrecta.',
    'auth/invalid-email':      'Correo inválido.',
    'auth/invalid-credential': 'Correo o contraseña incorrectos.',
    'auth/too-many-requests':  'Demasiados intentos. Intenta más tarde.',
  };
  return m[code] || 'Error al iniciar sesión. Revisa tus datos.';
}

// ── Navegación ────────────────────────────────────────────────
function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      const panel = item.dataset.panel;
      document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
      document.getElementById(`panel-${panel}`).style.display = 'block';
      closeMobileSidebar();
      if (panel === 'products' && !window._productsLoaded) { loadAdminProducts(); window._productsLoaded = true; }
      if (panel === 'stories'  && !window._storiesLoaded)  { loadAdminStories();  window._storiesLoaded  = true; }
      if (panel === 'analytics') loadAnalytics();
      if (panel === 'reviews')   loadAdminReviews();
    });
  });
  document.getElementById('orderFilter')?.addEventListener('change', e => loadOrders(e.target.value));
  setupManualOrderForm();
}

function setupAdminBottomNav() {
  document.querySelectorAll('.admin-bottom-nav .admin-bn-item[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.dataset.panel;
      const sidebarBtn = document.querySelector(`.nav-item[data-panel="${panel}"]`);
      if (sidebarBtn) sidebarBtn.click();
      document.querySelectorAll('.admin-bn-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  document.querySelectorAll('.nav-item[data-panel]').forEach(item => {
    item.addEventListener('click', () => {
      const panel = item.dataset.panel;
      document.querySelectorAll('.admin-bn-item').forEach(b => b.classList.remove('active'));
      const abnBtn = document.getElementById(`abn-${panel}`);
      if (abnBtn) abnBtn.classList.add('active');
    });
  });

  const sidebarBadge = document.getElementById('pendingBadge');
  const abnBadge     = document.getElementById('abnPendingBadge');
  if (sidebarBadge && abnBadge) {
    const obs = new MutationObserver(() => {
      const val = sidebarBadge.textContent;
      if (val) { abnBadge.textContent = val; abnBadge.style.display = 'flex'; }
      else      { abnBadge.style.display = 'none'; }
    });
    obs.observe(sidebarBadge, { childList:true, characterData:true, subtree:true });
  }
}

function setupMobileSidebar() {
  const toggle  = document.getElementById('menuToggle');
  const overlay = document.getElementById('sidebarOverlay');
  toggle?.addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('open');
    overlay?.classList.toggle('visible');
  });
  overlay?.addEventListener('click', closeMobileSidebar);
}
function closeMobileSidebar() {
  document.querySelector('.sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('visible');
}

// ── PEDIDOS ───────────────────────────────────────────────────
let ordersUnsub = null;

function loadOrders(status = 'pending') {
  const db   = window._db;
  const list = document.getElementById('ordersList');
  if (ordersUnsub) ordersUnsub();

  let q;
  try {
    q = status === 'all'
      ? query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'orders'), where('status', '==', status), orderBy('createdAt', 'desc'));
  } catch {
    list.innerHTML = '<p class="loading-text">Configura Firebase para ver pedidos.</p>'; return;
  }

  list.innerHTML = '<p class="loading-text">Cargando...</p>';

  ordersUnsub = onSnapshot(q, snap => {
    const orders = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    renderOrders(orders);
    if (status === 'pending') {
      const badge = document.getElementById('pendingBadge');
      if (badge) badge.textContent = orders.length || '';
    }
  }, err => {
    list.innerHTML = `<p class="loading-text">Error: ${err.message}</p>`;
  });

  const filterEl = document.getElementById('orderFilter');
  if (filterEl) filterEl.value = status;
}

function renderOrders(orders) {
  const list = document.getElementById('ordersList');
  if (!orders.length) {
    list.innerHTML = '<p class="loading-text">No hay pedidos en esta categoría.</p>'; return;
  }
  list.innerHTML = orders.map(order => {
    const items = (order.items || []).map(i => `${i.name} × ${i.qty} — ${fmt(i.subtotal||i.price*i.qty)}`).join('<br>');

    // Contact display
    let contactLine = '';
    if (order.contactType === 'email' && order.clientEmail) {
      contactLine = `<p>✉️ ${order.clientEmail}</p>`;
    } else if (order.contactType === 'ig' && order.clientInstagram) {
      contactLine = `<p>📸 @${order.clientInstagram}</p>`;
    } else if (order.clientPhone) {
      contactLine = `<p>📱 ${order.clientPhone}</p>`;
    }

    // WhatsApp button only if phone available
    const waBtn = order.clientPhone
      ? `<button class="btn-wa-client"
                onclick="window.open('https://wa.me/57${order.clientPhone.replace(/\D/g,'')}','_blank')">
          💬 WhatsApp cliente
        </button>`
      : '';

    const sourceBadge = order.source === 'manual'
      ? `<span style="font-size:.62rem;background:#e8f4fd;color:#1a6fa8;border-radius:20px;padding:.12rem .45rem;font-weight:600;margin-left:.4rem">manual</span>`
      : '';

    const notesBadge = order.notes
      ? `<div style="margin-top:.4rem;font-size:.78rem;color:var(--warm-gray);font-style:italic">📝 ${order.notes}</div>`
      : '';

    return `
      <div class="order-card ${order.status}" id="order-${order.id}">
        <div class="order-top">
          <div class="order-client">
            <h4>👤 ${order.clientName}${sourceBadge}</h4>
            ${contactLine}
          </div>
          <div class="order-meta">
            <span class="order-status status-${order.status}">${statusLabel(order.status)}</span>
            <div class="order-date">${fmtDate(order.createdAt)}</div>
          </div>
        </div>
        ${notesBadge}
        <div class="order-items">${items}</div>
        <div class="order-total">${fmt(order.total || 0)}</div>
        <div class="order-actions">
          ${order.status === 'pending' ? `
            <button class="btn-approve" onclick="window._approveOrder('${order.id}')">✓ Aprobar</button>
            <button class="btn-reject"  onclick="window._rejectOrder('${order.id}')">✕ Rechazar</button>
          ` : ''}
          ${waBtn}
        </div>
      </div>`;
  }).join('');
}

window._approveOrder = async id => {
  if (!confirm('¿Confirmas aceptar este pedido?')) return;
  await updateDoc(doc(window._db, 'orders', id), { status:'approved', approvedAt: serverTimestamp() });
};
window._rejectOrder = async id => {
  if (!confirm('¿Confirmas rechazar este pedido?')) return;
  await updateDoc(doc(window._db, 'orders', id), { status:'rejected' });
};

// ── PEDIDO MANUAL ─────────────────────────────────────────────
let manualOrderItems = [];

function setupManualOrderForm() {
  const btn = document.getElementById('newManualOrderBtn');
  if (!btn || btn._setup) return;
  btn._setup = true;

  btn.addEventListener('click', openManualOrderForm);
  document.getElementById('cancelManualOrder').addEventListener('click', () => {
    document.getElementById('manualOrderOverlay').style.display = 'none';
  });
  document.getElementById('moAddItemBtn').addEventListener('click', addManualOrderItem);
  document.getElementById('moSaveBtn').addEventListener('click', saveManualOrder);
}

async function openManualOrderForm() {
  manualOrderItems = [];
  renderManualItems();
  document.getElementById('mo-name').value         = '';
  document.getElementById('mo-contact').value      = '';
  document.getElementById('mo-contact-type').value = 'phone';
  document.getElementById('mo-notes').value        = '';
  document.getElementById('mo-status').value       = 'approved';
  document.getElementById('mo-item-qty').value     = '1';

  // Populate product selector from DB
  const sel = document.getElementById('mo-item-select');
  sel.innerHTML = '<option value="">Cargando productos…</option>';
  try {
    const snap = await getDocs(
      query(collection(window._db, 'products'),
        where('active', '==', true),
        orderBy('order', 'asc'))
    );
    const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    sel.innerHTML = '<option value="">— Selecciona un producto —</option>' +
      products.map(p =>
        `<option value="${p.id}" data-price="${p.price}" data-name="${p.name.replace(/"/g,'&quot;')}">
          ${p.emoji || '🍰'} ${p.name} — ${fmt(p.price)}
        </option>`
      ).join('');
  } catch (e) {
    sel.innerHTML = '<option value="">Error cargando productos</option>';
  }

  document.getElementById('manualOrderOverlay').style.display = 'flex';
}

function addManualOrderItem() {
  const sel  = document.getElementById('mo-item-select');
  const opt  = sel.options[sel.selectedIndex];
  const qty  = Number(document.getElementById('mo-item-qty').value) || 1;

  if (!sel.value) { alert('Selecciona un producto.'); return; }

  const name  = opt.dataset.name;
  const price = Number(opt.dataset.price);

  // If already in list, increment qty
  const existing = manualOrderItems.find(i => i.name === name && i.price === price);
  if (existing) {
    existing.qty     += qty;
    existing.subtotal = existing.price * existing.qty;
  } else {
    manualOrderItems.push({ name, price, qty, subtotal: price * qty });
  }

  sel.value = '';
  document.getElementById('mo-item-qty').value = '1';
  renderManualItems();
}

function renderManualItems() {
  const list  = document.getElementById('moItemsList');
  const total = manualOrderItems.reduce((s, i) => s + i.subtotal, 0);
  if (!manualOrderItems.length) {
    list.innerHTML = '<p style="color:var(--warm-gray);font-size:.8rem;margin:.4rem 0">Sin productos aún.</p>';
  } else {
    list.innerHTML = manualOrderItems.map((item, idx) => `
      <div style="display:flex;align-items:center;gap:.5rem;padding:.35rem 0;border-bottom:1px solid var(--rose-pale)">
        <span style="flex:1;font-size:.83rem">${item.name} × ${item.qty}</span>
        <span style="font-size:.83rem;color:var(--rose-deep);font-weight:600">${fmt(item.subtotal)}</span>
        <button onclick="window._removeManualItem(${idx})"
          style="background:none;border:none;cursor:pointer;color:#aaa;font-size:.9rem;padding:0 .2rem">✕</button>
      </div>`).join('');
  }
  document.getElementById('moTotal').textContent = fmt(total);
}

window._removeManualItem = idx => {
  manualOrderItems.splice(idx, 1);
  renderManualItems();
};

async function saveManualOrder() {
  const name    = document.getElementById('mo-name').value.trim();
  const contact = document.getElementById('mo-contact').value.trim();
  const type    = document.getElementById('mo-contact-type').value;
  const notes   = document.getElementById('mo-notes').value.trim();
  const status  = document.getElementById('mo-status').value;

  if (!name)                    { alert('El nombre del cliente es obligatorio.'); return; }
  if (!manualOrderItems.length) { alert('Agrega al menos un producto.'); return; }

  const total = manualOrderItems.reduce((s, i) => s + i.subtotal, 0);

  const contactData = {};
  if (type === 'phone')      contactData.clientPhone     = contact;
  else if (type === 'email') contactData.clientEmail     = contact;
  else if (type === 'ig')    contactData.clientInstagram = contact;

  const order = {
    clientName: name,
    ...contactData,
    contactType: type,
    notes,
    items: manualOrderItems,
    total,
    status,
    source: 'manual',
    createdAt: serverTimestamp(),
    ...(status === 'approved' ? { approvedAt: serverTimestamp() } : {})
  };

  try {
    const btn = document.getElementById('moSaveBtn');
    btn.textContent = 'Guardando…'; btn.disabled = true;
    await addDoc(collection(window._db, 'orders'), order);
    document.getElementById('manualOrderOverlay').style.display = 'none';
    btn.textContent = 'Guardar pedido'; btn.disabled = false;
  } catch (e) {
    alert('Error guardando pedido: ' + e.message);
    document.getElementById('moSaveBtn').textContent = 'Guardar pedido';
    document.getElementById('moSaveBtn').disabled = false;
  }
}

// ── PRODUCTOS ─────────────────────────────────────────────────
let adminProducts = [];

async function loadAdminProducts() {
  const list = document.getElementById('adminProductsList');
  list.innerHTML = '<p class="loading-text">Cargando...</p>';
  try {
    const snap = await getDocs(query(collection(window._db, 'products'), orderBy('order', 'asc')));
    adminProducts = snap.docs.map(d => ({ id:d.id, ...d.data() }));
  } catch (e) {
    list.innerHTML = `<p class="loading-text">Error: ${e.message}</p>`; return;
  }
  renderAdminProducts();
  setupProductForm();
  const cats = [...new Set(adminProducts.map(p => p.category).filter(Boolean))];
  const dl = document.getElementById('categorySuggestions');
  if (dl) dl.innerHTML = cats.map(c => `<option value="${c}">`).join('');
}

function renderAdminProducts() {
  const list = document.getElementById('adminProductsList');
  if (!adminProducts.length) {
    list.innerHTML = '<p class="loading-text">No hay productos. ¡Agrega el primero!</p>'; return;
  }
  list.innerHTML = adminProducts.map(p => `
    <div class="admin-product-card">
      <div class="apc-img">
        ${p.imageUrl
          ? `<img src="${toDriveImgUrl(p.imageUrl)}" alt="${p.name}" onerror="this.parentElement.textContent='${p.emoji||'🍰'}'" />`
          : (p.emoji || '🍰')}
      </div>
      <div class="apc-info">
        <div class="apc-cat">${p.category || '—'}</div>
        <div class="apc-name">${p.name}</div>
        <div class="apc-price">${fmt(p.price)}</div>
        <div class="apc-status">${p.active !== false ? '🟢 Activo' : '⭕ Oculto'}</div>
        <div class="apc-actions">
          <button class="btn-edit"   onclick="window._editProduct('${p.id}')">✏️ Editar</button>
          <button class="btn-delete" onclick="window._deleteProduct('${p.id}')">🗑</button>
        </div>
      </div>
    </div>`).join('');
}

let productFormSetup = false;
function setupProductForm() {
  if (productFormSetup) return;
  productFormSetup = true;
  document.getElementById('newProductBtn').addEventListener('click', () => openProductForm());
  document.getElementById('cancelProductForm').addEventListener('click', () => {
    document.getElementById('productFormOverlay').style.display = 'none';
  });
  document.getElementById('saveProductBtn').addEventListener('click', saveProduct);
}

function openProductForm(product = null) {
  document.getElementById('productFormTitle').textContent = product ? 'Editar Producto' : 'Nuevo Producto';
  document.getElementById('editProductId').value     = product?.id || '';
  document.getElementById('fp-name').value           = product?.name || '';
  document.getElementById('fp-category').value       = product?.category || '';
  document.getElementById('fp-price').value          = product?.price || '';
  document.getElementById('fp-original-price').value = product?.originalPrice || '';
  document.getElementById('fp-description').value    = product?.description || '';
  document.getElementById('fp-image').value          = product?.imageUrl || '';
  document.getElementById('fp-emoji').value          = product?.emoji || '';
  document.getElementById('fp-badge').value          = product?.badge || '';
  document.getElementById('fp-order').value          = product?.order ?? '';
  document.getElementById('fp-active').checked       = product?.active !== false;

  const cats = [...new Set(adminProducts.map(p => p.category).filter(Boolean))];
  const dl   = document.getElementById('categorySuggestions');
  if (dl) dl.innerHTML = cats.map(c => `<option value="${c}">`).join('');

  document.getElementById('productFormOverlay').style.display = 'flex';
}

async function saveProduct() {
  const id   = document.getElementById('editProductId').value;
  const data = {
    name:          document.getElementById('fp-name').value.trim(),
    category:      document.getElementById('fp-category').value.trim(),
    price:         Number(document.getElementById('fp-price').value),
    originalPrice: Number(document.getElementById('fp-original-price').value) || null,
    description:   document.getElementById('fp-description').value.trim(),
    imageUrl:      document.getElementById('fp-image').value.trim(),
    emoji:         document.getElementById('fp-emoji').value.trim(),
    badge:         document.getElementById('fp-badge').value,
    order:         Number(document.getElementById('fp-order').value) || 99,
    active:        document.getElementById('fp-active').checked,
    updatedAt:     serverTimestamp()
  };
  if (!data.name)  { alert('El nombre es obligatorio.'); return; }
  if (!data.price) { alert('El precio es obligatorio.'); return; }
  Object.keys(data).forEach(k => { if (data[k] === null || data[k] === '') delete data[k]; });

  const db = window._db;
  try {
    if (id) {
      await updateDoc(doc(db, 'products', id), data);
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, 'products'), data);
    }
    document.getElementById('productFormOverlay').style.display = 'none';
    window._productsLoaded = false;
    loadAdminProducts();
  } catch (e) { alert('Error guardando: ' + e.message); }
}

window._editProduct = id => {
  const p = adminProducts.find(x => x.id === id);
  if (p) openProductForm(p);
};
window._deleteProduct = async id => {
  if (confirm('¿Eliminar este producto?')) {
    await deleteDoc(doc(window._db, 'products', id));
    window._productsLoaded = false;
    loadAdminProducts();
  }
};

// ── STORIES ───────────────────────────────────────────────────
let adminStories = [];

async function loadAdminStories() {
  const list = document.getElementById('adminStoriesList');
  list.innerHTML = '<p class="loading-text">Cargando...</p>';
  try {
    const snap = await getDocs(query(collection(window._db, 'stories'), orderBy('createdAt', 'desc')));
    adminStories = snap.docs.map(d => ({ id:d.id, ...d.data() }));
  } catch (e) {
    list.innerHTML = `<p class="loading-text">Error: ${e.message}</p>`; return;
  }
  renderAdminStories();
  setupStoryForm();
}

function renderAdminStories() {
  const list = document.getElementById('adminStoriesList');
  if (!adminStories.length) {
    list.innerHTML = '<p class="loading-text">No hay stories. ¡Crea la primera!</p>'; return;
  }
  list.innerHTML = adminStories.map(s => `
    <div class="admin-story-card">
      <div class="asc-thumb">
        ${s.thumbnailUrl
          ? `<img src="${toDriveImgUrl(s.thumbnailUrl)}" alt="${s.title||'Story'}" onerror="this.parentElement.textContent='${s.emoji||'📸'}'" />`
          : (s.emoji || '📸')}
      </div>
      <div class="asc-info">
        <div class="asc-title">${s.title || 'Story'}</div>
        <div style="font-size:.7rem;color:var(--warm-gray);margin-top:2px">${s.active ? '🟢 Activa' : '⭕ Inactiva'}</div>
        <div class="asc-actions">
          <button class="btn-edit"   onclick="window._editStory('${s.id}')" style="flex:1">✏️</button>
          <button class="btn-delete" onclick="window._deleteStory('${s.id}')">🗑</button>
        </div>
      </div>
    </div>`).join('');
}

let storyFormSetup = false;
function setupStoryForm() {
  if (storyFormSetup) return;
  storyFormSetup = true;
  document.getElementById('newStoryBtn').addEventListener('click', () => openStoryForm());
  document.getElementById('cancelStoryForm').addEventListener('click', () => {
    document.getElementById('storyFormOverlay').style.display = 'none';
  });
  document.getElementById('saveStoryBtn').addEventListener('click', saveStory);
}

function openStoryForm(story = null) {
  document.getElementById('storyFormTitle').textContent = story ? 'Editar Story' : 'Nueva Story';
  document.getElementById('editStoryId').value   = story?.id || '';
  document.getElementById('sf-title').value      = story?.title || '';
  document.getElementById('sf-type').value       = story?.type || 'image';
  document.getElementById('sf-caption').value    = story?.caption || '';
  document.getElementById('sf-thumbnail').value  = story?.thumbnailUrl || '';
  document.getElementById('sf-video').value      = story?.videoUrl || '';
  document.getElementById('sf-cta-text').value   = story?.ctaText || '';
  document.getElementById('sf-cta-url').value    = story?.ctaUrl || '';
  document.getElementById('sf-emoji').value      = story?.emoji || '';
  document.getElementById('sf-active').checked   = story?.active !== false;
  document.getElementById('storyFormOverlay').style.display = 'flex';
}

async function saveStory() {
  const id   = document.getElementById('editStoryId').value;
  const data = {
    title:        document.getElementById('sf-title').value.trim(),
    type:         document.getElementById('sf-type').value,
    caption:      document.getElementById('sf-caption').value.trim(),
    thumbnailUrl: document.getElementById('sf-thumbnail').value.trim(),
    videoUrl:     document.getElementById('sf-video').value.trim(),
    ctaText:      document.getElementById('sf-cta-text').value.trim(),
    ctaUrl:       document.getElementById('sf-cta-url').value.trim(),
    emoji:        document.getElementById('sf-emoji').value.trim(),
    active:       document.getElementById('sf-active').checked,
    updatedAt:    serverTimestamp()
  };
  Object.keys(data).forEach(k => { if (!data[k] && data[k] !== false) delete data[k]; });

  const db = window._db;
  try {
    if (id) {
      await updateDoc(doc(db, 'stories', id), data);
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, 'stories'), data);
    }
    document.getElementById('storyFormOverlay').style.display = 'none';
    window._storiesLoaded = false;
    loadAdminStories();
  } catch (e) { alert('Error guardando: ' + e.message); }
}

window._editStory   = id => { const s = adminStories.find(x => x.id === id); if (s) openStoryForm(s); };
window._deleteStory = async id => {
  if (confirm('¿Eliminar esta story?')) {
    await deleteDoc(doc(window._db, 'stories', id));
    window._storiesLoaded = false;
    loadAdminStories();
  }
};

// ── RESEÑAS (admin) ───────────────────────────────────────────
let adminReviews = [];

async function loadAdminReviews() {
  const list = document.getElementById('adminReviewsList');
  if (!list) return;
  list.innerHTML = '<p class="loading-text">Cargando reseñas...</p>';
  try {
    const snap = await getDocs(
      query(collection(window._db, 'reviews'), orderBy('createdAt', 'desc'))
    );
    adminReviews = snap.docs.map(d => ({ id:d.id, ...d.data() }));
  } catch (e) {
    list.innerHTML = `<p class="loading-text">Error: ${e.message}</p>`; return;
  }
  renderAdminReviews();
}

function renderAdminReviews() {
  const list = document.getElementById('adminReviewsList');
  if (!adminReviews.length) {
    list.innerHTML = '<p class="loading-text">Aún no hay reseñas.</p>'; return;
  }
  list.innerHTML = adminReviews.map(r => {
    const stars = '★'.repeat(r.rating || 5) + '☆'.repeat(5-(r.rating||5));
    return `
      <div class="admin-review-card ${r.approved ? 'approved' : 'pending'}">
        <div class="arc-stars">${stars}</div>
        <div class="arc-text">"${r.text}"</div>
        <div class="arc-author">— ${r.name} &nbsp;<span style="font-size:.7rem;color:var(--warm-gray)">${fmtDate(r.createdAt)}</span></div>
        <div class="arc-status">${r.approved ? '🟢 Publicada' : '⏳ Pendiente'}</div>
        <div class="arc-actions">
          ${!r.approved ? `<button class="btn-approve" onclick="window._approveReview('${r.id}')">✓ Publicar</button>` : ''}
          ${r.approved  ? `<button class="btn-reject"  onclick="window._hideReview('${r.id}')">Ocultar</button>` : ''}
          <button class="btn-delete" onclick="window._deleteReview('${r.id}')">🗑 Eliminar</button>
        </div>
      </div>`;
  }).join('');
}

window._approveReview = async id => {
  await updateDoc(doc(window._db, 'reviews', id), { approved: true });
  const r = adminReviews.find(x => x.id === id);
  if (r) r.approved = true;
  renderAdminReviews();
};
window._hideReview = async id => {
  await updateDoc(doc(window._db, 'reviews', id), { approved: false });
  const r = adminReviews.find(x => x.id === id);
  if (r) r.approved = false;
  renderAdminReviews();
};
window._deleteReview = async id => {
  if (confirm('¿Eliminar esta reseña permanentemente?')) {
    await deleteDoc(doc(window._db, 'reviews', id));
    adminReviews = adminReviews.filter(r => r.id !== id);
    renderAdminReviews();
  }
};

// ── ANALYTICS ─────────────────────────────────────────────────
async function loadAnalytics() {
  const db      = window._db;
  const content = document.getElementById('analyticsContent');

  const monthSel = document.getElementById('analyticsMonth');
  const START_YEAR = 2026, START_MONTH = 2; // marzo 2026 (mes 0-indexado)

  content.innerHTML = '<p class="loading-text">Calculando...</p>';

  // Siempre traemos TODOS los pedidos para detectar meses con ventas
  let allOrdersGlobal = [];
  try {
    const snapAll = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'asc')));
    allOrdersGlobal = snapAll.docs.map(d => ({ id:d.id, ...d.data() }));
  } catch (e) {
    content.innerHTML = '<p class="loading-text">Configura Firebase para ver estadísticas.</p>'; return;
  }

  // Meses con al menos un pedido aprobado (desde marzo 2026 en adelante)
  const monthsWithSales = new Set();
  allOrdersGlobal.forEach(o => {
    if (o.status !== 'approved' || !o.createdAt) return;
    const d = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
    const y = d.getFullYear(), m = d.getMonth();
    // Solo contar desde marzo 2026
    if (y > START_YEAR || (y === START_YEAR && m >= START_MONTH)) {
      monthsWithSales.add(`${y}-${m}`);
    }
  });

  // Construir lista de meses visibles: meses con ventas + mes actual + 5 meses futuros
  const now = new Date();
  const visibleMonths = new Set(monthsWithSales);
  for (let i = 0; i <= 5; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const y = d.getFullYear(), m = d.getMonth();
    if (y > START_YEAR || (y === START_YEAR && m >= START_MONTH)) {
      visibleMonths.add(`${y}-${m}`);
    }
  }

  // Ordenar cronológicamente de más reciente a más antiguo
  const sortedMonths = [...visibleMonths].sort((a, b) => {
    const [ay, am] = a.split('-').map(Number);
    const [by, bm] = b.split('-').map(Number);
    return (by * 12 + bm) - (ay * 12 + am); // más reciente primero
  });

  // Repoblar selector si la lista cambió
  const currentVal = monthSel.value;
  const newKey = sortedMonths.join(',');
  if (monthSel.dataset.loadedKey !== newKey) {
    monthSel.innerHTML = '';
    sortedMonths.forEach(key => {
      const [y, m] = key.split('-').map(Number);
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = new Date(y, m, 1).toLocaleDateString('es-CO', { month:'long', year:'numeric' });
      monthSel.appendChild(opt);
    });
    monthSel.dataset.loadedKey = newKey;
    // Seleccionar mes actual si existe, si no el primero (más reciente)
    const todayKey = `${now.getFullYear()}-${now.getMonth()}`;
    monthSel.value = sortedMonths.includes(todayKey) ? todayKey : (sortedMonths[0] || todayKey);
    if (!monthSel._listenerSet) {
      monthSel.addEventListener('change', loadAnalytics);
      monthSel._listenerSet = true;
    }
  }

  const [year, month] = monthSel.value.split('-').map(Number);
  const start = new Date(year, month, 1);
  const end   = new Date(year, month + 1, 0, 23, 59, 59);

  content.innerHTML = '<p class="loading-text">Calculando...</p>';

  // Filtrar pedidos del mes seleccionado a partir de los ya cargados
  let allOrders = [], approvedOrders = [];
  allOrders = allOrdersGlobal.filter(o => {
    if (!o.createdAt) return false;
    const d = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
    return d >= start && d <= end;
  });
  approvedOrders = allOrders.filter(o => o.status === 'approved');

  const totalVentas    = approvedOrders.reduce((s, o) => s + (o.total || 0), 0);
  const numAprobados   = approvedOrders.length;
  const numPendientes  = allOrders.filter(o => o.status === 'pending').length;
  const numRechazados  = allOrders.filter(o => o.status === 'rejected').length;

  // Productos vendidos con detalle de clientes
  const productMap = {};
  approvedOrders.forEach(o => {
    const fecha = o.createdAt?.toDate ? o.createdAt.toDate() : new Date();
    const fechaStr = fecha.toLocaleDateString('es-CO', { day:'2-digit', month:'short' });
    (o.items || []).forEach(i => {
      if (!productMap[i.name]) productMap[i.name] = { qty:0, revenue:0, sales:[] };
      productMap[i.name].qty     += i.qty;
      productMap[i.name].revenue += i.subtotal || (i.price * i.qty);
      productMap[i.name].sales.push({
        client: o.clientName,
        qty: i.qty,
        subtotal: i.subtotal || (i.price * i.qty),
        date: fechaStr
      });
    });
  });

  const topProducts = Object.entries(productMap).sort((a,b) => b[1].revenue - a[1].revenue);
  const maxQty = topProducts[0]?.[1]?.qty || 1;

  // Distribución 50/50 (ajusta aquí si es necesario)
  const pctAilyn  = 0.5;
  const pctSamuel = 0.5;
  const partAilyn  = totalVentas * pctAilyn;
  const partSamuel = totalVentas * pctSamuel;

  // Build detailed sales table rows
  const salesTableRows = topProducts.map(([name, data]) => {
    const clientsDetail = data.sales.map(s =>
      `<span style="display:inline-block;margin:.15rem .3rem .15rem 0;padding:.12rem .5rem;background:var(--rose-pale);border-radius:20px;font-size:.7rem">${s.client} × ${s.qty} (${s.date})</span>`
    ).join('');
    return `
      <tr>
        <td style="font-weight:600;padding:.6rem .5rem">${name}</td>
        <td style="text-align:center;padding:.6rem .5rem">${data.qty}</td>
        <td style="padding:.4rem .5rem;font-size:.78rem;line-height:1.6">${clientsDetail}</td>
        <td style="text-align:right;font-weight:600;padding:.6rem .5rem;color:var(--rose-deep)">${fmt(data.revenue)}</td>
      </tr>`;
  }).join('');

  content.innerHTML = `
    <!-- KPIs -->
    <div class="analytics-grid">
      <div class="stat-card">
        <div class="stat-label">Total ingresos</div>
        <div class="stat-value rose">${fmt(totalVentas)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pedidos aprobados</div>
        <div class="stat-value">${numAprobados}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Ticket promedio</div>
        <div class="stat-value">${numAprobados ? fmt(totalVentas/numAprobados) : fmt(0)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pendientes</div>
        <div class="stat-value" style="color:#856404">${numPendientes}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Rechazados</div>
        <div class="stat-value" style="color:#721c24">${numRechazados}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Productos distintos</div>
        <div class="stat-value">${Object.keys(productMap).length}</div>
      </div>
    </div>

    <!-- Distribución de ganancias -->
    <h3 style="font-family:var(--font-display);font-size:1.1rem;margin:1.6rem 0 .75rem;color:var(--charcoal)">💰 Distribución de ganancias</h3>
    <div class="partner-grid">
      <div class="partner-card">
        <h3>Ailyn 🩷</h3>
        <div class="partner-amount">${fmt(partAilyn)}</div>
        <div class="partner-pct">${Math.round(pctAilyn*100)}% del total aprobado</div>
        <a href="https://wa.me/${WA_AILYN}" target="_blank"
           style="display:inline-block;margin-top:.75rem;font-size:.78rem;color:#25D366">
          📱 ${WA_AILYN.replace('57','')}</a>
      </div>
      <div class="partner-card">
        <h3>Samuel 🩵</h3>
        <div class="partner-amount">${fmt(partSamuel)}</div>
        <div class="partner-pct">${Math.round(pctSamuel*100)}% del total aprobado</div>
        <a href="https://wa.me/${WA_SAMUEL}" target="_blank"
           style="display:inline-block;margin-top:.75rem;font-size:.78rem;color:#25D366">
          📱 ${WA_SAMUEL.replace('57','')}</a>
      </div>
    </div>
    <p style="font-size:.74rem;color:var(--warm-gray);margin-top:.65rem">
      * Solo se cuentan pedidos aprobados. Para cambiar el porcentaje, edita pctAilyn / pctSamuel en js/admin.js → loadAnalytics().
    </p>

    <!-- Tabla detallada de ventas por producto -->
    ${topProducts.length ? `
      <h3 style="font-family:var(--font-display);font-size:1.1rem;margin:1.8rem 0 .75rem;color:var(--charcoal)">📋 Ventas por producto</h3>
      <div style="background:#fff;border-radius:var(--radius-lg);padding:0;overflow:hidden;box-shadow:var(--shadow-card)">
        <table style="width:100%;border-collapse:collapse;font-size:.82rem;font-family:var(--font-body)">
          <thead>
            <tr style="background:var(--rose-pale);border-bottom:2px solid var(--rose-light)">
              <th style="text-align:left;padding:.7rem .5rem;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:var(--rose-deep)">Producto</th>
              <th style="text-align:center;padding:.7rem .5rem;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:var(--rose-deep)">Uds.</th>
              <th style="text-align:left;padding:.7rem .5rem;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:var(--rose-deep)">Clientes</th>
              <th style="text-align:right;padding:.7rem .5rem;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:var(--rose-deep)">Total</th>
            </tr>
          </thead>
          <tbody>
            ${salesTableRows}
            <tr style="border-top:2px solid var(--rose-light);background:var(--rose-pale)">
              <td colspan="2" style="padding:.7rem .5rem;font-weight:700;font-size:.85rem">TOTAL DEL MES</td>
              <td></td>
              <td style="text-align:right;padding:.7rem .5rem;font-weight:800;font-size:1rem;color:var(--rose-deep)">${fmt(totalVentas)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Barras top productos -->
      <h3 style="font-family:var(--font-display);font-size:1.1rem;margin:1.8rem 0 .75rem;color:var(--charcoal)">🏆 Más vendidos (por unidades)</h3>
      <div style="background:#fff;border-radius:var(--radius-lg);padding:1.2rem 1.4rem;box-shadow:var(--shadow-card)">
        <div class="bar-chart">
          ${topProducts.slice(0,8).map(([name, data], i) => `
            <div class="bar-row">
              <span class="bar-label" title="${name}">${i+1}. ${name}</span>
              <div class="bar-track">
                <div class="bar-fill" style="width:${Math.round(data.qty/maxQty*100)}%"></div>
              </div>
              <span class="bar-qty">${data.qty} uds.</span>
            </div>`).join('')}
        </div>
      </div>
    ` : `<p style="color:var(--warm-gray);padding:1rem 0;font-size:.88rem">No hay pedidos aprobados en este período.</p>`}
  `;
}