// delivery.js

// API_DELIVERY lấy từ ../js/api.js (http://localhost:8080/api/v1/deliveries)
const API_DELIVERY = API.DELIVERY; 
let allDeliveries = [];
let currentFilter = 'ALL';

document.addEventListener('DOMContentLoaded', () => {
    loadDeliveries();
});

// 1. TẢI DỮ LIỆU
async function loadDeliveries() {
    const tbody = document.getElementById('deliveryTableBody');
    tbody.innerHTML = `<tr><td colspan="6" class="loading-text">⏳ Đang tải dữ liệu...</td></tr>`;

    try {
        // Gọi API Gateway
        const data = await apiRequest(API_DELIVERY);
        allDeliveries = Array.isArray(data) ? data : [];
        
        // Sắp xếp mới nhất
        allDeliveries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        renderDeliveries();
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state" style="color:red">Lỗi kết nối: ${error.message}</td></tr>`;
    }
}

// 2. RENDER BẢNG
function renderDeliveries() {
    const tbody = document.getElementById('deliveryTableBody');
    let displayData = allDeliveries;

    // Lọc theo Tab
    if (currentFilter !== 'ALL') {
        displayData = allDeliveries.filter(d => d.status === currentFilter);
    }

    // Lọc theo Tìm kiếm
    const keyword = document.getElementById('deliverySearch').value.toLowerCase();
    if (keyword) {
        displayData = displayData.filter(d => 
            d.orderId.toLowerCase().includes(keyword) || 
            (d.driverName && d.driverName.toLowerCase().includes(keyword))
        );
    }

    if (displayData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Không tìm thấy vận đơn nào.</td></tr>`;
        return;
    }

    tbody.innerHTML = displayData.map(d => `
        <tr>
            <td>#${d.id}</td>
            <td><strong>${d.orderId}</strong></td>
            <td>
                <div class="recipient-info">
                    <div class="recipient-name">${d.recipientName} <small>(${d.recipientPhone})</small></div>
                    <div class="recipient-addr">${d.deliveryAddress}</div>
                </div>
            </td>
            <td>
                ${d.driverName ? `
                    <div class="driver-info">
                        <span class="driver-name">🛵 ${d.driverName}</span>
                        <span class="driver-plate">${d.vehicleNumber}</span>
                    </div>
                ` : '<span style="color:#999; font-style:italic;">Chưa gán</span>'}
            </td>
            <td>${getBadgeHtml(d.status)}</td>
            <td>
                <div class="action-buttons">
                    ${getActionButtons(d)}
                </div>
            </td>
        </tr>
    `).join('');
}

// 3. LỌC TRẠNG THÁI
function filterDelivery(status) {
    currentFilter = status;
    // Active button
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderDeliveries();
}

function searchDelivery() {
    renderDeliveries();
}

// 4. GÁN TÀI XẾ (MODAL)
function openAssignModal(id, orderId) {
    document.getElementById('deliveryIdHidden').value = id;
    document.getElementById('targetOrderId').innerText = orderId;
    
    document.getElementById('driverModal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function closeDriverModal() {
    document.getElementById('driverModal').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
}

async function assignDriver(e) {
    e.preventDefault();
    const id = document.getElementById('deliveryIdHidden').value;
    
    const body = {
        driverId: document.getElementById('driverId').value,
        driverName: document.getElementById('driverName').value,
        vehicleNumber: document.getElementById('vehicleNumber').value
    };

    try {
        // POST /api/v1/deliveries/{id}/assign-driver
        await apiRequest(`${API_DELIVERY}/${id}/assign-driver`, "POST", body);
        alert("Đã phân công tài xế thành công!");
        closeDriverModal();
        loadDeliveries();
    } catch (err) {
        alert("Lỗi: " + err.message);
    }
}

// 5. CẬP NHẬT TRẠNG THÁI (Flow Giao hàng)
async function updateStatus(id, status) {
    let msg = "";
    if(status === 'IN_TRANSIT') msg = "Bắt đầu giao hàng?";
    if(status === 'DELIVERED') msg = "Xác nhận đã giao thành công?";

    if(!confirm(msg)) return;

    try {
        // PATCH /api/v1/deliveries/{id}/status
        await apiRequest(`${API_DELIVERY}/${id}/status`, "PATCH", { status: status });
        loadDeliveries();
    } catch (err) {
        alert("Lỗi cập nhật: " + err.message);
    }
}

// Helpers
function getBadgeHtml(status) {
    const map = {
        'PENDING': 'badge-PENDING',
        'CONFIRMED': 'badge-CONFIRMED',
        'IN_TRANSIT': 'badge-IN_TRANSIT',
        'DELIVERED': 'badge-DELIVERED',
        'FAILED': 'badge-FAILED'
    };
    let label = status;
    if(status === 'PENDING') label = '⏳ Chờ tài xế';
    if(status === 'CONFIRMED') label = '🛵 Đã gán xe';
    if(status === 'IN_TRANSIT') label = '🚚 Đang giao';
    if(status === 'DELIVERED') label = '✅ Thành công';
    
    return `<span class="${map[status] || ''}">${label}</span>`;
}

function getActionButtons(delivery) {
    if (delivery.status === 'PENDING') {
        return `<button class="btn btn-sm btn-primary" onclick="openAssignModal(${delivery.id}, '${delivery.orderId}')">➕ Gán Tài xế</button>`;
    } else if (delivery.status === 'CONFIRMED') {
        return `<button class="btn btn-sm btn-secondary" style="color:#b45309; border-color:#b45309;" onclick="updateStatus(${delivery.id}, 'IN_TRANSIT')">🚀 Đi giao</button>`;
    } else if (delivery.status === 'IN_TRANSIT') {
        return `<button class="btn btn-sm btn-primary" style="background:#10b981;" onclick="updateStatus(${delivery.id}, 'DELIVERED')">🏁 Hoàn thành</button>`;
    }
    return `<span style="color:#ccc;">--</span>`;
}