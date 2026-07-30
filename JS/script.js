let products = []; // Populated via MongoDB API
let cart = JSON.parse(localStorage.getItem("pacifix_cart")) || [];
let currentCurrency = localStorage.getItem("pacifix_currency") || "USD";
let currentCategory = "all";

const currencyRates = {
    USD: { symbol: "$", rate: 1.0 },
    EUR: { symbol: "€", rate: 0.92 }
};

// DOM Nodes
const currencyToggle = document.getElementById("currency-toggle");
const currencyLabel = document.getElementById("currency-label");
const themeToggle = document.getElementById("theme-toggle");
const cartBtn = document.getElementById("cart-btn");
const closeCartBtn = document.getElementById("close-cart");
const cartDrawer = document.getElementById("cart-drawer");
const overlay = document.getElementById("overlay");
const continueShoppingBtn = document.getElementById("continue-shopping");
const emptyCartView = document.getElementById("empty-cart");
const cartContentWrapper = document.getElementById("cart-content-wrapper");
const cartItemsContainer = document.getElementById("cart-items");
const buyNowBtn = document.getElementById("buy-now-btn");

if (window.lucide) lucide.createIcons();

function formatPrice(amountInUSD) {
    if (!amountInUSD) return "$0.00";
    const { symbol, rate } = currencyRates[currentCurrency];
    const converted = (amountInUSD * rate).toFixed(2);
    return `${symbol}${converted}`;
}

function saveState() {
    localStorage.setItem("pacifix_cart", JSON.stringify(cart));
    localStorage.setItem("pacifix_currency", currentCurrency);
}

// Fetch products from Vercel API (Connecting to MongoDB)
async function fetchProductsFromMongoDB() {
    try {
        const response = await fetch("/api/products");
        if (!response.ok) throw new Error("Failed to load products");
        products = await response.json();
        renderProducts();
        loadProductDetailsPage();
    } catch (err) {
        console.error("MongoDB API error:", err);
        const grid = document.getElementById("product-grid");
        if (grid) grid.innerHTML = `<p style="grid-column: 1/-1; color: red;">Error connecting to database.</p>`;
    }
}

// Render Main Catalog (Card Clicking directs to product.html?id)
function renderProducts() {
    const productGrid = document.getElementById("product-grid");
    if (!productGrid) return;

    const searchInput = document.getElementById("search-input");
    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";

    const filtered = products.filter((p) => {
        const matchesCategory = currentCategory === "all" || p.category === currentCategory;
        const matchesSearch = p.name.toLowerCase().includes(query);
        return matchesCategory && matchesSearch;
    });

    const productCount = document.getElementById("product-count");
    if (productCount) {
        productCount.textContent = `${filtered.length} product${filtered.length === 1 ? "" : "s"}`;
    }

    if (filtered.length === 0) {
        productGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem 0;">No products found.</p>`;
        return;
    }

    // Product Card: Clicking anywhere takes user to product.html?id
    productGrid.innerHTML = filtered
        .map(
            (p) => `
        <article class="product-card" onclick="goToProductPage(${p.id})">
            <div class="card-image-wrapper">
                <span class="tag">${p.tag || "ITEM"}</span>
                <img src="${p.image}" alt="${p.name}" loading="lazy" />
            </div>
            <div class="card-info">
                <h3 class="product-title">${p.name}</h3>
                <div class="price-container">
                    <span class="current-price">${formatPrice(p.priceUSD)}</span>
                    <span class="original-price">${formatPrice(p.originalPriceUSD)}</span>
                </div>
            </div>
        </article>
    `
        )
        .join("");
}

function goToProductPage(id) {
    window.location.href = `product.html?${id}`;
}

