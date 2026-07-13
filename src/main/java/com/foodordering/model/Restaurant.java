package com.foodordering.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "restaurants")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Restaurant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String restaurantName;
    private String ownerName;
    private String email;
    private String phone;
    
    @Column(length = 500)
    private String address;
    
    private String cuisine;
    private String openingTime;
    private String closingTime;
    private Double rating = 0.0;

    @Column(length = 1000)
    private String imageUrl;
}
