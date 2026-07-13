package com.foodordering.controller;

import com.foodordering.model.Payment;
import com.foodordering.model.User;
import com.foodordering.repository.PaymentRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/payments")
public class PaymentRestController {

    @Autowired
    private PaymentRepository paymentRepository;

    // 1. Get all payments (Admin feature)
    @GetMapping
    public ResponseEntity<List<Payment>> getAllPayments(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        if (currentUser == null || !"ADMIN".equalsIgnoreCase(currentUser.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(paymentRepository.findAll());
    }

    // 2. Get payment by order ID
    @GetMapping("/order/{orderId}")
    public ResponseEntity<Payment> getPaymentByOrderId(@PathVariable Long orderId) {
        return paymentRepository.findByOrderId(orderId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // 3. Process new payment
    @PostMapping
    public ResponseEntity<?> createPayment(@RequestBody Payment payment, HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Login required to process payment.");
        }

        if (payment.getOrderId() == null || payment.getAmount() == null || payment.getPaymentMethod() == null) {
            return ResponseEntity.badRequest().body("OrderId, amount, and paymentMethod are required.");
        }

        payment.setPaymentStatus("SUCCESS"); // Simulated success
        Payment saved = paymentRepository.save(payment);
        return ResponseEntity.ok(saved);
    }
}