// Product Details Page Logic
function loadProductDetailsPage() {
    const mainImg = document.getElementById("main-product-img");
    if (!mainImg || products.length === 0) return;

    const queryString = window.location.search.replace("?", "");
    const productId = parseInt(queryString, 10) || products[0].id;

    const product = products.find((p) => p.id === productId) || products[0];

    document.getElementById("breadcrumb-category").textContent = (product.category || "").toUpperCase();
    document.getElementById("breadcrumb-title").textContent = product.name;
    mainImg.src = product.image;
    document.getElementById("product-tag").textContent = product.tag || "ITEM";
    document.getElementById("p-title").textContent = product.name;
    document.getElementById("p-brand").textContent = product.brand || "Pacifix";
    document.getElementById("p-price").textContent = formatPrice(product.priceUSD);
    document.getElementById("p-orig-price").textContent = formatPrice(product.originalPriceUSD);

    // Thumbnails
    const thumbContainer = document.getElementById("thumbnail-list");
    thumbContainer.innerHTML = [product.image, product.image, product.image, product.image]
        .map(
            (img, idx) => `
        <div class="thumb-item ${idx === 0 ? "active" : ""}" onclick="changeMainImage('${img}', this)">
            <img src="${img}" alt="Thumbnail" />
        </div>
    `
        )
        .join("");

    document.getElementById("product-description").textContent = product.description || "";

    // Specifications
    const specsTable = document.getElementById("specs-table");
    if (product.specs) {
        specsTable.innerHTML = Object.entries(product.specs)
            .map(
                ([k, v]) => `
            <div class="spec-row">
                <div class="spec-key">${k}</div>
                <div class="spec-val">${v}</div>
            </div>
        `
            )
            .join("");
    }

    // Attach functionality to product page Add to Cart and Buy Now buttons
    const pAddBtn = document.getElementById("p-add-cart-btn");
    const pBuyBtn = document.getElementById("p-buy-now-btn");

    pAddBtn.onclick = () => addToCart(product.id);
    pBuyBtn.onclick = () => {
        addToCart(product.id);
        alert(`Directing to payment for: ${product.name}`);
    };
}

function changeMainImage(src, element) {
    document.getElementById("main-product-img").src = src;
    document.querySelectorAll(".thumb-item").forEach((el) => el.classList.remove("active"));
    element.classList.add("active");
}

// Cart Management
function updateCartUI() {
    const badge = document.getElementById("cart-badge");
    if (badge) badge.textContent = cart.length;

    if (cart.length === 0) {
        if (emptyCartView) emptyCartView.style.display = "flex";
        if (cartContentWrapper) cartContentWrapper.style.display = "none";
    } else {
        if (emptyCartView) emptyCartView.style.display = "none";
        if (cartContentWrapper) cartContentWrapper.style.display = "flex";

        if (cartItemsContainer) {
            cartItemsContainer.innerHTML = cart
                .map(
                    (item) => `
                <div class="cart-item">
                    <img src="${item.image}" alt="${item.name}" class="cart-item-img" />
                    <div class="cart-item-details">
                        <div class="cart-item-title">${item.name}</div>
                        <div class="cart-item-price">${formatPrice(item.priceUSD)}</div>
                    </div>
                </div>
            `
                )
                .join("");
        }
    }
}

function addToCart(productId) {
    const exists = cart.some((item) => item.id === productId);
    if (!exists) {
        const itemToAdd = products.find((p) => p.id === productId);
        if (itemToAdd) {
            cart.push(itemToAdd);
            saveState();
        }
    }
    updateCartUI();
    openCart();
}

// UI Handlers
currencyToggle.addEventListener("click", () => {
    currentCurrency = currentCurrency === "USD" ? "EUR" : "USD";
    if (currencyLabel) currencyLabel.textContent = currentCurrency;
    saveState();
    renderProducts();
    loadProductDetailsPage();
    updateCartUI();
});

document.querySelectorAll(".category-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".category-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentCategory = btn.dataset.category;
        renderProducts();
    });
});

const searchInput = document.getElementById("search-input");
if (searchInput) searchInput.addEventListener("input", renderProducts);

function openCart() {
    cartDrawer.classList.add("active");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeCart() {
    cartDrawer.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
}

cartBtn.addEventListener("click", openCart);
closeCartBtn.addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);
continueShoppingBtn.addEventListener("click", closeCart);

buyNowBtn.addEventListener("click", () => {
    alert("Proceeding to checkout with " + cart.length + " item(s)!");
});

themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    themeToggle.querySelector("i").setAttribute("data-lucide", newTheme === "dark" ? "moon" : "sun");
    if (window.lucide) lucide.createIcons();
});

// Initialization
if (currencyLabel) currencyLabel.textContent = currentCurrency;
fetchProductsFromMongoDB();
updateCartUI();
