// trangchu.js

// Configuration API Gateway
const GATEWAY_BASE_URL = "http://localhost:8080";
const API_BASE_URL = `${GATEWAY_BASE_URL}/api/v1`;

// State
let menuItems = [];
let cart = [];
let orders = [];
let currentUser = null;

// API Request Function
async function apiRequest(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const defaultHeaders = { "Content-Type": "application/json" };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  };

  try {
    const res = await fetch(url, config);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API error ${res.status}: ${text}`);
    }
    if (res.status === 204) return null;
    return res.json();
  } catch (error) {
    console.error("API Request Error:", error);
    throw error;
  }
}

// LocalStorage Functions
function loadAuth() {
  try {
    const raw = localStorage.getItem("foodhub_auth");
    if (!raw) return;
    currentUser = JSON.parse(raw);
  } catch {
    currentUser = null;
  }
}

function saveAuth() {
  localStorage.setItem("foodhub_auth", JSON.stringify(currentUser));
}

function clearAuth() {
  currentUser = null;
  localStorage.removeItem("foodhub_auth");
}

function loadLocalOrdersCache() {
  try {
    orders = JSON.parse(localStorage.getItem("foodhub_orders") || "[]");
  } catch {
    orders = [];
  }
}

function saveLocalOrdersCache() {
  localStorage.setItem("foodhub_orders", JSON.stringify(orders));
}

// Update Navbar Auth
function updateNavAuth() {
  const btn = document.getElementById("authBtn");
  if (!btn) return;

  if (currentUser?.token) {
    const name = currentUser.email?.split("@")[0] || "User";
    btn.textContent = `👤 ${name}`;
    btn.onclick = (e) => {
      e.preventDefault();
      if (confirm("Bạn có chắc muốn đăng xuất?")) {
        clearAuth();
        updateNavAuth();
        showNotification("Đã đăng xuất.");
      }
    };
  } else {
    btn.textContent = "🔐 Đăng nhập";
    btn.onclick = (e) => {
      e.preventDefault();
      openLogin();
    };
  }
}

// Render Menu
function renderMenu(items = menuItems) {
  const menuGrid = document.getElementById("menuGrid");
  if (!menuGrid) return;

  if (!items.length) {
    menuGrid.innerHTML = `<p style="padding:1rem 0;color:#6b7280;">Hiện chưa có món nào. Hãy tạo dữ liệu trong Restaurant/MenuItem Service.</p>`;
    return;
  }

  menuGrid.innerHTML = items
    .map((item) => {
      const rating = item.rating ?? 4.5;
      const img = item.imageUrl || item.image || "https://via.placeholder.com/400x300?text=Food";
      const desc = item.description || "";
      return `
      <div class="menu-card" data-id="${item.id}">
        <img src="${img}" alt="${item.name}">
        <div class="menu-card-content">
          <h3>${item.name}</h3>
          <p>${desc}</p>
          <div class="menu-card-footer">
            <span class="price">${Number(item.price).toLocaleString()}đ</span>
            <span class="rating">⭐ ${rating}</span>
          </div>
          <button class="add-to-cart" onclick="addToCart(${item.id})">Thêm vào giỏ</button>
        </div>

        <div class="hover-info">
          <button class="hover-close" type="button" aria-label="Đóng">Đóng</button>
          <div class="hover-title">Thông tin chi tiết</div>
          <div class="badges">
            ${item.restaurantName ? `<span class="badge">🪙 ${item.restaurantName}</span>` : ""}
            <span class="badge">💰 ${Number(item.price).toLocaleString()}đ</span>
            <span class="badge">⭐ ${rating}</span>
          </div>
          <div class="hover-meta">
            <div><strong>Phân loại:</strong> ${item.category || "Món ăn"}</div>
            <ul style="margin-top:6px;">
              <li>Mã món: ${item.id}</li>
            </ul>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  setupMenuCardInteractions();
}

