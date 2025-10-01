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

// ==================== Add / Remove / Update Cart ====================
function addToCart(id, name, category, stock, price, qty = 1) {
  let existing = cart.find(item => item.id === id);
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
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartUI();
  animateCartIcon();

}

// Quantity কমানো
function decreaseQty(id) {
  let item = cart.find(p => p.id === id);
  if (item) {
    if (item.qty > 1) {
      item.qty -= 1;
    } else {
      removeFromCart(id);
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartUI();
  }
}

// Quantity বাড়ানো
function increaseQty(id) {
  let item = cart.find(p => p.id === id);
  if (item && item.qty < item.stock) {
    item.qty += 1;
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartUI();
  }
}

function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartUI();
}

// ==================== Update Cart UI ====================
function updateCartUI() {
  const cartDiv = document.getElementById("cart-items");
  const cartCount = document.getElementById("cart-count");
  if (!cartDiv) return;

  if (cart.length === 0) {
    cartDiv.innerHTML = `
      <div class="empty-cart">
        <img src="/image/cry.jpg" alt="Cart is empty" class="empty-cart-img">
        <p class="empty-text">Cart is empty</p>
      </div>
    `;
    if (cartCount) cartCount.innerText = "0";
  } else {
    let total = 0;
    cartDiv.innerHTML = `
      <div class="cart-slider">
        ${cart.map((item) => {
          let itemTotal = item.price * item.qty;
          total += itemTotal;
          return `
            <div class="cart-slide">
              <span class="cart-name">${item.name} (${item.category})</span>
              <div class="qty-control">
                <button onclick="decreaseQty('${item.id}')">-</button>
                <span>${item.qty}</span>
                <button onclick="increaseQty('${item.id}')">+</button>
              </div>
              <span class="cart-price">${item.price}৳ x ${item.qty} = <b>${itemTotal}৳</b></span>
              <button class="remove-btn" onclick="removeFromCart('${item.id}')">&times;</button>
            </div>
          `;
        }).join("")}
        <div class="cart-total">Total: <b>${total}৳</b></div>
      </div>
    `;
    if (cartCount) cartCount.innerText = cart.reduce((sum, item) => sum + item.qty, 0);
  }

  // ==================== WhatsApp Button update ====================
  const waBtn = document.getElementById("confirm-btn");
  if (waBtn) {
    // এখানে শুধু নাম + quantity যাবে
    const message = cart.map((item, i) =>
      `${i + 1}. ${item.name} | Qty: ${item.qty}`
    ).join("\n");

    waBtn.href = `https://wa.me/8801810962851?text=${encodeURIComponent(message)}`;
    waBtn.setAttribute("target", "_blank");
  }
}

// ==================== Change Quantity (for mini cart buttons) ====================

function changeQty(id, delta) {
  const idx = cart.findIndex(it => it.id === id);
  if (idx === -1) return;
  const item = cart[idx];
  const newQty = item.qty + delta;
  if (newQty <= 0) {
    // remove
    cart.splice(idx, 1);
  } else {
    // check stock? We don't have stock in cart items here except when added — assume ok
    item.qty = newQty;
  }
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartUI();
}

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
