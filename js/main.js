// ==================== Global Cart ====================
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// ==================== Helpers ====================
function escapeJs(s) {
  return String(s).replace(/'/g, "\\'");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toYouTubeEmbedUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/watch')) return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
      if (u.pathname.startsWith('/embed/')) return url;
    }
  } catch { return url; }
  return url;
}

// ==================== Load Products ====================
async function loadProducts(jsonFile) {
  try {
    let res = await fetch(jsonFile);
    let data = await res.json();
    let products = data.products || data;

    const grid = document.getElementById("product-grid");
    if (!grid) return;

    grid.innerHTML = "";
    products.forEach(p => {
      const card = document.createElement("div");
      card.className = "product-card";
      card.onclick = () => window.location.href = `product/product.html?id=${p.id}&cat=${p.category}`;

      card.innerHTML = `
        <img src="${p.images[0]}" alt="${escapeHtml(p.name)}" class="product-thumb">
        <h3 class="truncate product-title">${escapeHtml(p.name)}</h3>
        <p class="price">
          ${p.old_price ? `<span class="price-old">${p.currency} ${p.old_price}</span>` : ""}
          <span class="price-current">${p.currency} ${p.price}</span>
        </p>
        <button 
          class="btn-add-to-cart add-btn ${p.stock === 0 ? "out-stock" : ""}" 
          onclick="event.stopPropagation(); addToCart('${p.id}', '${escapeJs(p.name)}', '${p.category}', ${p.stock}, ${p.price}, 1)" 
          ${p.stock === 0 ? "disabled" : ""}>
          ${p.stock === 0 ? "Out of Stock" : "Add to Cart"}
        </button>
      `;
      grid.appendChild(card);
    });

    animateOnScroll();
    updateCartUI();

  } catch (e) {
    console.error("Error loading products:", e);
  }
}

// ===== keep your existing Add/Remove/Update functions (unchanged) =====

// ==================== Add / Remove / Update Cart ====================
function addToCart(id, name, category, stock, price, qty = 1) {
  id = String(id);
  let existing = cart.find(item => String(item.id) === id);
  if (existing) {
    if (existing.qty + qty <= stock) {
      existing.qty += qty;
    } else {
      return alert("Stock limit reached!");
    }
  } else {
    if (qty <= stock) {
      cart.push({ id, name, category, price, qty, stock });
    } else {
      return alert("Out of stock!");
    }
  }
  // mark last updated for animation (optional)
  window.lastUpdatedId = id;
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartUI();
  animateCartIcon && animateCartIcon();
}

// Quantity কমানো
function decreaseQty(id) {
  id = String(id);
  let item = cart.find(p => String(p.id) === id);
  if (item) {
    if (item.qty > 1) {
      item.qty -= 1;
    } else {
      removeFromCart(id);
      return;
    }
    window.lastUpdatedId = id;
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartUI();
  }
}

// Quantity বাড়ানো
function increaseQty(id) {
  id = String(id);
  let item = cart.find(p => String(item.id) === id);
  if (item && item.qty < (item.stock || Infinity)) {
    item.qty += 1;
    window.lastUpdatedId = id;
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartUI();
  }
}

function removeFromCart(id) {
  id = String(id);
  cart = cart.filter(item => String(item.id) !== id);
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartUI();
}

