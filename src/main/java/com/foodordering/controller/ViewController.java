package com.foodordering.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ViewController {

    @GetMapping("/")
    public String home() {
        return "index";
    }

    @GetMapping("/login-page")
    public String loginPage() {
        return "index";
    }

    @GetMapping("/register-page")
    public String registerPage() {
        return "index";
    }

    @GetMapping("/restaurants-page")
    public String restaurantsPage() {
        return "index";
    }

    @GetMapping("/restaurant-details-page")
    public String restaurantDetailsPage() {
        return "index";
    }

    @GetMapping("/menu-page")
    public String menuPage() {
        return "index";
    }

    @GetMapping("/cart-page")
    public String cartPage() {
        return "index";
    }

    @GetMapping("/checkout-page")
    public String checkoutPage() {
        return "index";
    }

    @GetMapping("/payment-page")
    public String paymentPage() {
        return "index";
    }

    @GetMapping("/orders-page")
    public String ordersPage() {
        return "index";
    }

    @GetMapping("/profile-page")
    public String profilePage() {
        return "index";
    }

    @GetMapping("/admin-page")
    public String adminPage() {
        return "index";
    }

    @GetMapping("/admin-login")
    public String adminLoginPage() {
        return "index";
    }

    @GetMapping("/wallet-page")
    public String walletPage() {
        return "index";
    }
}

