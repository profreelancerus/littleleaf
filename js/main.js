// ==================== Global Cart ====================
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// ==================== Load Products ====================
async function loadProducts(jsonFile) {
  try {
    let res = await fetch(jsonFile);
    let data = await res.json();
    let products = data.products || data;

    let grid = document.getElementById("product-grid");
    if (!grid) return;

    grid.innerHTML = "";
    products.forEach(p => {
      let card = document.createElement("div");
      card.className = "product-card";

      // card click => product detail page
      card.onclick = () => {
        window.location.href = `product/product.html?id=${p.id}&cat=${p.category}`;
      };

      // Keep price simple (if you later add old_price you can extend here)
      card.innerHTML = `
        <img src="${p.images[0]}" alt="${escapeHtml(p.name)}" class="product-thumb">
        <h3 class="truncate product-title">${escapeHtml(p.name)}</h3>
        <p class="price">
          ${p.old_price ? `<span class="price-old">${p.currency} ${p.old_price}</span>` : ""}
          <span class="price-current">${p.currency} ${p.price}</span>
        </p>
        <button 
          class="btn-add-to-cart add-btn ${p.stock === 0 ? "out-stock" : ""}" 
          onclick="event.stopPropagation(); addToCart('${p.id}', '${escapeJs(p.name)}', '${p.category}', ${p.stock}, 1)" 
          ${p.stock === 0 ? "disabled" : ""}>
          ${p.stock === 0 ? "Out of Stock" : "Add to Cart"}
        </button>
      `;
      grid.appendChild(card);
    });

  } catch (e) {
    console.error("Error loading products:", e);
  }
  updateCartUI();
}

// small helpers to avoid broken quotes in injected HTML
function escapeJs(s) {
  return String(s).replace(/'/g, "\\'");
}
function escapeHtml(s){
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ==================== Add to Cart ====================
function addToCart(id, name, category, stock, qty = 1) {
  let existing = cart.find(item => item.id === id);
  if (existing) {
    if (existing.qty + qty <= stock) {
      existing.qty += qty;
    } else {
      alert("Stock limit reached!");
    }
  } else {
    if (qty <= stock) {
      cart.push({ id, name, category, qty });
    } else {
      alert("Out of stock!");
    }
  }
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartUI();
}

// ==================== Remove from Cart ====================
function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartUI();
}

// ==================== Update Cart UI ====================
function updateCartUI() {
  let cartDiv = document.getElementById("cart-items");
  if (!cartDiv) return;

  if (cart.length === 0) {
    cartDiv.innerHTML = "Cart is empty";
  } else {
    cartDiv.innerHTML = cart.map((item, i) => `
      <div class="cart-line">
        <span>${i + 1}. ${escapeHtml(item.name)} | ${item.category} | Qty: ${item.qty}</span>
        <button class="remove-btn" onclick="removeFromCart('${item.id}')">&times;</button>
      </div>
    `).join("");
  }

  // WhatsApp Button
let waBtn = document.getElementById("confirm-btn");
if (waBtn) {
  let message = cart.map((item, i) =>
    `${i + 1}. ${item.name} | ${item.category} | Qty: ${item.qty}`
  ) .join("\n");

  waBtn.href = `https://wa.me/8801810962851?text=${encodeURIComponent(message)}`;
  waBtn.setAttribute("target", "_blank"); // <-- নতুন ট্যাবে খোলার জন্য
}

}

// ==================== Product Detail Page ====================
async function loadProductDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const cat = params.get("cat");

  if (!id || !cat) return;

  try {
    let res = await fetch(`../json/${cat}.json`);
    let data = await res.json();
    let products = data.products || data;
    let product = products.find(p => p.id === id);

    if (!product) {
      document.querySelector("main").innerHTML = "<p>Product not found</p>";
      return;
    }

    // Build slides array (images first, then video if present)
    let slides = [];
    if (Array.isArray(product.images)) {
      product.images.forEach(img => slides.push({ type: 'image', src: img }));
    }
    if (product.video) {
      slides.push({ type: 'video', src: product.video });
    }

    // Create gallery slides: each slide is a wrapper .slide (so we can include both img and video)
    let gallery = document.querySelector(".gallery");
    gallery.innerHTML = slides.map((s, idx) => {
      if (s.type === 'image') {
        return `<div class="slide ${idx === 0 ? 'active' : ''}" data-type="image"><img src="${s.src}" alt="${escapeHtml(product.name)}"></div>`;
      } else { // video
        // convert youtube watch url to embed url
        const embedUrl = toYouTubeEmbedUrl(s.src);
        // we set data-src and only set iframe src if this slide is active (so we can pause when hidden)
        return `<div class="slide ${idx === 0 ? 'active' : ''}" data-type="video"><div class="video-wrap">${idx === 0 ? `<iframe src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>` : `<iframe data-src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`}</div></div>`;
      }
    }).join("");

    // Title / description / info
    document.querySelector("h2").innerText = product.name;
    document.querySelector(".pricecurrent").innerHTML = `MRP: ${product.mrp}৳` + (product.offer ? ` - ${product.offer}% ` : '');
    document.querySelector("h1").innerHTML = `Now ${product.price}৳` + (product.old_price ? ` (Old Price: ${product.old_price}৳)` : '');
    document.querySelector(".desc").innerHTML = product.description;
    document.querySelector(".info").innerHTML = `
      <li><strong>Country of Origin:</strong> ${product.country_of_origin}</li>
      <li><strong>Manufacturer:</strong> ${product.manufacturer.name}, ${product.manufacturer.address}</li>
      <li><strong>Importer:</strong> ${product.importer.name}, ${product.importer.address}</li>
      <li><strong>⚠ Note:</strong> ${product.note}</li>
      <li><strong>SKU:</strong> ${product.id}</li>
    `;

    // Quantity Control
    let qty = 1;
    let qtySpan = document.getElementById("qty");
    qtySpan.innerText = qty;
    document.getElementById("qty-plus").onclick = () => {
      if (qty < product.stock) {
        qty++;
        qtySpan.innerText = qty;
      }
    };
    document.getElementById("qty-minus").onclick = () => {
      if (qty > 1) {
        qty--;
        qtySpan.innerText = qty;
      }
    };

    // Add to Cart button initial state (out of stock styling)
    const addBtn = document.getElementById("add-btn");
    if (product.stock === 0) {
      addBtn.classList.add("out-stock");
      addBtn.disabled = true;
      addBtn.innerText = "Out of Stock";
    } else {
      addBtn.classList.remove("out-stock");
      addBtn.disabled = false;
      addBtn.innerText = "Add to Cart";
    }

    // Add to Cart button action
    addBtn.onclick = () => {
      addToCart(product.id, product.name, product.category, product.stock, qty);
    };

    // Initialize gallery after DOM is ready
    initGallery();

  } catch (e) {
    console.error("Error loading product:", e);
  }
  updateCartUI();
}

