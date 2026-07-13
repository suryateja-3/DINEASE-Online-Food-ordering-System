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
}
