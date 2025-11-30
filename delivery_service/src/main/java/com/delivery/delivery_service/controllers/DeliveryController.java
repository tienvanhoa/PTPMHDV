package com.delivery.delivery_service.controllers;

import com.delivery.delivery_service.dto.DriverAssignRequest; // Đảm bảo bạn có file DTO này
import com.delivery.delivery_service.models.Delivery;
import com.delivery.delivery_service.models.DeliveryStatus;
import com.delivery.delivery_service.services.DeliveryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/deliveries")


@CrossOrigin(origins = "*") 
public class DeliveryController {

    @Autowired
    private DeliveryService deliveryService;

    @PostMapping
    public ResponseEntity<?> createDelivery(@RequestBody Delivery delivery) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(deliveryService.createDelivery(delivery));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getDelivery(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(deliveryService.getDeliveryById(id));
        } catch (Exception e) {
             return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<?> getDeliveryByOrder(@PathVariable String orderId) {
        return ResponseEntity.ok(deliveryService.getDeliveryByOrderId(orderId));
    }

    @GetMapping
    public ResponseEntity<List<Delivery>> getAll() {
        return ResponseEntity.ok(deliveryService.getAllDeliveries());
    }

    @PostMapping("/{id}/assign-driver")
    public ResponseEntity<?> assignDriver(@PathVariable Long id, @RequestBody DriverAssignRequest request) {
        try {
            return ResponseEntity.ok(deliveryService.assignDriver(id, 
                request.getDriverId(), 
                request.getDriverName(), 
                request.getVehicleNumber()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> request) {
        return ResponseEntity.ok(deliveryService.updateDeliveryStatus(id, DeliveryStatus.valueOf(request.get("status"))));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            deliveryService.deleteDelivery(id);
            return ResponseEntity.ok("Deleted");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}