function setupMenuCardInteractions() {
  const isTouch = window.matchMedia("(hover: none)").matches;
  document.querySelectorAll(".menu-card").forEach((card) => {
    const closeBtn = card.querySelector(".hover-close");
    closeBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      card.classList.remove("show");
      card.classList.add("no-hover");
      const onLeave = () => {
        card.classList.remove("no-hover");
        card.removeEventListener("mouseleave", onLeave);
      };
      card.addEventListener("mouseleave", onLeave);
    });

    if (isTouch) {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".add-to-cart")) return;
        document.querySelectorAll(".menu-card.show").forEach((c) => {
          if (c !== card) c.classList.remove("show");
        });
        card.classList.toggle("show");
      });
    }
  });

  if (isTouch) {
    document.addEventListener("click", (e) => {
      const open = document.querySelector(".menu-card.show");
      if (open && !e.target.closest(".menu-card")) open.classList.remove("show");
    }, { passive: true });
  }
}

// Load Menu from API
async function loadMenuFromApi() {
  try {
    let data = [];
    try {
      data = await apiRequest("/menu-items");
    } catch {
      const restaurants = await apiRequest("/restaurants");
      restaurants.forEach((r) => {
        (r.menuItems || r.menu || []).forEach((mi) => {
          data.push({ ...mi, restaurantName: r.name });
        });
      });
    }

    menuItems = data || [];
    renderMenu(menuItems);
  } catch (err) {
    console.error(err);
    const menuGrid = document.getElementById("menuGrid");
    if (menuGrid) {
      menuGrid.innerHTML = `<p style="color:#ef4444;padding:1rem 0;">Không tải được dữ liệu món ăn từ API Gateway: ${err.message}</p>`;
    }
  }
}

// Cart Functions
function addToCart(itemId) {
  const item = menuItems.find((i) => i.id === itemId);
  if (!item) {
    showNotification("Không tìm thấy món ăn.");
    return;
  }
  const existing = cart.find((i) => i.id === itemId);
  if (existing) existing.quantity++;
  else cart.push({ ...item, quantity: 1 });
  updateCart();
  showNotification("Đã thêm vào giỏ hàng!");
}

function updateCart() {
  const cartItemsEl = document.getElementById("cartItems");
  const cartCountEl = document.getElementById("cartCount");
  const cartTotalEl = document.getElementById("cartTotal");

  const totalQty = cart.reduce((s, i) => s + i.quantity, 0);
  cartCountEl.textContent = totalQty;

  if (!cart.length) {
    cartItemsEl.innerHTML = `
      <div class="empty-cart">
        <p>Giỏ hàng trống</p>
        <p style="font-size:.9rem;margin-top:.5rem;">Thêm món ăn vào giỏ hàng nhé!</p>
      </div>`;
    cartTotalEl.textContent = "0đ";
    return;
  }

  cartItemsEl.innerHTML = cart
    .map((item) => `
    <div class="cart-item">
      <img src="${item.imageUrl || item.image}" alt="${item.name}">
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <p style="color:#667eea;font-weight:bold;">${Number(item.price).toLocaleString()}đ</p>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="decreaseQuantity(${item.id})">-</button>
          <span style="padding:0 1rem;font-weight:bold;">${item.quantity}</span>
          <button class="qty-btn" onclick="increaseQuantity(${item.id})">+</button>
          <button class="remove-item" onclick="removeFromCart(${item.id})">Xóa</button>
        </div>
      </div>
    </div>`)
    .join("");

  const total = cart.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
  cartTotalEl.textContent = total.toLocaleString() + "đ";
}

function increaseQuantity(id) {
  const it = cart.find((i) => i.id === id);
  if (it) {
    it.quantity++;
    updateCart();
  }
}

function decreaseQuantity(id) {
  const it = cart.find((i) => i.id === id);
  if (it && it.quantity > 1) {
    it.quantity--;
    updateCart();
  }
}

function removeFromCart(id) {
  cart = cart.filter((i) => i.id !== id);
  updateCart();
}

// Global functions
window.addToCart = addToCart;
window.increaseQuantity = increaseQuantity;
window.decreaseQuantity = decreaseQuantity;
window.removeFromCart = removeFromCart;

// Sidebar Functions
function toggleCart() {
  const sidebar = document.getElementById("cartSidebar");
  const overlay = document.getElementById("overlay");
  const ordersSidebar = document.getElementById("ordersSidebar");
  closeSupport();
  closeLogin();
  ordersSidebar.classList.remove("active");
  sidebar.classList.toggle("active");
  overlay.classList.toggle("active", sidebar.classList.contains("active"));
}

