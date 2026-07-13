package com.foodordering.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "food_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FoodItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String foodName;

    @Column(length = 1000)
    private String description;

    private String category;
    private Double price;
    private Integer quantity = 0;
    private boolean available = true;
    private Integer preparationTime = 15; // default 15 minutes

    @Column(length = 1000)
    private String imageUrl;

    private Long restaurantId;
}
