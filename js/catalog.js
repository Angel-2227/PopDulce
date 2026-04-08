// ============================================================
//  PopDulce – catalog.js  (v2)
//  Catálogo · Carrito · Pedido → WhatsApp + Firestore
// ============================================================

import {
  collection, getDocs, addDoc, query,
  where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let cart = [];
let products = [];
let currentProduct = null;
let currentQty = 1;

// WhatsApp de Ailyn (recibe pedidos)
const WA_AILYN   = '573193696869';
const WA_SAMUEL  = '573167719181';

const fmt = (n) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0
}).format(n);

/**
 * Convierte URLs de Google Drive al formato lh3.googleusercontent.com
 * que carga correctamente en <img> sin problemas CORS.
 * Ejemplo: https://drive.google.com/file/d/FILE_ID/view?usp=drive_link
 * → https://lh3.googleusercontent.com/d/FILE_ID
 */
function toDriveImgUrl(url) {
  if (!url) return '';
  // /file/d/ID/...
  const m1 = url.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (m1) return `https://lh3.googleusercontent.com/d/${m1[1]}`;
  // ?id=ID o open?id=ID
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m2) return `https://lh3.googleusercontent.com/d/${m2[1]}`;
  return url;
}

export async function initCatalog() {
  await loadProducts();
  setupCart();
  setupProductModal();
}

// ── Cargar productos ──────────────────────────────────────────
async function loadProducts() {
  const grid      = document.getElementById('productsGrid');
  const filterBar = document.getElementById('filterBar');

  try {
    const snap = await getDocs(
      query(collection(window._db, 'products'),
        where('active', '==', true),
        orderBy('order', 'asc'))
    );
    products = snap.docs.map(d => {
      const data = d.data();
      return { id: d.id, ...data, imageUrl: toDriveImgUrl(data.imageUrl) };
    });
  } catch (e) {
    console.warn('Firestore error:', e);
    products = [];
  }

  renderOffers();

  // Filtros por categoría
  const cats = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];
  filterBar.innerHTML = '';
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (cat === 'all' ? ' active' : '');
    btn.dataset.cat = cat;
    btn.textContent = cat === 'all' ? 'Todo' : cat;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProducts(cat);
    });
    filterBar.appendChild(btn);
  });

  renderProducts('all');
}

