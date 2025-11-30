package com.payment.payment_service.model;

// import lombok.Data;

// @Data
public class PaymentRequest {
    private Long amount;
    private String orderInfo;

    public PaymentRequest() {
    }

    public PaymentRequest(Long amount, String orderInfo) {
        this.amount = amount;
        this.orderInfo = orderInfo;
    }

    public Long getAmount() {
        return amount;
    }
    public void setAmount(Long amount) {
        this.amount = amount;
    }

    public String getOrderInfo() {
        return orderInfo;
    }
    public void setOrderInfo(String orderInfo) {
        this.orderInfo = orderInfo;
    }


}
