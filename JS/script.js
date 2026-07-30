// Base Prices set in USD
const products = [
    {
        id: 1,
        name: "Wireless Bluetooth Earbuds",
        category: "tech",
        priceUSD: 19.99,
        originalPriceUSD: 24.99,
        tag: "TECH",
        image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=80"
    },
    {
        id: 2,
        name: "Active Noise-Cancelling Headphones",
        category: "tech",
        priceUSD: 39.99,
        originalPriceUSD: 54.99,
        tag: "TECH",
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80"
    },
    {
        id: 3,
        name: "Bluetooth Neckband Earphones",
        category: "tech",
        priceUSD: 27.99,
        originalPriceUSD: 36.99,
        tag: "TECH",
        image: "https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=500&auto=format&fit=crop&q=80"
    },
    {
        id: 4,
        name: "Portable Bluetooth Speaker",
        category: "gadgets",
        priceUSD: 16.99,
        originalPriceUSD: 22.99,
        tag: "TECH",
        image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&auto=format&fit=crop&q=80"
    }
];

// State Variables
let cart = []; // Array of unique product objects
let currentCategory = "all";
let currentCurrency = "USD"; // Toggle between 'USD' and 'EUR'

const currencyRates = {
    USD: { symbol: "$", rate: 1.0 },
    EUR: { symbol: "€", rate: 0.92 }
};

// DOM Elements
const productGrid = document.getElementById("product-grid");
const productCount = document.getElementById("product-count");
const categoryBtns = document.querySelectorAll(".category-btn");
const searchInput = document.getElementById("search-input");
const themeToggle = document.getElementById("theme-toggle");
const currencyToggle = document.getElementById("currency-toggle");
const currencyLabel = document.getElementById("currency-label");

const cartBtn = document.getElementById("cart-btn");
const closeCartBtn = document.getElementById("close-cart");
const cartDrawer = document.getElementById("cart-drawer");
const overlay = document.getElementById("overlay");
const continueShoppingBtn = document.getElementById("continue-shopping");
const emptyCartView = document.getElementById("empty-cart");
const cartContentWrapper = document.getElementById("cart-content-wrapper");
const cartItemsContainer = document.getElementById("cart-items");
const buyNowBtn = document.getElementById("buy-now-btn");

// Initialize Icons
lucide.createIcons();

// Helper to Format Prices according to Currency
function formatPrice(amountInUSD) {
    const { symbol, rate } = currencyRates[currentCurrency];
    const converted = (amountInUSD * rate).toFixed(2);
    return `${symbol}${converted}`;
}

// Render Main Products
function renderProducts() {
    const query = searchInput.value.toLowerCase().trim();

    const filteredProducts = products.filter((product) => {
        const matchesCategory =
            currentCategory === "all" || product.category === currentCategory;
        const matchesSearch = product.name.toLowerCase().includes(query);
        return matchesCategory && matchesSearch;
    });

    productCount.textContent = `${filteredProducts.length} product${
        filteredProducts.length === 1 ? "" : "s"
    }`;

    if (filteredProducts.length === 0) {
        productGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem 0;">No products found.</p>`;
        return;
    }

    productGrid.innerHTML = filteredProducts
        .map(
            (p) => `
        <article class="product-card" onclick="addToCart(${p.id})">
            <div class="card-image-wrapper">
                <span class="tag">${p.tag}</span>
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

// Update Cart Display & Side Drawer
function updateCartUI() {
    // Number represents types of unique items added
    document.getElementById("cart-badge").textContent = cart.length;

    if (cart.length === 0) {
        emptyCartView.style.display = "flex";
        cartContentWrapper.style.display = "none";
    } else {
        emptyCartView.style.display = "none";
        cartContentWrapper.style.display = "flex";

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

// Add Item To Cart (Unique types only)
function addToCart(productId) {
    const exists = cart.some((item) => item.id === productId);

    // If item is already added, badge/counter does NOT increase
    if (!exists) {
        const itemToAdd = products.find((p) => p.id === productId);
        if (itemToAdd) {
            cart.push(itemToAdd);
        }
    }

    updateCartUI();
    openCart();
}

// Toggle Currency between USD and EUR
currencyToggle.addEventListener("click", () => {
    currentCurrency = currentCurrency === "USD" ? "EUR" : "USD";
    currencyLabel.textContent = currentCurrency;
    renderProducts();
    updateCartUI();
});

// Category Filter Event
categoryBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        categoryBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentCategory = btn.dataset.category;
        renderProducts();
    });
});

// Search Filter
searchInput.addEventListener("input", renderProducts);

// Drawer Toggles
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

// Buy Now Action
buyNowBtn.addEventListener("click", () => {
    alert("Proceeding to checkout with " + cart.length + " type(s) of item(s)!");
});

// Dark Mode Toggle
themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", newTheme);
    themeToggle.querySelector("i").setAttribute("data-lucide", newTheme === "dark" ? "moon" : "sun");
    lucide.createIcons();
});

// Initial Setup
renderProducts();