// helper escapes (if not already present)
function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeJs(s) {
  return String(s == null ? "" : s).replace(/'/g, "\\'");
}

// Robust increase/decrease/remove that operate on the global cart variable
function safeIncreaseQtyById(id) {
  id = String(id);
  let item = cart.find(p => String(p.id) === id);
  if (!item) return;
  const stock = Number(item.stock || Infinity);
  const qty = Number(item.qty || 0);
  if (qty < stock) {
    item.qty = qty + 1;
    window.lastUpdatedId = id;
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
  } else {
    // optional: small feedback
    // alert("Stock limit reached!");
  }
}
function safeDecreaseQtyById(id) {
  id = String(id);
  let item = cart.find(p => String(p.id) === id);
  if (!item) return;
  if (item.qty > 1) {
    item.qty = Number(item.qty) - 1;
    window.lastUpdatedId = id;
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
  } else {
    // remove
    removeFromCart(id);
  }
}
function safeRemoveById(id) {
  removeFromCart(String(id)); // reuse existing remove
}

// Updated updateCartUI that uses data-action buttons and attaches listeners
function updateCartUI() {
  const cartDiv = document.getElementById("cart-items");
  const cartCount = document.getElementById("cart-count");
  const cartHeader = document.querySelector(".mini-cart .cart-header");
  const cartFooter = document.querySelector(".mini-cart .cart-footer");
  if (!cartDiv) return;

  // ensure cart in memory
  if (typeof cart === 'undefined' || !Array.isArray(cart)) {
    try { cart = JSON.parse(localStorage.getItem('cart')) || []; } catch (e) { cart = []; }
  }

  if (!cart || cart.length === 0) {
    cartDiv.innerHTML = `
      <div class="empty-cart" style="text-align:center; padding:18px;">
        <img src="/image/cry.jpg" alt="Cart is empty" class="empty-cart-img">
        <p class="empty-text">Cart is empty</p>
      </div>
    `;
    if (cartCount) cartCount.innerText = "0";
    if (cartHeader) cartHeader.innerHTML = `<h4 style="margin:0; font-size:15px; color:#333;">Total:</h4><div id="cart-total-amount" style="font-weight:700; color:#e63946; margin-top:6px;">0৳</div>`;
    const waBtn = document.getElementById("confirm-btn");
    if (waBtn) { waBtn.href = "#"; waBtn.removeAttribute("target"); waBtn.classList && waBtn.classList.add('disabled'); }
    if (cartFooter) cartFooter.style.display = "none";
    return;
  }

  if (cartFooter) cartFooter.style.display = "";

  let total = 0;
  const itemsHtml = cart.map(item => {
    const itemPrice = Number(item.price || 0);
    const itemQty = Number(item.qty || 0);
    const itemTotal = itemPrice * itemQty;
    total += itemTotal;

    // data attributes for attaching listeners later
    return `
      <div class="cart-slide" data-id="${escapeHtml(item.id)}">
        <div class="left">
          <div class="cart-name">${escapeHtml(item.name)}</div>
          <div class="cart-meta" style="gap:10px; align-items:center;">
            <div class="qty-control" role="group" aria-label="Quantity controls">
              <button class="qty-decrease" data-id="${escapeHtml(item.id)}" aria-label="Decrease">−</button>
              <div class="qty-number">${itemQty}</div>
              <button class="qty-increase" data-id="${escapeHtml(item.id)}" aria-label="Increase">＋</button>
            </div>
            <div style="color:#6b7885; font-size:13px;">${escapeHtml(item.category || '')}</div>
          </div>
        </div>

        <div class="right">
          <div class="price">${itemPrice}৳</div>
          <div class="line-total">= <strong>${itemTotal}৳</strong></div>
          <div><button class="remove-btn" data-id="${escapeHtml(item.id)}" title="Remove">&times;</button></div>
        </div>
      </div>
    `;
  }).join('');

  cartDiv.innerHTML = `<div class="cart-slider">${itemsHtml}</div>`;

  // attach listeners AFTER rendering
  // increase
  cartDiv.querySelectorAll('.qty-increase').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = btn.getAttribute('data-id');
      safeIncreaseQtyById(id);
    });
  });
  // decrease
  cartDiv.querySelectorAll('.qty-decrease').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = btn.getAttribute('data-id');
      safeDecreaseQtyById(id);
    });
  });
  // remove
  cartDiv.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = btn.getAttribute('data-id');
      safeRemoveById(id);
    });
  });

  // Grey out increase button if at stock limit (visual feedback)
  cart.forEach(item => {
    const stock = Number(item.stock || Infinity);
    const increaseBtn = cartDiv.querySelector(`.qty-increase[data-id="${escapeHtml(item.id)}"]`);
    if (increaseBtn) {
      if (Number(item.qty || 0) >= stock) {
        increaseBtn.classList.add('disabled');
        increaseBtn.setAttribute('aria-disabled', 'true');
      } else {
        increaseBtn.classList.remove('disabled');
        increaseBtn.removeAttribute('aria-disabled');
      }
    }
  });

  // update header total
  if (cartHeader) {
    cartHeader.innerHTML = `
      <div class="total-wrap">
        <h4 style="margin:0; font-size:15px; color:#333;">Total:</h4>
        <div id="cart-total-amount">${total}৳</div>
      </div>
    `;
  }

  // update badge and whatsapp
  if (cartCount) cartCount.innerText = cart.reduce((s,it) => s + Number(it.qty || 0), 0);
  const waBtn = document.getElementById("confirm-btn");
  if (waBtn) {
    const message = cart.map((it,i) => `${i+1}. ${it.name} | Qty: ${it.qty}`).join("\n");
    waBtn.href = `https://wa.me/8801410009588?text=${encodeURIComponent(message)}`;
    waBtn.setAttribute("target", "_blank");
    waBtn.classList && waBtn.classList.remove('disabled');
  }

  // highlight last updated
  if (window.lastUpdatedId) {
    const el = cartDiv.querySelector(`.cart-slide[data-id="${escapeHtml(String(window.lastUpdatedId))}"]`);
    if (el && el.animate) {
      el.animate([
        { transform: 'scale(1)', boxShadow: '0 10px 30px rgba(22,35,55,0.08)' },
        { transform: 'scale(1.02)', boxShadow: '0 18px 46px rgba(22,35,55,0.10)' },
        { transform: 'scale(1)', boxShadow: '0 10px 30px rgba(22,35,55,0.08)' }
      ], { duration: 340, easing: 'ease-out' });
    }
    window.lastUpdatedId = undefined;
  }
}

