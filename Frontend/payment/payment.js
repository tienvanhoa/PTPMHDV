// payment.js

// Lấy API URL từ config chung
const API_PAYMENT = API.PAYMENT; 
let allPayments = [];

document.addEventListener('DOMContentLoaded', () => {
    loadPayments();
});

// 1. TẢI DỮ LIỆU
async function loadPayments() {
    const tbody = document.getElementById('paymentTableBody');
    tbody.innerHTML = `<tr><td colspan="7" class="loading-text">⏳ Đang đồng bộ dữ liệu...</td></tr>`;

    try {
        // GET /api/v1/payments
        // (Yêu cầu Backend PaymentController có @GetMapping trả về List<Transaction>)
        const data = await apiRequest(API_PAYMENT);
        
        allPayments = Array.isArray(data) ? data : [];
        
        // Sắp xếp: Mới nhất lên đầu
        allPayments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        calculateStats();
        renderTable(allPayments);

    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state" style="color:red">Lỗi kết nối: ${error.message}</td></tr>`;
    }
}

// 2. RENDER BẢNG
function renderTable(data) {
    const tbody = document.getElementById('paymentTableBody');
    
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Chưa có giao dịch nào.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(p => `
        <tr>
            <td>#${p.id}</td>
            <td><strong>Order #${p.orderId}</strong></td>
            <td style="font-weight:bold; color: #1e293b;">${formatMoney(p.amount)}</td>
            <td>
                <span class="method-badge">
                   <img src="https://sandbox.vnpayment.vn/paymentv2/images/icons/vnpay.svg" width="16"> VNPAY
                </span>
            </td>
            <td>
                <span class="transaction-code">${p.transactionCode || '---'}</span>
            </td>
            <td style="font-size:0.9rem; color:#64748b;">
                ${p.createdAt ? new Date(p.createdAt).toLocaleString('vi-VN') : 'N/A'}
            </td>
            <td>${getStatusBadge(p.status)}</td>
        </tr>
    `).join('');
}

// 3. TÍNH TOÁN THỐNG KÊ
function calculateStats() {
    // Lọc các giao dịch thành công
    const successList = allPayments.filter(p => p.status === 'SUCCESS' || p.status === '00');
    const failedList = allPayments.filter(p => p.status !== 'SUCCESS' && p.status !== '00');

    const totalRevenue = successList.reduce((sum, p) => sum + (p.amount || 0), 0);

    document.getElementById('totalRevenue').innerText = formatMoney(totalRevenue);
    document.getElementById('countSuccess').innerText = successList.length;
    document.getElementById('countFailed').innerText = failedList.length;
}

// 4. BỘ LỌC
function filterPayments() {
    const status = document.getElementById('statusFilter').value;
    
    if (status === 'ALL') {
        renderTable(allPayments);
    } else {
        const filtered = allPayments.filter(p => {
            if (status === 'SUCCESS') return p.status === 'SUCCESS' || p.status === '00';
            if (status === 'FAILED') return p.status === 'FAILED';
            if (status === 'PENDING') return p.status === 'PENDING';
            return false;
        });
        renderTable(filtered);
    }
}

// 5. TÌM KIẾM
function searchPayment() {
    const keyword = document.getElementById('paymentSearch').value.toLowerCase();
    
    const filtered = allPayments.filter(p => 
        p.orderId.toString().includes(keyword) || 
        (p.transactionCode && p.transactionCode.toLowerCase().includes(keyword))
    );
    
    renderTable(filtered);
}

// Helper: Badge HTML
function getStatusBadge(status) {
    // VNPAY trả về '00' là thành công
    if (status === 'SUCCESS' || status === '00') {
        return `<span class="badge-SUCCESS">✅ Thành công</span>`;
    } else if (status === 'FAILED') {
        return `<span class="badge-FAILED">❌ Thất bại</span>`;
    } else {
        return `<span class="badge-PENDING">⏳ Đang chờ</span>`;
    }
}