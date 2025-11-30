package com.oder.order_service.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.oder.order_service.client.CustomerClient;
import com.oder.order_service.client.RestaurantClient;
import com.oder.order_service.dto.OrderItemRequest;
import com.oder.order_service.dto.OrderItemResponse;
import com.oder.order_service.dto.OrderRequest;
import com.oder.order_service.dto.OrderResponse;
import com.oder.order_service.dto.external.CustomerResponse;
import com.oder.order_service.dto.external.DishResponse;
import com.oder.order_service.model.Order;
import com.oder.order_service.model.OrderItem;
import com.oder.order_service.model.OrderStatus;
import com.oder.order_service.repository.OrderRepository;

import lombok.Data;

@Data
@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private CustomerClient customerClient;

    @Autowired
    private RestaurantClient restaurantClient;

    @Transactional
    public OrderResponse createOrder(OrderRequest request) {
        // 1. Validate Customer (Gọi sang Customer Service)
        // Nếu không tìm thấy, Feign sẽ ném lỗi 404 (cần xử lý Global Exception sau)
        CustomerResponse customer = customerClient.getCustomerByUserId(request.getUserId());

        // 2. Tạo Order Entity
        Order order = new Order();
        order.setCustomerId(request.getUserId());
        order.setRestaurantId(request.getRestaurantId());
        order.setDeliveryAddress(request.getDeliveryAddress());
        order.setStatus(OrderStatus.PENDING);

        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        // 3. Duyệt qua từng món để lấy giá và tính tiền (Gọi sang Restaurant Service)
        for (OrderItemRequest itemRequest : request.getItems()) {
            // Gọi Restaurant Service lấy thông tin món ăn
            DishResponse dish = restaurantClient.getDishById(itemRequest.getDishId());

            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setDishId(dish.getId());
            orderItem.setDishName(dish.getName());
            orderItem.setUnitPrice(dish.getPrice());
            orderItem.setQuantity(itemRequest.getQuantity());

            // Tính tổng tiền
            BigDecimal subTotal = dish.getPrice().multiply(BigDecimal.valueOf(itemRequest.getQuantity()));
            totalAmount = totalAmount.add(subTotal);

            orderItems.add(orderItem);
        }

        order.setTotalAmount(totalAmount);
        order.setItems(orderItems);

        // 4. Lưu xuống DB
        Order savedOrder = orderRepository.save(order);

        // 5. Map sang Response
        return mapToOrderResponse(savedOrder);
    }

    public OrderResponse getOrderById(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        return mapToOrderResponse(order);
    }

    // Helper mapping
    private OrderResponse mapToOrderResponse(Order order) {
        OrderResponse response = new OrderResponse();
        response.setId(order.getId());
        response.setUserId(order.getCustomerId());
        response.setRestaurantId(order.getRestaurantId());
        response.setTotalAmount(order.getTotalAmount());
        response.setStatus(order.getStatus());
        response.setDeliveryAddress(order.getDeliveryAddress());
        response.setCreatedAt(order.getCreatedAt());

        List<OrderItemResponse> itemResponses = order.getItems().stream().map(item -> {
            OrderItemResponse itemResp = new OrderItemResponse();
            itemResp.setDishId(item.getDishId());
            itemResp.setDishName(item.getDishName());
            itemResp.setUnitPrice(item.getUnitPrice());
            itemResp.setQuantity(item.getQuantity());
            itemResp.setSubTotal(item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
            return itemResp;
        }).collect(Collectors.toList());

        response.setItems(itemResponses);
        return response;
    }

    public OrderResponse updateOrderStatus(Long orderId, OrderStatus newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));
        
        order.setStatus(newStatus);
        Order savedOrder = orderRepository.save(order);
        
        // Nếu cần, tại đây có thể bắn event sang Delivery Service nếu status = PAID
        
        return mapToOrderResponse(savedOrder);
    }
}