function openOrders() {
  const ordersSidebar = document.getElementById("ordersSidebar");
  const cartSidebar = document.getElementById("cartSidebar");
  const overlay = document.getElementById("overlay");
  closeSupport();
  closeLogin();
  cartSidebar.classList.remove("active");
  ordersSidebar.classList.add("active");
  overlay.classList.add("active");
  loadOrdersFromApi();
}

function closeOrders() {
  const ordersSidebar = document.getElementById("ordersSidebar");
  const overlay = document.getElementById("overlay");
  ordersSidebar.classList.remove("active");
  overlay.classList.remove("active");
}

function closePanels() {
  document.getElementById("cartSidebar").classList.remove("active");
  document.getElementById("ordersSidebar").classList.remove("active");
  closeSupport();
  closeLogin();
  document.getElementById("overlay").classList.remove("active");
}

window.toggleCart = toggleCart;
window.openOrders = openOrders;
window.closeOrders = closeOrders;
window.closePanels = closePanels;

// Orders Functions
async function loadOrdersFromApi() {
  const list = document.getElementById("ordersList");
  if (!currentUser?.userId) {
    list.innerHTML = `
      <div class="empty-cart" style="padding:2rem;">
        <p>Hãy đăng nhập để xem đơn hàng của bạn.</p>
      </div>`;
    return;
  }

  try {
    const data = await apiRequest(`/orders/user/${currentUser.userId}`, { auth: true });
    orders = data || [];
    saveLocalOrdersCache();
    renderOrders();
  } catch (err) {
    console.error(err);
    loadLocalOrdersCache();
    renderOrders();
  }
}

function renderOrders() {
  const list = document.getElementById("ordersList");
  if (!orders.length) {
    list.innerHTML = `
      <div class="empty-cart" style="padding:2rem;">
        <p>Chưa có đơn hàng nào</p>
        <p style="font-size:.9rem;margin-top:.5rem;">Bạn hãy đặt món để trải nghiệm nhé!</p>
      </div>`;
    return;
  }

  list.innerHTML = orders
    .map((o) => {
      const status = (o.status || "").toLowerCase();
      let statusClass = "status-processing";
      let statusText = "Đang xử lý";

      if (status.includes("shipping") || status.includes("delivering")) {
        statusClass = "status-shipping";
        statusText = "Đang giao";
      } else if (status.includes("delivered") || status.includes("completed")) {
        statusClass = "status-delivered";
        statusText = "Đã giao";
      } else if (status.includes("cancel")) {
        statusClass = "status-cancel";
        statusText = "Đã hủy";
      }

      const itemsText = (o.items || [])
        .map((it) => `• ${escapeHTML(it.name || "")} x${it.quantity} — ${(Number(it.price) * it.quantity).toLocaleString()}đ`)
        .join("<br>");

      const createdAt = o.createdAt ? new Date(o.createdAt).toLocaleString("vi-VN") : "";

      return `
      <div class="order-card">
        <div class="order-top">
          <div class="order-id">Mã đơn: ${o.id}</div>
          <div class="status-badge ${statusClass}">${statusText}</div>
        </div>
        <div style="font-size:.85rem;color:#666;">${createdAt}</div>
        <div class="order-items" style="margin-top:6px;">${itemsText}</div>
        <div class="order-total">Tổng: ${Number(o.totalAmount || o.total || 0).toLocaleString()}đ</div>
      </div>`;
    })
    .join("");
}

function escapeHTML(str = "") {
  return str.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#039;";
      default: return c;
    }
  });
}