// ensure cart loads on page load
document.addEventListener('DOMContentLoaded', function() {
  try { cart = JSON.parse(localStorage.getItem('cart')) || cart || []; } catch(e) { cart = cart || []; }
  updateCartUI();
});


// ==================== Animate Product Cards ====================
function animateOnScroll() {
  const cards = document.querySelectorAll(".product-card");
  if (!cards || !cards.length) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  cards.forEach(card => observer.observe(card));
}

// ==================== Product Detail Page ====================
async function loadProductDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const cat = params.get("cat");

  if (!id || !cat) return;

  try {
    const res = await fetch(`../json/${cat}.json`);
    const data = await res.json();
    const products = data.products || data;
    const product = products.find(p => p.id === id);
    if (!product) { document.querySelector("main").innerHTML = "<p>Product not found</p>"; return; }

    let slides = [];
    if (Array.isArray(product.images)) slides.push(...product.images.map(img => ({ type:'image', src:img })));
    if (product.video) slides.push({ type:'video', src: product.video });

    const gallery = document.querySelector(".gallery");
    if (gallery) {
      gallery.innerHTML = slides.map((s, idx) => {
        if (s.type === 'image') return `<div class="slide ${idx===0?'active':''}" data-type="image"><img src="${s.src}" alt="${escapeHtml(product.name)}"></div>`;
        const embedUrl = toYouTubeEmbedUrl(s.src);
        return `<div class="slide ${idx===0?'active':''}" data-type="video"><div class="video-wrap">${idx===0?`<iframe src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`:`<iframe data-src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`}</div></div>`;
      }).join("");
    }

    const h2 = document.querySelector("h2");
    if (h2) h2.innerText = product.name;
    const priceCurrentEl = document.querySelector(".pricecurrent");
    if (priceCurrentEl) priceCurrentEl.innerHTML = `MRP: ${product.mrp || product.price}৳` + (product.offer ? ` - ${product.offer}%` : '');
    const h1 = document.querySelector("h1");
    if (h1) h1.innerHTML = `Now ${product.price}৳` + (product.old_price ? ` (Old Price: ${product.old_price}৳)` : '');
    const desc = document.querySelector(".desc");
    if (desc) desc.innerHTML = product.description;
    const info = document.querySelector(".info");
    if (info) info.innerHTML = `
      <li><strong>Country of Origin:</strong> ${product.country_of_origin}</li>
      <li><strong>Manufacturer:</strong> ${product.manufacturer.name}, ${product.manufacturer.address}</li>
      <li><strong>Importer:</strong> ${product.importer.name}, ${product.importer.address}</li>
      <li><strong>⚠ Note:</strong> ${product.note}</li>
      <li><strong>SKU:</strong> ${product.id}</li>
    `;

    // quantity UI
    let qty = 1;
    const qtySpan = document.getElementById("qty");
    if (qtySpan) qtySpan.innerText = qty;
    const plus = document.getElementById("qty-plus");
    const minus = document.getElementById("qty-minus");
    if (plus) plus.onclick = () => { if (qty < (product.stock || 9999)) { qty++; if (qtySpan) qtySpan.innerText = qty; } };
    if (minus) minus.onclick = () => { if (qty > 1) { qty--; if (qtySpan) qtySpan.innerText = qty; } };

    const addBtn = document.getElementById("add-btn");
    if (addBtn) {
      if (product.stock === 0) { addBtn.classList.add("out-stock"); addBtn.disabled = true; addBtn.innerText = "Out of Stock"; }
      else { addBtn.classList.remove("out-stock"); addBtn.disabled = false; addBtn.innerText = "Add to Cart"; }
      addBtn.onclick = () => addToCart(product.id, product.name, product.category, product.stock, product.price || 0, qty);
    }

    initGallery();

  } catch(e){ console.error("Error loading product:", e); }
  updateCartUI();
}

