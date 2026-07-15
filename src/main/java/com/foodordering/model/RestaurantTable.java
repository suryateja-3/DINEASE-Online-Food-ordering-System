package com.foodordering.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "restaurant_tables")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RestaurantTable {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long restaurantId;
    private String tableNumber; // e.g., "Table A1"
    private String tableType; // "2-Seater", "4-Seater", "Family Table"
    private Integer capacity; // 2, 4, 8
    private boolean available = true;
}
