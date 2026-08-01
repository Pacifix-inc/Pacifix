/* ==========================================
   PACIFIX - FRONTEND LOGIC & STATE MANAGEMENT
   ========================================== */

// State Management
let productsState = [];
let cart = JSON.parse(localStorage.getItem("pacifix_cart")) || [];
let currentCurrency = localStorage.getItem("pacifix_currency") || "USD";
let currentCategory = "all";

// Currency Configuration
const currencyRates = {
    USD: { symbol: "$", rate: 1.0 },
    EUR: { symbol: "€", rate: 0.92 }
};

// DOM Node References
const currencyToggle = document.getElementById("currency-toggle");
const currencyLabel = document.getElementById("currency-label");
const themeToggle = document.getElementById("theme-toggle");
const cartBtn = document.getElementById("cart-icon-btn") || document.getElementById("cart-btn");
const closeCartBtn = document.getElementById("close-drawer-btn") || document.getElementById("close-cart");
const cartDrawer = document.getElementById("cart-drawer");
const overlay = document.getElementById("drawer-overlay") || document.getElementById("overlay");
const continueShoppingBtn = document.getElementById("continue-shopping");
const buyNowBtn = document.getElementById("buy-now-btn");

// Initialize Page Lifecycle
document.addEventListener("DOMContentLoaded", () => {
    if (window.lucide) lucide.createIcons();
    
    // Sync initial UI states
    if (currencyLabel) currencyLabel.textContent = currentCurrency;
    updateCartBadge();
    setupEventListeners();

    // Route-based data loading
    if (document.getElementById("product-grid")) {
        loadProductCatalog();
    } else if (document.getElementById("product-detail-container") || document.getElementById("main-product-img")) {
        loadProductDetail();
    }
});

/* ------------------------------------------
   UTILITY & FORMATTING HELPERS
   ------------------------------------------ */
function formatPrice(amountInUSD) {
    if (amountInUSD === undefined || amountInUSD === null) return "$0.00";
    const { symbol, rate } = currencyRates[currentCurrency] || currencyRates.USD;
    const converted = (Number(amountInUSD) * rate).toFixed(2);
    return `${symbol}${converted}`;
}

function getMainImage(product) {
    if (product.images && product.images["1"]) {
        return product.images["1"];
    }
    if (typeof product.image === "string" && product.image.trim() !== "") {
        return product.image;
    }
    return "https://via.placeholder.com/400x400?text=No+Image";
}

function saveState() {
    localStorage.setItem("pacifix_cart", JSON.stringify(cart));
    localStorage.setItem("pacifix_currency", currentCurrency);
}

/* ------------------------------------------
   CATALOG FETCH & RENDERING (index.html)
   ------------------------------------------ */
async function loadProductCatalog() {
    const grid = document.getElementById("product-grid");
    if (!grid) return;

    try {
        const response = await fetch("/api/products");
        if (!response.ok) throw new Error("Failed to fetch product catalog");

        productsState = await response.json();
        renderProductCards();
    } catch (err) {
        console.error("Catalog Error:", err);
        grid.innerHTML = `<p style="grid-column: 1/-1; color: red; text-align: center;">Failed to load products from database.</p>`;
    }
}