// ==================== Gallery ====================
function initGallery() {
  const gallery = document.querySelector('.gallery');
  if(!gallery) return;
  const slides = Array.from(gallery.querySelectorAll('.slide'));
  if(slides.length===0) return;

  let current = slides.findIndex(s=>s.classList.contains('active'));
  if(current<0) current=0;

  function showSlide(index){
    if(index<0) index=slides.length-1;
    if(index>=slides.length) index=0;

    slides.forEach((s,i)=>{
      if(i!==index){ s.classList.remove('active'); const iframe=s.querySelector('iframe'); if(iframe && iframe.src){iframe.setAttribute('data-src',iframe.src); iframe.removeAttribute('src');} }
    });

    const target = slides[index]; target.classList.add('active');
    const iframe = target.querySelector('iframe'); if(iframe && !iframe.src){const dataSrc=iframe.getAttribute('data-src'); if(dataSrc) iframe.src=dataSrc;}
    current=index;
  }

  const nextBtn = document.getElementById('next-btn');
  const prevBtn = document.getElementById('prev-btn');
  if(nextBtn) nextBtn.onclick=()=>showSlide((current+1)%slides.length);
  if(prevBtn) prevBtn.onclick=()=>showSlide((current-1+slides.length)%slides.length);

  let startX=0;
  gallery.addEventListener('touchstart', e=>{startX=e.touches[0].clientX;},{passive:true});
  gallery.addEventListener('touchend', e=>{const endX=e.changedTouches[0].clientX;if(startX-endX>50) showSlide((current+1)%slides.length);if(endX-startX>50) showSlide((current-1+slides.length)%slides.length);},{passive:true});

  document.addEventListener('keydown', e=>{ if(e.key==='ArrowRight') showSlide((current+1)%slides.length); if(e.key==='ArrowLeft') showSlide((current-1+slides.length)%slides.length); });
}

// ==================== Cart Icon Drag & Mini Cart ====================
const cartIconEl = document.getElementById("cart-icon");
const miniCartEl = document.getElementById("mini-cart");
let isDragging=false, offsetX, offsetY, startX, startY, moved=false;

function startDrag(x,y){
  if(!cartIconEl) return;
  isDragging=true; moved=false;
  startX=x; startY=y;
  const rect = cartIconEl.getBoundingClientRect();
  offsetX = x - rect.left;
  offsetY = y - rect.top;
  cartIconEl.style.transition="none";
}
function moveDrag(x,y){
  if(!isDragging || !cartIconEl) return;
  let dx=Math.abs(x-startX), dy=Math.abs(y-startY);
  if(dx>5 || dy>5) moved=true;
  let nx = x - offsetX, ny = y - offsetY;
  const maxX = window.innerWidth - cartIconEl.offsetWidth;
  const maxY = window.innerHeight - cartIconEl.offsetHeight;
  nx = Math.max(0, Math.min(nx, maxX));
  ny = Math.max(0, Math.min(ny, maxY));
  cartIconEl.style.left = nx + 'px';
  cartIconEl.style.top = ny + 'px';
  cartIconEl.style.right = 'auto';
  cartIconEl.style.bottom = 'auto';
}
function endDrag(){
  if(!cartIconEl) return;
  if(isDragging){
    isDragging=false;
    cartIconEl.style.transition="transform 0.2s";
  }
}

if (cartIconEl) {
  cartIconEl.addEventListener('mousedown', e => startDrag(e.clientX, e.clientY));
  document.addEventListener('mousemove', e => moveDrag(e.clientX, e.clientY));
  document.addEventListener('mouseup', endDrag);

  cartIconEl.addEventListener('touchstart', e => startDrag(e.touches[0].clientX, e.touches[0].clientY), {passive:true});
  document.addEventListener('touchmove', e => {
    if(e.touches && e.touches[0]) moveDrag(e.touches[0].clientX, e.touches[0].clientY);
  }, {passive:true});
  document.addEventListener('touchend', endDrag);

  // Toggle mini cart (safe)
  cartIconEl.addEventListener('click', e => {
    if (moved) return; // if dragged, don't toggle
    if (!miniCartEl) return;
    miniCartEl.classList.toggle('show'); // uses CSS .mini-cart.show{right:0}
  });
}

