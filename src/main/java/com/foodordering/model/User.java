package com.foodordering.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    private String phone;
    
    @Column(length = 500)
    private String address;

    private String password;

    private String role = "USER"; // USER or ADMIN

    private Double totalPenalty = 0.0;

    private Boolean suspended = false;

    private String referralCode;
    private String referredByCode;
    private Double walletBalance = 0.0;
    private Boolean firstOrderCompleted = false;
}
