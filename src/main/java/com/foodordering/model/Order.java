package com.foodordering.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId;
    private Long restaurantId;
    private Double totalAmount = 0.0;
    private String arrivalDate;
    private String arrivalTime;
    private Integer numberOfPeople = 1;
    
    @Column(length = 1000)
    private String specialInstructions;

    private String orderStatus = "Pending"; // Pending, Accepted, Preparing, Ready, Completed, Cancelled
    private String deliveryAddress = "Dine-In Reservation"; // fallback
    
    @Column(length = 2000)
    private String itemsText; // list of ordered items (e.g. "Burgers x2, Soda x1")

    private Integer estimatedPreparationTime = 15; // in minutes

    private Long tableId;
    private String tableNumber;
    private String tableType;

    // Cancellation & No-Show Policy Fields
    private String cancellationTime;
    private Double cancellationFee = 0.0;
    private Double noShowPenalty = 0.0;
    private String paymentType;
    private String reservationStatus = "Pending";
    private Integer guestsCount = 1;
    private Boolean penaltyWaived = false;

    // Coupon & Wallet Tracking Fields
    private String appliedCouponCode;
    private Double couponDiscount = 0.0;
    private Double walletDiscountUsed = 0.0;

    // Kitchen Scheduling System Timestamps
    private java.time.LocalDateTime orderTime;
    private java.time.LocalDateTime acceptedTime;
    private java.time.LocalDateTime preparationStartTime;
    private java.time.LocalDateTime readyTime;
    private java.time.LocalDateTime completedTime;
    private Integer totalPreparationTime;
}
