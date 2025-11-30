package com.payment.payment_service.controller;

import java.util.Enumeration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.payment.payment_service.model.Order;
import com.payment.payment_service.model.PaymentRequest;
import com.payment.payment_service.response.PaymentResponse;
import com.payment.payment_service.response.VnPayIpnResponse;
import com.payment.payment_service.service.PaymentService;

import jakarta.servlet.http.HttpServletRequest;


@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api/payment")
public class PaymentController {
    public final PaymentService paymentService;

    // Constructor Injection
    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }
    
    // API tạo link thanh toán
    @PostMapping("/create-payment")
    public ResponseEntity<PaymentResponse> createPayment(@RequestBody PaymentRequest request, HttpServletRequest httpReq){
        PaymentResponse res = paymentService.createPayment(request, httpReq);
        return ResponseEntity.ok(res);
    }

    // API IPN (Dành cho Server VNPay gọi)
    @GetMapping("/vnpay-ipn")
    public VnPayIpnResponse vnpayIpn(HttpServletRequest request) {
        Map<String, String> params = new HashMap<>();
        for (Enumeration<String> paramsEnum = request.getParameterNames(); paramsEnum.hasMoreElements();) {
            String key = paramsEnum.nextElement();
            params.put(key, request.getParameter(key));
        }
        return paymentService.processIpn(params);
    }

    // API Return (Dành cho trình duyệt người dùng quay lại)
    @GetMapping("/vnpay-return")
    public ResponseEntity<String> vnpayReturn(HttpServletRequest request) {
        // 1. Lấy toàn bộ tham số
        Map<String, String> params = new HashMap<>();
        for (Enumeration<String> paramsEnum = request.getParameterNames(); paramsEnum.hasMoreElements();) {
            String key = paramsEnum.nextElement();
            params.put(key, request.getParameter(key));
        }

        // 2. GỌI SERVICE ĐỂ CHECK CHỮ KÝ VÀ CẬP NHẬT DB
        // Biến 'result' chứa kết quả thực sự (Thành công hay Thất bại do sai chữ ký)
        VnPayIpnResponse result = paymentService.processIpn(params);

        // 2. CHUYỂN HƯỚNG VỀ TRANG ADMIN CỦA BẠN
        // Giả sử trang Admin của bạn chạy ở cổng 5500 (Live Server VS Code)
        // Đường dẫn: http://127.0.0.1:5500/admin/payment/admin-payment.html
        
        // String redirectUrl = "http://127.0.0.1:8087/admin/payment/admin-payment.html";
        // if ("00".equals(result.getRspCode())) {
        //     // Thêm tham số status=success để trang Admin biết mà hiện thông báo
        //     redirectUrl += "?status=success&orderId=" + params.get("vnp_TxnRef");
        // } else {
        //     redirectUrl += "?status=failed&msg=" + result.getMessage();
        // }

        // response.sendRedirect(redirectUrl);
        String txnRef = params.get("vnp_TxnRef");
        String orderInfo = params.get("vnp_OrderInfo");
        String amountStr = params.get("vnp_Amount");
        long amount = (amountStr != null) ? Long.parseLong(amountStr) / 100 : 0;
        String htmlResponse;

        // 3. KIỂM TRA KẾT QUẢ TỪ SERVICE (Quan trọng: Không check params thô)
        if ("00".equals(result.getRspCode())) {
            // Giao dịch thành công + Chữ ký hợp lệ
            // String adminUrl = "http://127.0.0.1:8087/admin/payment/admin-payment.html";
            htmlResponse = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Thanh toán thành công</title>
            <style>
                body { font-family: Arial; text-align: center; padding: 50px; background: #f0f0f0; }
                .success { background: white; padding: 40px; border-radius: 10px;
                         max-width: 500px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .icon { font-size: 60px; color: #a528a7ff; }
                h1 { color: #28a745; }
                .info { margin: 20px 0; text-align: left; }
                button { background: #6aff00ff; color: white; padding: 10px 30px;
                        border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
            </style>
        </head>
        <body>
            <div class="success">
                <div class="icon">✓</div>
                <h1>Thanh toán thành công!</h1>
                <div class="info">
                    <p><strong>Mã giao dịch:</strong> %s</p>
                    <p><strong>Số tiền:</strong> %d VNĐ</p>
                    <p><strong>Trạng thái:</strong> Đã thanh toán thành công (Đã cập nhật Database)</p>
                    <p style="text-align: center; font-style: italic; margin-top: 25px; color: #a76c28ff; font-size: 1.2em;">
                    Chúc quý khách ngon miệng! ❤️
                </p>
                    </div>

                <!-- Nút chuyển trang -->
                <button onclick="window.location.href='admin-payment.html'">
                    Đóng - Về giỏ hàng
                </button>
            </div>
        </body>
        </html>
        """.formatted(txnRef, amount);

        } else {
            // Giao dịch thất bại HOẶC Sai chữ ký
            htmlResponse = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Thanh toán thất bại</title>
                <style>
                    body { font-family: Arial; text-align: center; padding: 50px; background: #f0f0f0; }
                    .failed { background: white; padding: 40px; border-radius: 10px; 
                             max-width: 500px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .icon { font-size: 60px; color: #dc3545; }
                    h1 { color: #dc3545; }
                    button { background: #dc3545; color: white; padding: 10px 30px; 
                            border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
                </style>
            </head>
            <body>
                <div class="failed">
                    <div class="icon">✗</div>
                    <h1>Thanh toán thất bại!</h1>
                    <p>Lý do: %s</p>
                    <p>Mã lỗi từ VNPay: %s</p>
                    <button onclick="window.location.href='/'">Thử lại</button>
                </div>
            </body>
            </html>
            """.formatted(result.getMessage(), params.get("vnp_ResponseCode"));
        }

        return ResponseEntity.ok()
            .header("Content-Type", "text/html; charset=UTF-8")
            .body(htmlResponse);
    }  

    // API kiểm tra đơn hàng 
    // @GetMapping("/order/{txnRef}")
    // public ResponseEntity<Order> getOrderStatus(@PathVariable String txnRef){
    //     Order order = paymentService.getOrderByTxnRef(txnRef);
    //     if (order != null) {
    //         return ResponseEntity.ok(order);
    //     }
    //     return ResponseEntity.notFound().build();
    // } 
    // @Getmapping("get-totalamount")
    // public 

    // Thêm vào PaymentController
    @GetMapping("/all")
    public ResponseEntity<List<Order>> getAllOrders() {
        return ResponseEntity.ok(paymentService.getAllOrders());
    }

    // @CrossOrigin(origins = "*")
    // @RequestMapping("/api/payment")
    // public String requestMethodName(@RequestParam String param) {
    //     return new String();
    // }
    
}