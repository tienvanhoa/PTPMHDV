// customer.js

// Cấu hình endpoint
const API_CUSTOMER = `${GATEWAY_URL}/api/v1/customers`;
let currentCustomerId = null;

// 1. KHỞI TẠO
document.addEventListener("DOMContentLoaded", () => {
    // Nếu backend có API get all thì gọi, nếu không thì để trống chờ search
    // loadAllCustomers(); 
    document.getElementById('customerTableBody').innerHTML = `
        <tr><td colspan="6" class="empty-state">👋 Vui lòng nhập ID khách hàng để tìm kiếm</td></tr>
    `;
});

// 2. TÌM KIẾM KHÁCH HÀNG
async function searchCustomer() {
    const keyword = document.getElementById('customerSearch').value.trim();
    if (!keyword) {
        alert("Vui lòng nhập ID khách hàng!");
        return;
    }

    const tbody = document.getElementById('customerTableBody');
    tbody.innerHTML = `<tr><td colspan="6" class="loading-text">⏳ Đang tìm kiếm...</td></tr>`;

    try {
        // Gọi API GET /api/v1/customers/{id}
        const customer = await apiRequest(`${API_CUSTOMER}/${keyword}`);
        
        // Backend trả về Object -> Đưa vào mảng để render
        renderTable([customer]);
    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">❌ Không tìm thấy khách hàng với ID: ${keyword}</td></tr>`;
    }
}

function handleSearchKey(event) {
    if (event.key === "Enter") searchCustomer();
}

// 3. RENDER BẢNG
function renderTable(customers) {
    const tbody = document.getElementById('customerTableBody');
    
    if (!customers || customers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Không có dữ liệu</td></tr>`;
        return;
    }

    tbody.innerHTML = customers.map(c => {
        // Đếm số lượng địa chỉ
        const addrCount = c.addresses ? c.addresses.length : 0;
        // Lấy địa chỉ đầu tiên làm đại diện (nếu có)
        const mainAddr = c.addresses && c.addresses.length > 0 
            ? `${c.addresses[0].street}, ${c.addresses[0].city}` 
            : '<span style="color:#999">Chưa cập nhật</span>';

        return `
            <tr>
                <td><strong>#${c.userId}</strong></td>
                <td>${c.fullname || 'Chưa cập nhật'}</td>
                <td>${c.email || '-'}</td>
                <td>${c.phoneNumber || '-'}</td>
                <td>
                    <div>${mainAddr}</div>
                    ${addrCount > 1 ? `<small style="color:#4f46e5">+${addrCount - 1} địa chỉ khác</small>` : ''}
                </td>
                <td>
                    <button class="btn-icon" onclick="openDetailModal(${c.userId})">✏️</button>
                </td>
            </tr>
        `;
    }).join('');
}

// 4. MODAL CHI TIẾT
async function openDetailModal(userId) {
    try {
        // Gọi lại API để lấy dữ liệu mới nhất
        const customer = await apiRequest(`${API_CUSTOMER}/${userId}`);
        currentCustomerId = userId;

        // Fill thông tin
        document.getElementById('modalCustomerId').innerText = customer.userId;
        document.getElementById('custName').value = customer.fullname || '';
        document.getElementById('custEmail').value = customer.email || '';
        document.getElementById('custPhone').value = customer.phoneNumber || '';

        // Render danh sách địa chỉ
        renderAddressList(customer.addresses);

        // Show modal
        document.getElementById('customerModal').classList.add('active');
        document.getElementById('overlay').classList.add('active');

    } catch (e) {
        alert("Lỗi tải chi tiết: " + e.message);
    }
}

function closeCustomerModal() {
    document.getElementById('customerModal').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
    currentCustomerId = null;
}

// 5. LƯU THÔNG TIN CÁ NHÂN
async function saveCustomerInfo() {
    if(!currentCustomerId) return;

    const body = {
        fullname: document.getElementById('custName').value,
        phoneNumber: document.getElementById('custPhone').value
    };

    try {
        // PUT /api/v1/customers/{id}
        await apiRequest(`${API_CUSTOMER}/${currentCustomerId}`, "PUT", body);
        alert("Cập nhật thành công!");
        searchCustomer(); // Reload bảng
    } catch (e) {
        alert("Lỗi cập nhật: " + e.message);
    }
}

// 6. QUẢN LÝ ĐỊA CHỈ
function renderAddressList(addresses) {
    const list = document.getElementById('addressList');
    if (!addresses || addresses.length === 0) {
        list.innerHTML = `<li style="text-align:center; padding:10px; color:#999;">Trống</li>`;
        return;
    }

    list.innerHTML = addresses.map(addr => `
        <li class="address-item">
            <div class="addr-text">
                <strong>${addr.street}</strong>
                <span>${addr.city}</span>
            </div>
            <button class="btn-icon btn-delete" onclick="deleteAddress(${addr.id})">🗑️</button>
        </li>
    `).join('');
}

async function addNewAddress() {
    const street = document.getElementById('newStreet').value;
    const city = document.getElementById('newCity').value;

    if (!street || !city) { alert("Vui lòng nhập đủ thông tin!"); return; }

    try {
        // POST /api/v1/customers/{id}/addresses
        await apiRequest(`${API_CUSTOMER}/${currentCustomerId}/addresses`, "POST", { street, city });
        
        // Reset input
        document.getElementById('newStreet').value = "";
        document.getElementById('newCity').value = "";
        
        // Reload lại modal
        openDetailModal(currentCustomerId);
    } catch (e) {
        alert("Lỗi thêm địa chỉ: " + e.message);
    }
}

async function deleteAddress(addrId) {
    if(!confirm("Xóa địa chỉ này?")) return;
    try {
        // DELETE /api/v1/customers/addresses/{id}
        await apiRequest(`${API_CUSTOMER}/addresses/${addrId}`, "DELETE");
        openDetailModal(currentCustomerId);
    } catch (e) {
        alert("Lỗi xóa: " + e.message);
    }
}