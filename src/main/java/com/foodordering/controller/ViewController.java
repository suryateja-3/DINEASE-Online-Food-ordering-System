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
        return "login";
    }

    @GetMapping("/register-page")
    public String registerPage() {
        return "register";
    }

    @GetMapping("/restaurants-page")
    public String restaurantsPage() {
        return "restaurants";
    }

    @GetMapping("/restaurant-details-page")
    public String restaurantDetailsPage() {
        return "restaurant_details";
    }

    @GetMapping("/menu-page")
    public String menuPage() {
        return "menu";
    }

    @GetMapping("/cart-page")
    public String cartPage() {
        return "cart";
    }

    @GetMapping("/checkout-page")
    public String checkoutPage() {
        return "checkout";
    }

    @GetMapping("/payment-page")
    public String paymentPage() {
        return "payment";
    }

    @GetMapping("/orders-page")
    public String ordersPage() {
        return "orders";
    }

    @GetMapping("/profile-page")
    public String profilePage() {
        return "profile";
    }

    @GetMapping("/admin-page")
    public String adminPage() {
        return "admin";
    }
}
