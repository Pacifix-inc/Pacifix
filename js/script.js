/* ==========================================
   PACIFIX - FRONTEND LOGIC & STATE MANAGEMENT
   ========================================== */

let productsState = [];
let cart = JSON.parse(localStorage.getItem('pacifix_cart')) || [];

// Initialize Page
document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();
    
    // Check if on product list page or detail page
    if (document.getElementById('product-grid')) {
        loadProductCatalog();
    } else if (document.getElementById('product-detail-container')) {
        loadProductDetail();
    }
    
    setupCartDrawerEvents();
});

/* ------------------------------------------
   DATABASE FETCH & CARD RENDERING (index.html)
   ------------------------------------------ */
async function loadProductCatalog() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('Failed to fetch product catalog');
        
        productsState = await response.json();
        renderProductCards(productsState);
    } catch (err) {
        console.error('Catalog Error:', err);
        grid.innerHTML = `<p class="error-msg">Failed to load products from database.</p>`;
    }
}

function getMainImage(product) {
    if (product.images && product.images["1"]) {
        return product.images["1"];
    }
    if (typeof product.image === 'string' && product.image.trim() !== "") {
        return product.image;
    }
    return 'https://via.placeholder.com/400x400?text=No+Image';
}

function renderProductCards(products) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    grid.innerHTML = products.map(product => {
        const primaryImg = getMainImage(product);
        
        return `
            <div class="product-card">
                <a href="product.html?id=${product.id}" class="card-media-link">
                    <img src="${primaryImg}" alt="${product.name}" class="card-img" loading="lazy" />
                </a>
                <div class="card-info">
                    <span class="category-tag">${product.category || 'General'}</span>
                    <a href="product.html?id=${product.id}" class="card-title-link">
                        <h3 class="product-title">${product.name}</h3>
                    </a>
                    <div class="card-bottom">
                        <span class="current-price">$${Number(product.priceUSD).toFixed(2)}</span>
                        <button class="add-to-cart-btn" onclick="addToCart(${product.id}, event)">
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                            </svg>
                            Add
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/* ------------------------------------------
   MULTI-IMAGE DETAIL PAGE (product.html)
   ------------------------------------------ */
async function loadProductDetail() {
    const detailContainer = document.getElementById('product-detail-container');
    if (!detailContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        detailContainer.innerHTML = `<p class="error-msg">Product ID missing in URL.</p>`;
        return;
    }

    try {
        const response = await fetch(`/api/products?id=${productId}`);
        if (!response.ok) throw new Error('Product not found');
        
        const product = await response.json();
        
        // Extract array of images ordered by keys ("1", "2", "3"...)
        let imageList = [];
        if (product.images && typeof product.images === 'object') {
            const keys = Object.keys(product.images).sort((a, b) => Number(a) - Number(b));
            imageList = keys.map(k => product.images[k]).filter(url => url && url.trim() !== "");
        }
        
        // Fallback if no images object or empty
        if (imageList.length === 0) {
            imageList.push(getMainImage(product));
        }

        renderProductDetailPage(product, imageList);
    } catch (err) {
        console.error('Detail Page Error:', err);
        detailContainer.innerHTML = `<p class="error-msg">Unable to load product details.</p>`;
    }
}

function renderProductDetailPage(product, imageList) {
    const detailContainer = document.getElementById('product-detail-container');
    
    // Main main-image starts with index 0
    const mainImgSrc = imageList[0];
    
    // Build thumbnails only if there are 2 or more images
    const hasMultipleImages = imageList.length > 1;
    const thumbnailsHTML = hasMultipleImages ? `
        <div class="thumbnail-gallery">
            ${imageList.map((imgUrl, idx) => `
                <img 
                    src="${imgUrl}" 
                    class="thumb-item ${idx === 0 ? 'active' : ''}" 
                    onclick="switchMainImage('${imgUrl}', this)"
                    alt="Thumbnail ${idx + 1}"
                />
            `).join('')}
        </div>
    ` : '';

    detailContainer.innerHTML = `
        <div class="product-detail-layout">
            <div class="gallery-column">
                <div class="main-image-wrapper">
                    <img id="primary-product-image" src="${mainImgSrc}" alt="${product.name}" />
                </div>
                ${thumbnailsHTML}
            </div>
            
            <div class="info-column">
                <span class="detail-category">${product.category || 'General'}</span>
                <h1 class="p-title">${product.name}</h1>
                <p class="p-price">$${Number(product.priceUSD).toFixed(2)}</p>
                <p class="p-desc">${product.description || 'No description provided.'}</p>
                
                <div class="p-action-buttons">
                    <button class="btn-primary" onclick="addToCart(${product.id})">Add to Cart</button>
                </div>
            </div>
        </div>
    `;
}

function switchMainImage(src, thumbElement) {
    const mainImg = document.getElementById('primary-product-image');
    if (mainImg) mainImg.src = src;

    document.querySelectorAll('.thumb-item').forEach(el => el.classList.remove('active'));
    if (thumbElement) thumbElement.classList.add('active');
}

/* ------------------------------------------
   CART SYSTEM & DRAWER MANAGEMENT
   ------------------------------------------ */
function addToCart(productId, event) {
    if (event) event.stopPropagation();

    // If item exists in current state, fetch details
    let product = productsState.find(p => p.id == productId);
    
    if (!product) {
        // Fallback fetch if added directly from product details page
        fetch(`/api/products?id=${productId}`)
            .then(res => res.json())
            .then(data => executeAddToCart(data))
            .catch(err => console.error(err));
    } else {
        executeAddToCart(product);
    }
}

function executeAddToCart(product) {
    const existing = cart.find(item => item.id == product.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            priceUSD: product.priceUSD,
            image: getMainImage(product),
            quantity: 1
        });
    }

    saveCart();
    openCartDrawer();
}

function updateCartBadge() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    badge.textContent = totalItems;
}

function saveCart() {
    localStorage.setItem('pacifix_cart', JSON.stringify(cart));
    updateCartBadge();
    renderCartItems();
}

function setupCartDrawerEvents() {
    const cartIcon = document.getElementById('cart-icon-btn');
    const closeBtn = document.getElementById('close-drawer-btn');
    const overlay = document.getElementById('drawer-overlay');

    if (cartIcon) cartIcon.addEventListener('click', openCartDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeCartDrawer);
    if (overlay) overlay.addEventListener('click', closeCartDrawer);
}

function openCartDrawer() {
    renderCartItems();
    document.getElementById('cart-drawer')?.classList.add('open');
    document.getElementById('drawer-overlay')?.classList.add('open');
}

function closeCartDrawer() {
    document.getElementById('cart-drawer')?.classList.remove('open');
    document.getElementById('drawer-overlay')?.classList.remove('open');
}

function renderCartItems() {
    const cartContainer = document.getElementById('cart-items-container');
    const totalContainer = document.getElementById('cart-total-price');
    if (!cartContainer) return;

    if (cart.length === 0) {
        cartContainer.innerHTML = `<p class="empty-cart">Your cart is empty.</p>`;
        if (totalContainer) totalContainer.textContent = '$0.00';
        return;
    }

    let grandTotal = 0;
    cartContainer.innerHTML = cart.map(item => {
        const itemTotal = item.priceUSD * item.quantity;
        grandTotal += itemTotal;
        return `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}" />
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>$${item.priceUSD.toFixed(2)} x ${item.quantity}</p>
                </div>
                <button class="remove-btn" onclick="removeFromCart(${item.id})">&times;</button>
            </div>
        `;
    }).join('');

    if (totalContainer) totalContainer.textContent = `$${grandTotal.toFixed(2)}`;
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id != productId);
    saveCart();
}