// ── Renderizar grid ───────────────────────────────────────────
function renderProducts(cat) {
  const grid    = document.getElementById('productsGrid');
  const filtered = cat === 'all' ? products : products.filter(p => p.category === cat);

  grid.innerHTML = '';

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎂</div>
        <h3>${products.length === 0 ? 'Próximamente' : 'Sin productos aquí'}</h3>
        <p>${products.length === 0
          ? 'Estamos preparando algo delicioso. ¡Vuelve pronto!'
          : 'No hay productos en esta categoría todavía.'}</p>
      </div>`;
    return;
  }

  filtered.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.style.animation = `heroFadeIn .45s ease ${i * 55}ms both`;

    const badge = p.badge
      ? `<span class="product-badge badge-${p.badge.toLowerCase()}">${p.badge}</span>` : '';

    const imgSection = p.imageUrl
      ? `<img src="${p.imageUrl}" alt="${p.name}" loading="lazy"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
         <span class="emoji-placeholder" style="display:none">${p.emoji || '🍰'}</span>`
      : `<span class="emoji-placeholder">${p.emoji || '🍰'}</span>`;

    const oldPrice = p.originalPrice && p.originalPrice > p.price
      ? `<small>${fmt(p.originalPrice)}</small>` : '';

    card.innerHTML = `
      <div class="product-img-wrap">${badge}${imgSection}</div>
      <div class="product-info">
        <div class="product-cat">${p.category || 'Pastelería'}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.description || ''}</div>
        <div class="product-footer">
          <div class="product-price">${fmt(p.price)} ${oldPrice}</div>
          <button class="btn-quick-add" data-id="${p.id}" aria-label="Agregar ${p.name}">+</button>
        </div>
      </div>`;

    card.addEventListener('click', (e) => {
      if (!e.target.closest('.btn-quick-add')) openProductModal(p);
    });
    card.querySelector('.btn-quick-add').addEventListener('click', (e) => {
      e.stopPropagation();
      addToCart(p, 1);
      animateAdd(e.currentTarget);
    });

    grid.appendChild(card);
  });
}

// ── Ofertas ───────────────────────────────────────────────────
function renderOffers() {
  const offers  = products.filter(p => p.originalPrice && p.originalPrice > p.price);
  const banner  = document.getElementById('offersBanner');
  const section = banner?.closest('.offers-banner');
  if (!section) return;
  if (!offers.length) { section.style.display = 'none'; return; }
  section.style.display = '';

  const disc = p => Math.round((1 - p.price / p.originalPrice) * 100);

  banner.innerHTML = `
    <h2 class="offers-title">🎉 Ofertas Especiales</h2>
    <div class="offer-cards">
      ${offers.map(p => `
        <div class="offer-card"
             onclick="document.getElementById('catalog-section').scrollIntoView({behavior:'smooth'})">
          <span class="offer-badge">-${disc(p)}%</span>
          <h3>${p.name}</h3>
          <p>${p.description || ''}</p>
          <div class="offer-price-row">
            <span class="offer-new-price">${fmt(p.price)}</span>
            <span class="offer-old-price">${fmt(p.originalPrice)}</span>
            <span class="offer-discount">-${disc(p)}%</span>
          </div>
        </div>`).join('')}
    </div>`;
}

// ── Modal de producto ─────────────────────────────────────────
function setupProductModal() {
  const overlay = document.getElementById('productModalOverlay');
  document.getElementById('modalClose').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  document.getElementById('qtyMinus').addEventListener('click', () => {
    if (currentQty > 1) { currentQty--; document.getElementById('qtyVal').textContent = currentQty; }
  });
  document.getElementById('qtyPlus').addEventListener('click', () => {
    currentQty++;
    document.getElementById('qtyVal').textContent = currentQty;
  });
  document.getElementById('modalAddCart').addEventListener('click', () => {
    if (currentProduct) { addToCart(currentProduct, currentQty); closeModal(); }
  });
}

function openProductModal(p) {
  currentProduct = p; currentQty = 1;
  document.getElementById('qtyVal').textContent = 1;
  const wrap = document.getElementById('modalImgWrap');
  wrap.innerHTML = p.imageUrl
    ? `<img src="${p.imageUrl}" alt="${p.name}"
         onerror="this.parentElement.innerHTML='<span style=\\'font-size:5rem\\'>${p.emoji||'🍰'}</span>'" />`
    : `<span style="font-size:5rem">${p.emoji || '🍰'}</span>`;
  document.getElementById('modalCat').textContent   = p.category || 'Pastelería';
  document.getElementById('modalName').textContent  = p.name;
  document.getElementById('modalDesc').textContent  = p.description || '';
  document.getElementById('modalPrice').textContent = fmt(p.price);
  document.getElementById('productModalOverlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  document.getElementById('productModalOverlay').style.display = 'none';
  document.body.style.overflow = '';
  currentProduct = null;
}

// ── Carrito ───────────────────────────────────────────────────
function setupCart() {
  document.getElementById('cartBtn').addEventListener('click', openCart);
  document.getElementById('closeCart').addEventListener('click', closeCart);
  document.getElementById('cartOverlay').addEventListener('click', closeCart);
  document.getElementById('sendOrderBtn').addEventListener('click', sendOrder);
}
function openCart() {
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('active');
  document.body.style.overflow = '';
}
function addToCart(product, qty = 1) {
  const ex = cart.find(i => i.id === product.id);
  ex ? (ex.qty += qty) : cart.push({ ...product, qty });
  updateCartUI();
  showToast(`✓ ${product.name} agregado`);
}
function updateCartUI() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const countEl = document.getElementById('cartCount');
  countEl.textContent = count || '';
  document.getElementById('cartTotal').textContent = fmt(total);
  const body   = document.getElementById('cartBody');
  const footer = document.getElementById('cartFooter');
  if (!cart.length) {
    body.innerHTML = '<p class="cart-empty">Aún no tienes productos. ¡Agrega algo rico! 🎂</p>';
    footer.style.display = 'none';
    return;
  }
  footer.style.display = 'block';
  body.innerHTML = cart.map(item => `
    <div class="cart-item">
      ${item.imageUrl
        ? `<img class="cart-item-img" src="${item.imageUrl}" alt="${item.name}"
             onerror="this.outerHTML='<div class=\\'cart-item-img\\'
               style=\\'display:flex;align-items:center;justify-content:center;
               background:var(--rose-pale);border-radius:var(--radius-sm);font-size:1.4rem\\'>${item.emoji||'🍰'}</div>'" />`
        : `<div class="cart-item-img"
             style="display:flex;align-items:center;justify-content:center;
             background:var(--rose-pale);border-radius:var(--radius-sm);font-size:1.4rem">${item.emoji||'🍰'}</div>`}
      <div>
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-qty">× ${item.qty}</div>
      </div>
      <div style="text-align:right">
        <div class="cart-item-price">${fmt(item.price * item.qty)}</div>
        <button onclick="window._removeFromCart('${item.id}')"
                style="font-size:.7rem;color:var(--warm-gray);margin-top:3px">Quitar</button>
      </div>
    </div>`).join('');
}
window._removeFromCart = id => { cart = cart.filter(i => i.id !== id); updateCartUI(); };

// ── Enviar pedido → WhatsApp + Firestore ──────────────────────
async function sendOrder() {
  const name  = document.getElementById('clientName').value.trim();
  const phone = document.getElementById('clientPhone').value.trim();
  if (!name)  { showToast('⚠️ Escribe tu nombre', 'warn'); return; }
  if (!phone) { showToast('⚠️ Escribe tu número de WhatsApp', 'warn'); return; }
  if (!cart.length) { showToast('⚠️ Tu pedido está vacío', 'warn'); return; }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const lines = cart.map(i => `  • ${i.name} × ${i.qty} = ${fmt(i.price * i.qty)}`).join('\n');

  const text = encodeURIComponent(
    `¡Hola PopDulce! 🎂\n\nSoy *${name}* y quiero hacer este pedido:\n\n${lines}\n\n*Total: ${fmt(total)}*\n\nMi número: ${phone}\n\nQuedo atento/a a la confirmación. ¡Gracias! 🩷`
  );

  try {
    await addDoc(collection(window._db, 'orders'), {
      clientName: name, clientPhone: phone,
      items: cart.map(i => ({ id:i.id, name:i.name, price:i.price, qty:i.qty, subtotal:i.price*i.qty })),
      total, status: 'pending', createdAt: serverTimestamp()
    });
  } catch (e) { console.warn('Firestore write error:', e); }

  // Abre WhatsApp de Ailyn (número principal de pedidos)
  window.open(`https://wa.me/${WA_AILYN}?text=${text}`, '_blank');

  cart = [];
  document.getElementById('clientName').value  = '';
  document.getElementById('clientPhone').value = '';
  updateCartUI();
  closeCart();
  showToast('🎉 ¡Pedido enviado! Te confirmamos pronto.');
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, type = 'ok') {
  document.querySelector('.pd-toast')?.remove();
  const t = document.createElement('div');
  t.className = 'pd-toast';
  t.textContent = msg;
  t.style.cssText = `
    position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(18px);
    background:${type==='warn'?'#f0ad4e':'var(--charcoal)'};
    color:#fff;padding:.65rem 1.35rem;border-radius:40px;
    font-size:.86rem;font-weight:500;font-family:var(--font-body);
    z-index:999;opacity:0;transition:all .28s ease;
    white-space:nowrap;max-width:90vw;box-shadow:0 6px 24px rgba(0,0,0,.22);`;
  document.body.appendChild(t);
  requestAnimationFrame(() => { t.style.opacity='1'; t.style.transform='translateX(-50%) translateY(0)'; });
  setTimeout(() => { t.style.opacity='0'; t.style.transform='translateX(-50%) translateY(8px)'; setTimeout(()=>t.remove(),300); }, 3000);
}
function animateAdd(btn) {
  btn.style.transform = 'scale(1.4)';
  btn.style.background = 'var(--mint)';
  setTimeout(() => { btn.style.transform=''; btn.style.background=''; }, 340);
}