// helper: convert youtube url (watch or short) to embed url
function toYouTubeEmbedUrl(url) {
  if (!url) return '';
  try {
    // examples:
    // https://www.youtube.com/watch?v=ID
    // https://youtu.be/ID
    // already embed: https://www.youtube.com/embed/ID
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.slice(1);
      return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/watch')) {
        const id = u.searchParams.get('v');
        return `https://www.youtube.com/embed/${id}`;
      } else if (u.pathname.startsWith('/embed/')) {
        return url;
      }
    }
  } catch (e) {
    // fallback: return as-is
    return url;
  }
  return url;
}

// ==================== Gallery Control (supports images + youtube iframe slides) ====================
function initGallery() {
  const gallery = document.querySelector('.gallery');
  if (!gallery) return;

  const slides = Array.from(gallery.querySelectorAll('.slide'));
  if (slides.length === 0) return;

  let current = slides.findIndex(s => s.classList.contains('active'));
  if (current < 0) current = 0;

  function showSlide(index) {
    // bounds
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;

    // hide previous slide
    slides.forEach((s, i) => {
      if (i !== index) {
        s.classList.remove('active');
        // if it contains a video iframe with src, clear it to stop playback
        const iframe = s.querySelector('iframe');
        if (iframe && iframe.getAttribute('src')) {
          // move current src to data-src so we can restore later
          iframe.setAttribute('data-src', iframe.getAttribute('src'));
          iframe.removeAttribute('src');
        }
      }
    });

    // show new slide
    const target = slides[index];
    target.classList.add('active');

    // if the target has an iframe with data-src but no src, restore src
    const iframe = target.querySelector('iframe');
    if (iframe && !iframe.getAttribute('src')) {
      const dataSrc = iframe.getAttribute('data-src');
      if (dataSrc) iframe.setAttribute('src', dataSrc);
    }

    current = index;
  }

  // prev / next buttons
  const nextBtn = document.getElementById('next-btn');
  const prevBtn = document.getElementById('prev-btn');
  if (nextBtn) nextBtn.onclick = () => showSlide((current + 1) % slides.length);
  if (prevBtn) prevBtn.onclick = () => showSlide((current - 1 + slides.length) % slides.length);

  // swipe support (mobile)
  let startX = 0;
  gallery.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  gallery.addEventListener('touchend', e => {
    const endX = e.changedTouches[0].clientX;
    if (startX - endX > 50) showSlide((current + 1) % slides.length);
    if (endX - startX > 50) showSlide((current - 1 + slides.length) % slides.length);
  });

  // keyboard navigation (optional)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') showSlide((current + 1) % slides.length);
    if (e.key === 'ArrowLeft') showSlide((current - 1 + slides.length) % slides.length);
  });
}
 
// ==================== Init ====================
document.addEventListener("DOMContentLoaded", () => {
  updateCartUI();
  // If product page
  if (document.body.classList.contains("product-page")) {
    loadProductDetail();
  }
});
// If main page with product grid