// Also add close inside mini cart if button present
const closeBtn = document.getElementById("close-cart");
if (closeBtn && miniCartEl) closeBtn.addEventListener('click', () => miniCartEl.classList.remove('show'));

// ==================== Init ====================
document.addEventListener("DOMContentLoaded", ()=> {
  // update UI from localStorage
  updateCartUI();

  // load products on homepage (if you use body class "home-page")
  if (document.body.classList.contains("home-page")) {
    // change path to your JSON path if needed
    loadProducts("json/kodomo.json");
  } else {
    // if main page's inline script already called loadProducts with another path, that's fine
  }

  animateOnScroll();

  if (document.body.classList.contains("product-page")) {
    loadProductDetail();
  }
});
// ==================== End of File ====================
// ==================== Cart Icon Big Bounce ====================
function animateCartIcon() {
  const cartIcon = document.getElementById("cart-icon");

  // bounce class add
  cartIcon.classList.add("bounce");

  // কিছু সময় পর আবার remove
  setTimeout(() => {
    cartIcon.classList.remove("bounce");
  }, 600); // bounce সময়
}

// ==================== Animate Product Cards ====================
function animateOnScroll() {
  const cards = document.querySelectorAll(".product-card");

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        observer.unobserve(entry.target); // একবার animate হলে আবার হবে না
      }
    });
  }, { threshold: 0.2 });

  cards.forEach(card => observer.observe(card));
}

// যখন document ready হবে তখন scroll animation চালাও
document.addEventListener("DOMContentLoaded", () => {
  animateOnScroll();
});
function animateCartIcon() {
  const cartIcon = document.getElementById("cart-icon");
  cartIcon.classList.add("animate");

  setTimeout(() => {
    cartIcon.classList.remove("animate");
  }, 900); // bounce সময় অনুযায়ী
}

// addToCart এর শেষে শুধু এটা কল করো 👇
animateCartIcon();
const backCartBtn = document.getElementById("back-btn");
const miniCartOverlay = document.getElementById("mini-cart-overlay"); // যদি overlay থাকে

// Back button click → close mini-cart
backCartBtn.addEventListener("click", () => {
  miniCartEl.classList.remove("show");
  if(miniCartOverlay) miniCartOverlay.classList.remove("show");
});
const cartIcon = document.getElementById("cart-icon");
const miniCart = document.getElementById("mini-cart");
const backBtn = document.getElementById("back-btn");

// Cart icon click → open mini cart
cartIcon.addEventListener("click", () => {
  miniCart.classList.add("show");
});

// Back button click → close mini cart
backBtn.addEventListener("click", () => {
  miniCart.classList.remove("show");
});
// Close mini-cart when clicking / touching outside of it.
// Put this after miniCartEl and cartIconEl are defined.

(function enableOutsideCloseMiniCart() {
  // get elements (in case they weren't captured earlier)
  const mini = document.getElementById('mini-cart');
  const icon = document.getElementById('cart-icon');
  if (!mini) return; // nothing to do

  // ensure clicks inside mini don't bubble to document (safety - harmless if already present)
  mini.addEventListener('click', function (e) { e.stopPropagation(); });

  // optional: if you have a side-panel close/back button ensure it also stops propagation
  const insideBtns = mini.querySelectorAll('button, a');
  insideBtns.forEach(btn => btn.addEventListener('click', e => e.stopPropagation()));

  // click outside -> close
  document.addEventListener('click', function (e) {
    // if mini not open, ignore
    if (!mini.classList.contains('show')) return;
    // if click on cart icon (toggle) ignore
    if (icon && icon.contains(e.target)) return;
    // if click inside mini ignore (should be prevented above), otherwise close
    if (!mini.contains(e.target)) mini.classList.remove('show');
  });

  // also handle touch on mobile
  document.addEventListener('touchstart', function (e) {
    if (!mini.classList.contains('show')) return;
    if (icon && icon.contains(e.target)) return;
    if (!mini.contains(e.target)) mini.classList.remove('show');
  }, { passive: true });
})();
//new application code can be added here
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then(() => console.log("✅ Service Worker Registered"))
      .catch(err => console.log("❌ SW Error", err));
  });
}
 let deferredPrompt;
const installBtn = document.getElementById("installAppBtn");

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = "block";
});

installBtn?.addEventListener("click", () => {
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(() => {
    installBtn.style.display = "none";
  });
});
// installation code ends here