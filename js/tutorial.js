// ============================================================
//  PopDulce – tutorial.js
//  Tutorial de bienvenida con mascota guía
// ============================================================

const TUTORIAL_KEY = 'pd_tutorial_done';

const STEPS = [
  {
    title: '¡Bienvenida a PopDulce! 🎂',
    text: 'Soy tu guía. Te voy a enseñar cómo hacer tu pedido en tres pasos súper fáciles.',
    target: null,
    position: 'center'
  },
  {
    title: 'Paso 1: Explora el catálogo 🍰',
    text: 'Aquí están todos nuestros productos. Puedes filtrar por categoría. Toca una tarjeta para ver más detalles.',
    target: '#catalog-section',
    position: 'bottom'
  },
  {
    title: 'Paso 2: Agrega al pedido ➕',
    text: 'Toca el botón "+" para agregar un producto rápido, o abre el producto para elegir la cantidad.',
    target: '.btn-quick-add',
    position: 'bottom'
  },
  {
    title: 'Paso 3: Envía tu pedido 📲',
    text: 'Toca el ícono del carrito, escribe tu nombre y número, y pulsa "Pedir por WhatsApp". ¡Listo!',
    target: '#cartBtn',
    position: 'bottom'
  },
  {
    title: '¡Ya sabes cómo pedir! 🩷',
    text: '¿Tienes dudas? Escríbenos al WhatsApp. ¡Estamos aquí para ayudarte!',
    target: null,
    position: 'center'
  }
];

let currentStep = 0;
let overlay, bubble, maskEl;

export function initTutorial() {
  // Siempre mostrar (excepto si el usuario ya lo cerró permanentemente)
  const done = localStorage.getItem(TUTORIAL_KEY);
  
  // Botón flotante "Tutorial" siempre visible
  renderTutorialBtn();

  if (!done) {
    // Pequeño delay para dejar cargar la página
    setTimeout(() => startTutorial(), 800);
  }
}

function renderTutorialBtn() {
  const btn = document.createElement('button');
  btn.id = 'pd-tutorial-btn';
  btn.innerHTML = '<img src="assets/avatar.png" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'inline\'" alt="" /><span style="display:none">🐭</span> Tutorial';
  btn.style.cssText = `
    position:fixed;bottom:5.5rem;right:1rem;
    background:var(--rose-deep,#c9547a);color:#fff;
    border:none;border-radius:30px;padding:.5rem 1rem .5rem .6rem;
    font-family:var(--font-body,'DM Sans',sans-serif);font-size:.8rem;font-weight:600;
    cursor:pointer;z-index:800;
    display:flex;align-items:center;gap:.4rem;
    box-shadow:0 4px 16px rgba(201,84,122,.35);
    transition:transform .18s,box-shadow .18s;
  `;
  const img = btn.querySelector('img');
  img.style.cssText = 'width:24px;height:24px;border-radius:50%;object-fit:cover;background:#fff;';
  btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.08)'; });
  btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  btn.addEventListener('click', startTutorial);
  document.body.appendChild(btn);
}

function startTutorial() {
  currentStep = 0;
  buildOverlay();
  showStep(0);
}

