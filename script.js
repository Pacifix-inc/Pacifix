// Sample products database matching the screenshot layout
const products = [
    {
        id: 1,
        name: "Wireless Bluetooth Earbuds",
        category: "tech",
        price: 1499,
        originalPrice: 1930,
        tag: "TECH",
        image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=80"
    },
    {
        id: 2,
        name: "Active Noise-Cancelling Headphones",
        category: "tech",
        price: 2999,
        originalPrice: 4110,
        tag: "TECH",
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80"
    },
    {
        id: 3,
        name: "Bluetooth Neckband Earphones",
        category: "tech",
        price: 2080,
        originalPrice: 2790,
        tag: "TECH",
        image: "https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=500&auto=format&fit=crop&q=80"
    },
    {
        id: 4,
        name: "Portable Bluetooth Speaker",
        category: "gadgets",
        price: 1299,
        originalPrice: 1720,
        tag: "TECH",
        image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&auto=format&fit=crop&q=80"
    }
];

let cart = [];
let currentCategory = "all";

// DOM Elements
const productGrid = document.getElementById("product-grid");
const productCount = document.getElementById("product-count");
const categoryBtns = document.querySelectorAll(".category-btn");
const searchInput = document.getElementById("search-input");
const themeToggle = document.getElementById("theme-toggle");

const cartBtn = document.getElementById("cart-btn");
const closeCartBtn = document.getElementById("close-cart");
const cartDrawer = document.getElementById("cart-drawer");
const overlay = document.getElementById("overlay");
const continueShoppingBtn = document.getElementById("continue-shopping");

// Initialize Lucide Icons
lucide.createIcons();

// Render Products
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
                    <span class="current-price">₹${p.price.toLocaleString("en-IN")}</span>
                    <span class="original-price">₹${p.originalPrice.toLocaleString("en-IN")}</span>
                </div>
            </div>
        </article>
    `
        )
        .join("");
}

// Category Filter Event
categoryBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        categoryBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentCategory = btn.dataset.category;
        renderProducts();
    });
});

// Search Input Listener
searchInput.addEventListener("input", renderProducts);

// Cart Drawer Toggles
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

// Add to Cart Logic
function addToCart(productId) {
    const item = products.find((p) => p.id === productId);
    if (item) {
        cart.push(item);
        document.getElementById("cart-badge").textContent = cart.length;
        openCart();
    }
}

// Dark Mode Toggle
themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", newTheme);
    themeToggle.querySelector("i").setAttribute("data-lucide", newTheme === "dark" ? "moon" : "sun");
    lucide.createIcons();
});

// Initial Render
renderProducts();