function renderProductCards() {
    const grid = document.getElementById("product-grid");
    if (!grid) return;

    const searchInput = document.getElementById("search-input");
    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";

    const filtered = productsState.filter((p) => {
        const matchesCategory = currentCategory === "all" || p.category === currentCategory;
        const matchesSearch = p.name.toLowerCase().includes(query);
        return matchesCategory && matchesSearch;
    });

    const productCount = document.getElementById("product-count");
    if (productCount) {
        productCount.textContent = `${filtered.length} product${filtered.length === 1 ? "" : "s"}`;
    }

    if (filtered.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem 0;">No products found.</p>`;
        return;
    }

    grid.innerHTML = filtered.map((product) => {
        const primaryImg = getMainImage(product);
        const originalPriceHTML = product.originalPriceUSD 
            ? `<span class="original-price" style="text-decoration: line-through; opacity: 0.6; margin-left: 0.5rem;">${formatPrice(product.originalPriceUSD)}</span>` 
            : "";

        return `
            <article class="product-card">
                <a href="product.html?id=${product.id}" class="card-media-link">
                    <span class="tag">${product.tag || product.category || "ITEM"}</span>
                    <img src="${primaryImg}" alt="${product.name}" class="card-img" loading="lazy" />
                </a>
                <div class="card-info">
                    <span class="category-tag">${product.category || "General"}</span>
                    <a href="product.html?id=${product.id}" class="card-title-link">
                        <h3 class="product-title">${product.name}</h3>
                    </a>
                    <div class="card-bottom">
                        <div class="price-container">
                            <span class="current-price">${formatPrice(product.priceUSD)}</span>
                            ${originalPriceHTML}
                        </div>
                        <button class="add-to-cart-btn" onclick="addToCart(${product.id}, event)">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                            </svg>
                            Add
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join("");
}

/* ------------------------------------------
   MULTI-IMAGE DETAIL PAGE (product.html)
   ------------------------------------------ */
async function loadProductDetail() {
    const detailContainer = document.getElementById("product-detail-container");
    const urlParams = new URLSearchParams(window.location.search);
    let productId = urlParams.get("id");

    if (!productId && window.location.search) {
        const rawId = window.location.search.replace("?", "");
        productId = parseInt(rawId, 10);
    }

    if (!productId) {
        if (detailContainer) detailContainer.innerHTML = `<p class="error-msg">Product ID missing in URL.</p>`;
        return;
    }

    try {
        const response = await fetch(`/api/products?id=${productId}`);
        if (!response.ok) throw new Error("Product not found");

        const product = await response.json();

        let imageList = [];
        if (product.images && typeof product.images === "object") {
            const keys = Object.keys(product.images).sort((a, b) => Number(a) - Number(b));
            imageList = keys.map((k) => product.images[k]).filter((url) => url && url.trim() !== "");
        }

        if (imageList.length === 0) {
            imageList.push(getMainImage(product));
        }

        renderProductDetailPage(product, imageList);
    } catch (err) {
        console.error("Detail Page Error:", err);
        if (detailContainer) detailContainer.innerHTML = `<p class="error-msg">Unable to load product details.</p>`;
    }
}

function renderProductDetailPage(product, imageList) {
    const detailContainer = document.getElementById("product-detail-container");
    if (!detailContainer) return;

    const mainImgSrc = imageList[0];
    const hasMultipleImages = imageList.length > 1;

    const thumbnailsHTML = hasMultipleImages ? `
        <div class="thumbnail-gallery" id="thumbnail-list">
            ${imageList.map((imgUrl, idx) => `
                <img 
                    src="${imgUrl}" 
                    class="thumb-item ${idx === 0 ? "active" : ""}" 
                    onclick="switchMainImage('${imgUrl}', this)"
                    alt="Thumbnail ${idx + 1}"
                />
            `).join("")}
        </div>
    ` : "";

    let specsHTML = "";
    if (product.specs && typeof product.specs === "object") {
        specsHTML = `
            <div class="specs-container" style="margin-top: 1.5rem;">
                <h4 style="margin-bottom: 0.5rem;">Specifications</h4>
                <div class="specs-table" id="specs-table">
                    ${Object.entries(product.specs).map(([k, v]) => `
                        <div class="spec-row">
                            <div class="spec-key">${k}</div>
                            <div class="spec-val">${v}</div>
                        </div>
                    `).join("")}
                </div>
            </div>
        `;
    }

    detailContainer.innerHTML = `
        <div class="product-detail-layout">
            <div class="gallery-column">
                <div class="main-image-wrapper">
                    <img id="primary-product-image" src="${mainImgSrc}" alt="${product.name}" />
                </div>
                ${thumbnailsHTML}
            </div>
            
            <div class="info-column">
                <span class="detail-category">${(product.category || "General").toUpperCase()}</span>
                <h1 class="p-title" id="p-title">${product.name}</h1>
                <p class="p-brand" id="p-brand" style="opacity:0.7; margin-top: 0.25rem;">By ${product.brand || "Pacifix"}</p>
                
                <div class="price-container" style="margin: 1rem 0;">
                    <span class="p-price" id="p-price" style="font-size: 1.75rem; font-weight: bold;">${formatPrice(product.priceUSD)}</span>
                    ${product.originalPriceUSD ? `<span class="p-orig-price" style="text-decoration: line-through; opacity: 0.6; margin-left: 0.5rem;">${formatPrice(product.originalPriceUSD)}</span>` : ""}
                </div>

                <p class="p-desc" id="product-description">${product.description || "No description provided."}</p>
                
                ${specsHTML}

                <div class="p-action-buttons">
                    <button class="btn-action btn-add-cart" id="p-add-cart-btn" onclick="addToCart(${product.id}, event)">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                        </svg>
                        Add to Cart
                    </button>
                    <button class="btn-action btn-buy-now" id="p-buy-now-btn" onclick="buyNowSingle(${product.id})">
                        Buy Now
                    </button>
                </div>
            </div>
        </div>
    `;
}

function switchMainImage(src, thumbElement) {
    const mainImg = document.getElementById("primary-product-image") || document.getElementById("main-product-img");
    if (mainImg) mainImg.src = src;

    document.querySelectorAll(".thumb-item").forEach((el) => el.classList.remove("active"));
    if (thumbElement) thumbElement.classList.add("active");
}

/* ------------------------------------------
   CART SYSTEM & QUANTITY CONTROLS
   ------------------------------------------ */
function addToCart(productId, event) {
    if (event) event.stopPropagation();

    let product = productsState.find((p) => p.id == productId);

    if (!product) {
        fetch(`/api/products?id=${productId}`)
            .then((res) => res.json())
            .then((data) => executeAddToCart(data))
            .catch((err) => console.error(err));
    } else {
        executeAddToCart(product);
    }
}

function executeAddToCart(product) {
    const existing = cart.find((item) => item.id == product.id);
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

    saveState();
    updateCartBadge();
}

function updateQuantity(productId, delta) {
    const itemIndex = cart.findIndex((i) => i.id == productId);
    if (itemIndex > -1) {
        cart[itemIndex].quantity += delta;
        if (cart[itemIndex].quantity <= 0) {
            cart.splice(itemIndex, 1);
        }
    }
    saveState();
    updateCartBadge();
    renderCartItems();
}

function buyNowSingle(productId) {
    addToCart(productId);
    openCartDrawer();
}

function updateCartBadge() {
    const badge = document.getElementById("cart-count") || document.getElementById("cart-badge");
    if (!badge) return;
    
    // Counts distinct product types instead of total items count
    const distinctItemTypesCount = cart.length;
    badge.textContent = distinctItemTypesCount;
}

function renderCartItems() {
    const cartContainer = document.getElementById("cart-items-container") || document.getElementById("cart-items");
    const totalContainer = document.getElementById("cart-total-price");
    const emptyCartView = document.getElementById("empty-cart");
    const cartContentWrapper = document.getElementById("cart-content-wrapper");

    if (!cartContainer) return;

    if (cart.length === 0) {
        if (emptyCartView) emptyCartView.style.display = "flex";
        if (cartContentWrapper) cartContentWrapper.style.display = "none";
        cartContainer.innerHTML = `<p class="empty-cart" style="text-align: center; padding: 2rem; color: #888;">Your cart is empty.</p>`;
        if (totalContainer) totalContainer.textContent = formatPrice(0);
        return;
    }

    if (emptyCartView) emptyCartView.style.display = "none";
    if (cartContentWrapper) cartContentWrapper.style.display = "flex";

    let grandTotalUSD = 0;
    cartContainer.innerHTML = cart.map((item) => {
        const itemTotalUSD = item.priceUSD * item.quantity;
        grandTotalUSD += itemTotalUSD;

        return `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}" class="cart-item-img" />
                <div class="cart-item-info">
                    <h4 class="cart-item-title">${item.name}</h4>
                    <p class="cart-item-price">${formatPrice(item.priceUSD)}</p>
                    <div class="cart-quantity-controls">
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">&minus;</button>
                        <span class="qty-val">${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">&plus;</button>
                    </div>
                </div>
                <button class="remove-btn" onclick="removeFromCart(${item.id})" aria-label="Remove item">&times;</button>
            </div>
        `;
    }).join("");

    if (totalContainer) totalContainer.textContent = formatPrice(grandTotalUSD);
}

function removeFromCart(productId) {
    cart = cart.filter((item) => item.id != productId);
    saveState();
    updateCartBadge();
    renderCartItems();
}

function openCartDrawer() {
    renderCartItems();
    if (cartDrawer) {
        cartDrawer.classList.add("open");
        cartDrawer.classList.add("active");
    }
    if (overlay) {
        overlay.classList.add("open");
        overlay.classList.add("active");
    }
    document.body.style.overflow = "hidden";
}

function closeCartDrawer() {
    if (cartDrawer) {
        cartDrawer.classList.remove("open");
        cartDrawer.classList.remove("active");
    }
    if (overlay) {
        overlay.classList.remove("open");
        overlay.classList.remove("active");
    }
    document.body.style.overflow = "";
}

/* ------------------------------------------
   GLOBAL EVENT LISTENERS
   ------------------------------------------ */
function setupEventListeners() {
    if (currencyToggle) {
        currencyToggle.addEventListener("click", () => {
            currentCurrency = currentCurrency === "USD" ? "EUR" : "USD";
            if (currencyLabel) currencyLabel.textContent = currentCurrency;
            saveState();
            renderProductCards();
            renderCartItems();
            
            if (document.getElementById("product-detail-container")) {
                loadProductDetail();
            }
        });
    }

    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            const currentTheme = document.documentElement.getAttribute("data-theme");
            const newTheme = currentTheme === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", newTheme);
            const icon = themeToggle.querySelector("i");
            if (icon) icon.setAttribute("data-lucide", newTheme === "dark" ? "moon" : "sun");
            if (window.lucide) lucide.createIcons();
        });
    }

    document.querySelectorAll(".category-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".category-btn").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            currentCategory = btn.dataset.category || "all";
            renderProductCards();
        });
    });

    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        searchInput.addEventListener("input", renderProductCards);
    }

    if (cartBtn) cartBtn.addEventListener("click", openCartDrawer);
    if (closeCartBtn) closeCartBtn.addEventListener("click", closeCartDrawer);
    if (overlay) overlay.addEventListener("click", closeCartDrawer);
    if (continueShoppingBtn) continueShoppingBtn.addEventListener("click", closeCartDrawer);

    if (buyNowBtn) {
        buyNowBtn.addEventListener("click", async () => {
            if (cart.length === 0) {
                alert("Your cart is empty!");
                return;
            }

            // Disable button temporarily to prevent duplicate clicks
            buyNowBtn.disabled = true;
            buyNowBtn.textContent = "Processing...";

            try {
                const response = await fetch("/api/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ cart })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    alert("Order placed successfully! Thank you for shopping with Pacifix.");
                    
                    // Clear cart & close drawer
                    cart = [];
                    saveState();
                    updateCartBadge();
                    renderCartItems();
                    closeCartDrawer();
                } else {
                    alert(data.error || "Something went wrong with your order.");
                }
            } catch (err) {
                console.error("Checkout request failed:", err);
                alert("Unable to process checkout. Please try again.");
            } finally {
                buyNowBtn.disabled = false;
                buyNowBtn.textContent = "Checkout / Buy Now";
            }
        });
    }
}