// Checkout Function
async function checkout() {
  if (!cart.length) {
    alert("Giỏ hàng trống!");
    return;
  }
  if (!currentUser?.token || !currentUser?.userId) {
    alert("Bạn cần đăng nhập trước khi đặt hàng.");
    openLogin();
    return;
  }

  const total = cart.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
  const itemsReq = cart.map((i) => ({ menuItemId: i.id, quantity: i.quantity }));

  const orderReq = {
    userId: currentUser.userId,
    totalAmount: total,
    items: itemsReq,
  };

  try {
    const order = await apiRequest("/orders", {
      method: "POST",
      body: orderReq,
      auth: true,
    });

    showNotification(`Đã tạo đơn #${order.id}. Đang chuyển sang thanh toán...`);

    const paymentReq = {
      amount: Math.round(order.totalAmount || total),
      orderId: order.id,
      orderInfo: `FoodHubOrder_${order.id}`,
    };

    const paymentRes = await apiRequest("/payments/create-payment", {
      method: "POST",
      body: paymentReq,
      auth: true,
    });

    cart = [];
    updateCart();
    closePanels();
    await loadOrdersFromApi();

    if (paymentRes && paymentRes.paymentUrl) {
      window.location.href = paymentRes.paymentUrl;
    } else {
      alert("Tạo đơn thành công nhưng không nhận được link thanh toán.");
    }
  } catch (err) {
    console.error(err);
    alert("Lỗi khi tạo đơn hoặc gọi Payment Service: " + err.message);
  }
}

window.checkout = checkout;

// Filter Category
function filterCategory(category) {
  const filtered = menuItems.filter((i) => i.category === category);
  renderMenu(filtered);
  document.getElementById("menu").scrollIntoView({ behavior: "smooth" });
}

window.filterCategory = filterCategory;

// Support Modal
function openSupport() {
  document.getElementById("supportModal").classList.add("active");
  document.getElementById("overlay").classList.add("active");
  closeLogin();
}

function closeSupport() {
  document.getElementById("supportModal").classList.remove("active");
  if (!document.getElementById("cartSidebar").classList.contains("active") &&
      !document.getElementById("ordersSidebar").classList.contains("active") &&
      !document.getElementById("loginModal").classList.contains("active")) {
    document.getElementById("overlay").classList.remove("active");
  }
}

function submitSupport(e) {
  e.preventDefault();
  alert("Yêu cầu của bạn đã được ghi nhận. Chúng tôi sẽ phản hồi sớm nhất!");
  closeSupport();
  return false;
}

window.openSupport = openSupport;
window.closeSupport = closeSupport;
window.submitSupport = submitSupport;

// Login Modal
function openLogin() {
  document.getElementById("loginModal").classList.add("active");
  document.getElementById("overlay").classList.add("active");
  closeSupport();
}

function closeLogin() {
  document.getElementById("loginModal").classList.remove("active");
  if (!document.getElementById("cartSidebar").classList.contains("active") &&
      !document.getElementById("ordersSidebar").classList.contains("active") &&
      !document.getElementById("supportModal").classList.contains("active")) {
    document.getElementById("overlay").classList.remove("active");
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!email || !password) {
    alert("Vui lòng nhập đầy đủ Email và Mật khẩu.");
    return false;
  }

  try {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: { email, password },
    });

    currentUser = {
      token: data.token,
      userId: data.userId,
      role: data.role,
      email,
    };
    saveAuth();
    updateNavAuth();
    showNotification("Đăng nhập thành công!");
    closeLogin();

    await loadOrdersFromApi();
  } catch (err) {
    console.error(err);
    alert("Đăng nhập thất bại: " + err.message);
  }

  return false;
}

function loginAsAdmin() {
    // Không cần nhập gì → vào thẳng module quản lý món
    window.location.href = "admin/admin.html";
}
window.loginAsAdmin = loginAsAdmin;

// Notification
function showNotification(message) {
  console.log("[Notification]", message);
}

// Search
function handleSearch() {
  const input = document.getElementById("globalSearch");
  if (!input) return;
  const q = input.value.trim().toLowerCase();
  if (!q) {
    renderMenu(menuItems);
    return;
  }
  const filtered = menuItems.filter((m) =>
    (m.name || "").toLowerCase().includes(q) ||
    (m.description || "").toLowerCase().includes(q) ||
    (m.category || "").toLowerCase().includes(q)
  );
  renderMenu(filtered);
}

window.handleSearch = handleSearch;

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  loadAuth();
  updateNavAuth();
  updateCart();

  await loadMenuFromApi();

  if (currentUser?.userId) {
    await loadOrdersFromApi();
  }

  const logo = document.getElementById("logoHome");
  if (logo) {
    logo.addEventListener("click", (e) => {
      e.preventDefault();
      closePanels();
      document.getElementById("home")?.scrollIntoView({ behavior: "smooth" });
    });
  }
});