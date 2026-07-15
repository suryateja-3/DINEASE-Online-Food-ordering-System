package com.foodordering.controller;

import com.foodordering.model.Coupon;
import com.foodordering.model.User;
import com.foodordering.repository.CouponRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/admin/coupons")
public class AdminCouponRestController {

    @Autowired
    private CouponRepository couponRepository;

    private boolean isAdmin(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return false;
        User user = (User) session.getAttribute("currentUser");
        return user != null && "ADMIN".equalsIgnoreCase(user.getRole());
    }

    // GET /admin/coupons - list all coupons
    @GetMapping
    public ResponseEntity<?> getAllCoupons(HttpServletRequest request) {
        if (!isAdmin(request)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Admin access required.");
        }
        return ResponseEntity.ok(couponRepository.findAll());
    }

    // GET /admin/coupons/{id} - get single coupon
    @GetMapping("/{id}")
    public ResponseEntity<?> getCoupon(@PathVariable Long id, HttpServletRequest request) {
        if (!isAdmin(request)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Admin access required.");
        }
        return couponRepository.findById(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // POST /admin/coupons - create new coupon
    @PostMapping
    public ResponseEntity<?> createCoupon(@RequestBody Coupon coupon, HttpServletRequest request) {
        if (!isAdmin(request)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Admin access required.");
        }
        if (coupon.getCode() == null || coupon.getCode().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Coupon code is required.");
        }
        coupon.setCode(coupon.getCode().trim().toUpperCase());
        Optional<Coupon> existing = couponRepository.findByCode(coupon.getCode());
        if (existing.isPresent()) {
            return ResponseEntity.badRequest().body("A coupon with this code already exists.");
        }
        if (coupon.getStatus() == null || coupon.getStatus().trim().isEmpty()) {
            coupon.setStatus("ACTIVE");
        }
        if (coupon.getUsageCount() == null) {
            coupon.setUsageCount(0);
        }
        if (coupon.getExpiryDate() == null) {
            coupon.setExpiryDate(LocalDate.now().plusMonths(1));
        }
        Coupon saved = couponRepository.save(coupon);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // PUT /admin/coupons/{id} - update existing coupon
    @PutMapping("/{id}")
    public ResponseEntity<?> updateCoupon(@PathVariable Long id, @RequestBody Coupon updates,
                                          HttpServletRequest request) {
        if (!isAdmin(request)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Admin access required.");
        }
        Optional<Coupon> optCoupon = couponRepository.findById(id);
        if (optCoupon.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Coupon coupon = optCoupon.get();
        if (updates.getDescription() != null) coupon.setDescription(updates.getDescription());
        if (updates.getDiscountPercentage() != null) coupon.setDiscountPercentage(updates.getDiscountPercentage());
        if (updates.getMaxDiscount() != null) coupon.setMaxDiscount(updates.getMaxDiscount());
        if (updates.getMinOrderAmount() != null) coupon.setMinOrderAmount(updates.getMinOrderAmount());
        if (updates.getExpiryDate() != null) coupon.setExpiryDate(updates.getExpiryDate());
        if (updates.getStatus() != null) coupon.setStatus(updates.getStatus());
        return ResponseEntity.ok(couponRepository.save(coupon));
    }

    // PUT /admin/coupons/{id}/toggle - enable or disable a coupon
    @PutMapping("/{id}/toggle")
    public ResponseEntity<?> toggleCoupon(@PathVariable Long id, HttpServletRequest request) {
        if (!isAdmin(request)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Admin access required.");
        }
        Optional<Coupon> optCoupon = couponRepository.findById(id);
        if (optCoupon.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Coupon coupon = optCoupon.get();
        String newStatus = "ACTIVE".equalsIgnoreCase(coupon.getStatus()) ? "INACTIVE" : "ACTIVE";
        coupon.setStatus(newStatus);
        couponRepository.save(coupon);
        return ResponseEntity.ok("Coupon status changed to " + newStatus);
    }

    // DELETE /admin/coupons/{id} - delete a coupon
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCoupon(@PathVariable Long id, HttpServletRequest request) {
        if (!isAdmin(request)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Admin access required.");
        }
        if (!couponRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        couponRepository.deleteById(id);
        return ResponseEntity.ok("Coupon deleted successfully.");
    }
}
