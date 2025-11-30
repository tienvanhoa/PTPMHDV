package com.delivery.delivery_service.models;

public enum DeliveryStatus {
    PENDING("Chờ xử lý"),
    CONFIRMED("Đã xác nhận"),
    IN_TRANSIT("Đang vận chuyển"),
    DELIVERED("Đã giao hàng"),
    FAILED("Giao hàng thất bại"),
    CANCELLED("Đã hủy");

    private final String description;

    DeliveryStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}
