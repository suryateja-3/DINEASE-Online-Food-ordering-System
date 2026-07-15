package com.foodordering.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Entity
@Table(name = "coupons")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Coupon {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String code;

    private String description;
    private Double discountPercentage;
    private Double maxDiscount;
    private LocalDate expiryDate;
    private String status = "ACTIVE"; // ACTIVE, DISABLED, EXPIRED
    private Integer usageLimit = 1000;
    private Integer usageCount = 0;
    private Double minOrderAmount = 0.0;
    private String type = "STANDARD"; // STANDARD, MONTHLY, PREMIUM, REFERRAL, NEW_USER
}
