package com.delivery.delivery_service.services;

import com.delivery.delivery_service.models.Delivery;
import com.delivery.delivery_service.models.DeliveryStatus;
import com.delivery.delivery_service.repositories.DeliveryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class DeliveryService {

    @Autowired
    private DeliveryRepository deliveryRepository;

    public Delivery createDelivery(Delivery delivery) {
        if (deliveryRepository.existsByOrderId(delivery.getOrderId())) {
            throw new RuntimeException("Order ID already exists!");
        }
        delivery.setStatus(DeliveryStatus.PENDING);
        return deliveryRepository.save(delivery);
    }

    public Delivery getDeliveryById(Long id) {
        return deliveryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Delivery not found: " + id));
    }
    
    public Delivery getDeliveryByOrderId(String orderId) {
        return deliveryRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Delivery not found for Order: " + orderId));
    }

    public Delivery assignDriver(Long id, String driverId, String driverName, String vehicleNumber) {
        Delivery delivery = getDeliveryById(id);
        if (delivery.getStatus() != DeliveryStatus.PENDING) {
            throw new RuntimeException("Can only assign driver to PENDING delivery");
        }
        delivery.setDriverId(driverId);
        delivery.setDriverName(driverName);
        delivery.setVehicleNumber(vehicleNumber);
        delivery.setStatus(DeliveryStatus.CONFIRMED);
        return deliveryRepository.save(delivery);
    }
    
    public Delivery updateDeliveryStatus(Long id, DeliveryStatus status) {
        Delivery delivery = getDeliveryById(id);
        delivery.setStatus(status);
        return deliveryRepository.save(delivery);
    }

    public Delivery updateDelivery(Long id, Delivery updatedDelivery) {
        Delivery delivery = getDeliveryById(id);
        delivery.setRecipientName(updatedDelivery.getRecipientName());
        delivery.setRecipientPhone(updatedDelivery.getRecipientPhone());
        delivery.setDeliveryAddress(updatedDelivery.getDeliveryAddress());
        delivery.setShippingCost(updatedDelivery.getShippingCost());
        delivery.setNotes(updatedDelivery.getNotes());
        return deliveryRepository.save(delivery);
    }

    public void deleteDelivery(Long id) {
        Delivery delivery = getDeliveryById(id);
        if (delivery.getStatus() != DeliveryStatus.PENDING) {
            throw new RuntimeException("Can only delete PENDING delivery");
        }
        deliveryRepository.deleteById(id);
    }
    
    public List<Delivery> getAllDeliveries() { return deliveryRepository.findAll(); }
    public List<Delivery> getDeliveriesByDriver(String driverId) { return deliveryRepository.findByDriverId(driverId); }
    public List<Delivery> getDeliveriesByStatus(DeliveryStatus status) { return deliveryRepository.findByStatus(status); }
    
    public Delivery completeDelivery(Long id) {
        return updateDeliveryStatus(id, DeliveryStatus.DELIVERED);
    }
    
    public Delivery failDelivery(Long id, String reason) {
        Delivery delivery = getDeliveryById(id);
        delivery.setStatus(DeliveryStatus.FAILED);
        delivery.setNotes("Fail reason: " + reason);
        return deliveryRepository.save(delivery);
    }
}