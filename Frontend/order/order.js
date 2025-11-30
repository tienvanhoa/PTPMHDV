// order.js
const API_ORDER = API.ORDER; // http://localhost:8080/api/v1/orders
let allOrders = [];
let currentFilter = 'ALL';
let currentOrderId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadOrders();
});

// 1. LOAD DATA
async function loadOrders() {
    const tbody = document.getElementById('orderTableBody');
    tbody.innerHTML = `<tr><td colspan="6" class="loading-text">⏳ Đang đồng bộ dữ liệu...</td></tr>`;

    try {
        // Gọi API GET /orders
        const data = await apiRequest(API_ORDER);
        
        allOrders = Array.isArray(data) ? data : [];
        // Sort mới nhất lên đầu
        allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        updateStats();
        renderOrders();

    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Lỗi kết nối: ${error.message}</td></tr>`;
    }
}

// 2. RENDER BẢNG
function renderOrders() {
    const tbody = document.getElementById('orderTableBody');
    let displayData = allOrders;

    // Lọc theo Tab
    if (currentFilter !== 'ALL') {
        displayData = allOrders.filter(o => o.status === currentFilter);
    }

    // Lọc theo Tìm kiếm
    const keyword = document.getElementById('orderSearch').value.toLowerCase();
    if (keyword) {
        displayData = displayData.filter(o => o.id.toString().includes(keyword));
    }

    if (displayData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state" style="text-align:center; padding:30px; color:#999;">Không có dữ liệu.</td></tr>`;
        return;
    }

    tbody.innerHTML = displayData.map(o => `
        <tr>
            <td><strong>#${o.id}</strong></td>
            <td>User ${o.userId}</td>
            <td>${new Date(o.createdAt).toLocaleString('vi-VN')}</td>
            <td style="color: var(--primary); font-weight: bold;">${formatMoney(o.totalAmount)}</td>
            <td>${getBadgeHtml(o.status)}</td>
            <td>
                <button class="btn-secondary" style="padding: 5px 10px; font-size: 0.85rem;" onclick="viewDetail(${o.id})">👁️ Chi tiết</button>
            </td>
        </tr>
    `).join('');
}

// 3. MODAL DETAIL
function viewDetail(id) {
    currentOrderId = id;
    const order = allOrders.find(o => o.id === id);
    if (!order) return;

    document.getElementById('detailId').innerText = order.id;
    document.getElementById('detailUserId').innerText = order.userId;
    document.getElementById('detailDate').innerText = new Date(order.createdAt).toLocaleString('vi-VN');
    document.getElementById('detailAddress').innerText = order.deliveryAddress;
    document.getElementById('detailStatus').innerHTML = getBadgeHtml(order.status);
    document.getElementById('detailTotal').innerText = formatMoney(order.totalAmount);

    // Render Items
    const itemsBody = document.getElementById('detailItemsBody');
    itemsBody.innerHTML = order.items.map(item => `
        <tr>
            <td>
                <div style="font-weight:600; color:#333;">${item.dishName}</div>
                <small style="color:#999;">ID: ${item.dishId}</small>
            </td>
            <td>${formatMoney(item.unitPrice)}</td>
            <td>${item.quantity}</td>
            <td style="text-align:right;">${formatMoney(item.subTotal)}</td>
        </tr>
    `).join('');

    renderActionButtons(order.status);

    document.getElementById('orderModal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
}

// 4. RENDER ACTION BUTTONS
function renderActionButtons(status) {
    const container = document.getElementById('modalActions');
    let html = '';

    if (status === 'PENDING') {
        html = `
            <button class="btn-cancel" onclick="updateStatus('CANCELLED')">Hủy đơn</button>
            <button class="btn-approve" onclick="updateStatus('CONFIRMED')">✅ Duyệt đơn</button>
        `;
    } else if (status === 'CONFIRMED' || status === 'PAID') {
        html = `
            <button class="btn-ship" onclick="updateStatus('DELIVERING')">🚚 Giao hàng</button>
        `;
    } else if (status === 'DELIVERING') {
        html = `
            <button class="btn-approve" onclick="updateStatus('COMPLETED')">🎉 Hoàn tất</button>
        `;
    } else {
        html = `<span style="color:#999; font-style:italic;">Không có thao tác khả dụng</span>`;
    }
    container.innerHTML = html;
}

// 5. UPDATE STATUS
async function updateStatus(newStatus) {
    if(!confirm(`Xác nhận chuyển trạng thái sang ${newStatus}?`)) return;

    try {
        // PUT /api/v1/orders/{id}/status?status=...
        await apiRequest(`${API_ORDER}/${currentOrderId}/status?status=${newStatus}`, "PUT");
        alert("Thành công!");
        closeOrderModal();
        loadOrders(); // Reload list
    } catch (e) {
        alert("Lỗi: " + e.message);
    }
}

// 6. FILTER & STATS
function filterOrders(status) {
    currentFilter = status;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderOrders();
}

function searchOrder() { renderOrders(); }

function updateStats() {
    const pending = allOrders.filter(o => o.status === 'PENDING').length;
    const shipping = allOrders.filter(o => o.status === 'DELIVERING').length;
    const today = new Date().toDateString();
    const revenue = allOrders
        .filter(o => (o.status === 'COMPLETED' || o.status === 'PAID') && new Date(o.createdAt).toDateString() === today)
        .reduce((sum, o) => sum + o.totalAmount, 0);

    document.getElementById('countPending').innerText = pending;
    document.getElementById('countShipping').innerText = shipping;
    document.getElementById('todayRevenue').innerText = formatMoney(revenue);
}

// Helper
function getBadgeHtml(status) {
    const map = {
        'PENDING': 'badge badge-PENDING',
        'CONFIRMED': 'badge badge-CONFIRMED',
        'DELIVERING': 'badge badge-DELIVERING',
        'COMPLETED': 'badge badge-COMPLETED',
        'PAID': 'badge badge-PAID',
        'CANCELLED': 'badge badge-CANCELLED'
    };
    return `<span class="${map[status] || 'badge'}">${status}</span>`;
}