function buildOverlay() {
  // Remove previous if any
  document.getElementById('pd-tutorial-overlay')?.remove();

  overlay = document.createElement('div');
  overlay.id = 'pd-tutorial-overlay';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:1200;pointer-events:none;
    transition:background .3s;
  `;

  // Mask (the dark part with a "hole")
  maskEl = document.createElement('canvas');
  maskEl.id = 'pd-tutorial-mask';
  maskEl.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
  overlay.appendChild(maskEl);

  // Bubble
  bubble = document.createElement('div');
  bubble.id = 'pd-tutorial-bubble';
  bubble.style.cssText = `
    position:absolute;
    background:#fff;border-radius:20px;
    padding:1.2rem 1.3rem 1rem;
    box-shadow:0 8px 32px rgba(0,0,0,.22);
    max-width:min(320px,88vw);
    pointer-events:all;
    z-index:1201;
    font-family:var(--font-body,'DM Sans',sans-serif);
    transition:opacity .25s,transform .25s;
  `;
  overlay.appendChild(bubble);

  // Pointer events on mask area only, not on highlighted element
  overlay.addEventListener('click', e => {
    if (e.target === overlay || e.target === maskEl) nextStep();
  });

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
}

function showStep(index) {
  const step = STEPS[index];
  if (!step) { closeTutorial(); return; }

  const isLast  = index === STEPS.length - 1;
  const isFirst = index === 0;

  // Find target element
  let targetEl = step.target ? document.querySelector(step.target) : null;
  // For btn-quick-add, get first visible one
  if (step.target === '.btn-quick-add') {
    targetEl = document.querySelector('.btn-quick-add');
  }

  // Draw mask
  drawMask(targetEl);

  // Scroll target into view
  if (targetEl) {
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Build bubble content
  const avatarHtml = `
    <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.65rem">
      <div style="width:80px;height:80px;flex-shrink:0;display:flex;align-items:flex-end;justify-content:center">
  <img src="assets/avatar.png" alt="Guía"
       style="width:80px;height:auto;object-fit:contain;filter:drop-shadow(0 2px 6px rgba(201,84,122,.25))"
       onerror="this.style.display='none';this.parentElement.textContent='🐭'" />
</div>
      <div>
        <div style="font-size:.65rem;color:var(--rose-deep,#c9547a);font-weight:700;text-transform:uppercase;letter-spacing:.06em">Tu guía PopDulce</div>
        <div style="font-size:.92rem;font-weight:700;color:#2d2d2d;line-height:1.2">${step.title}</div>
      </div>
    </div>
  `;

  const dotsHtml = STEPS.map((_, i) =>
    `<span style="width:${i===index?'18px':'7px'};height:7px;border-radius:4px;background:${i===index?'var(--rose-deep,#c9547a)':'#e0c0cc'};display:inline-block;transition:width .2s"></span>`
  ).join('');

  bubble.innerHTML = `
    ${avatarHtml}
    <p style="font-size:.85rem;color:#555;line-height:1.55;margin-bottom:1rem">${step.text}</p>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:.5rem">
      <div style="display:flex;gap:.3rem;align-items:center">${dotsHtml}</div>
      <div style="display:flex;gap:.5rem">
        ${!isFirst ? `<button id="pd-tut-prev" style="padding:.42rem .85rem;border-radius:20px;border:1.5px solid var(--rose-light,#f7bfc6);background:#fff;color:var(--rose-deep,#c9547a);font-size:.78rem;cursor:pointer;font-family:inherit">Atrás</button>` : ''}
        ${!isLast
          ? `<button id="pd-tut-next" style="padding:.42rem 1.1rem;border-radius:20px;border:none;background:var(--rose-deep,#c9547a);color:#fff;font-size:.82rem;font-weight:600;cursor:pointer;font-family:inherit">Siguiente →</button>`
          : `<button id="pd-tut-done" style="padding:.42rem 1.1rem;border-radius:20px;border:none;background:var(--rose-deep,#c9547a);color:#fff;font-size:.82rem;font-weight:600;cursor:pointer;font-family:inherit">¡Entendido! 🎉</button>`
        }
      </div>
    </div>
    <button id="pd-tut-skip" style="display:block;width:100%;margin-top:.7rem;padding:.3rem;background:none;border:none;color:#aaa;font-size:.72rem;cursor:pointer;font-family:inherit;text-align:center">Cerrar tutorial</button>
  `;

  document.getElementById('pd-tut-next')?.addEventListener('click', nextStep);
  document.getElementById('pd-tut-prev')?.addEventListener('click', prevStep);
  document.getElementById('pd-tut-done')?.addEventListener('click', () => {
    localStorage.setItem(TUTORIAL_KEY, '1');
    closeTutorial();
  });
  document.getElementById('pd-tut-skip')?.addEventListener('click', () => {
    localStorage.setItem(TUTORIAL_KEY, '1');
    closeTutorial();
  });

  // Position bubble
  positionBubble(targetEl, step.position);
}

function positionBubble(targetEl, position) {
  bubble.style.opacity = '0';
  bubble.style.transform = 'translateY(8px)';

  requestAnimationFrame(() => {
    const bW = bubble.offsetWidth  || 300;
    const bH = bubble.offsetHeight || 200;
    const vW = window.innerWidth;
    const vH = window.innerHeight;
    const pad = 12;

    let top, left;

    if (!targetEl || position === 'center') {
      top  = (vH - bH) / 2;
      left = (vW - bW) / 2;
    } else {
      const r = targetEl.getBoundingClientRect();
      // Try below
      if (r.bottom + bH + pad + 20 < vH) {
        top  = r.bottom + pad;
        left = r.left + r.width / 2 - bW / 2;
      } else {
        // Above
        top  = r.top - bH - pad;
        left = r.left + r.width / 2 - bW / 2;
      }
    }

    // Clamp
    left = Math.max(pad, Math.min(left, vW - bW - pad));
    top  = Math.max(pad, Math.min(top,  vH - bH - pad));

    bubble.style.left = left + 'px';
    bubble.style.top  = top  + 'px';

    requestAnimationFrame(() => {
      bubble.style.opacity   = '1';
      bubble.style.transform = 'translateY(0)';
    });
  });
}

function drawMask(targetEl) {
  const canvas = maskEl;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Dark overlay
  ctx.fillStyle = 'rgba(0,0,0,0.58)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (targetEl) {
    const r = targetEl.getBoundingClientRect();
    const pad = 10;
    const x   = r.left   - pad;
    const y   = r.top    - pad;
    const w   = r.width  + pad * 2;
    const h   = r.height + pad * 2;
    const rad = 14;

    // Cut out rounded rect (highlight)
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.arcTo(x + w, y,     x + w, y + rad,     rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad);
    ctx.lineTo(x + rad, y + h);
    ctx.arcTo(x, y + h, x, y + h - rad, rad);
    ctx.lineTo(x, y + rad);
    ctx.arcTo(x, y, x + rad, y, rad);
    ctx.closePath();
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';

    // Glowing border around highlight
    ctx.strokeStyle = 'rgba(249,181,196,0.9)';
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.arcTo(x + w, y,     x + w, y + rad,     rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad);
    ctx.lineTo(x + rad, y + h);
    ctx.arcTo(x, y + h, x, y + h - rad, rad);
    ctx.lineTo(x, y + rad);
    ctx.arcTo(x, y, x + rad, y, rad);
    ctx.closePath();
    ctx.stroke();
  }
}

function nextStep() {
  currentStep++;
  if (currentStep >= STEPS.length) { closeTutorial(); return; }
  showStep(currentStep);
}
function prevStep() {
  if (currentStep > 0) { currentStep--; showStep(currentStep); }
}

function closeTutorial() {
  overlay?.remove();
  overlay = null;
  document.body.style.overflow = '';
}

// Handle resize
window.addEventListener('resize', () => {
  if (!overlay) return;
  const step = STEPS[currentStep];
  const targetEl = step?.target ? document.querySelector(step.target) : null;
  drawMask(targetEl);
  positionBubble(targetEl, step?.position || 'center');
});
