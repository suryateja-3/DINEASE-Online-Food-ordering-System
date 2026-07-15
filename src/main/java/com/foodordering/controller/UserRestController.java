package com.foodordering.controller;

import com.foodordering.model.User;
import com.foodordering.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/users")
public class UserRestController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.foodordering.repository.WalletTransactionRepository walletTransactionRepository;

    @Autowired
    private com.foodordering.repository.UserCouponRepository userCouponRepository;

    @Autowired
    private com.foodordering.repository.CouponRepository couponRepository;

    // 1. Get All Users (Admin Feature)
    @GetMapping
    public ResponseEntity<List<User>> getAllUsers(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        if (currentUser == null || !"ADMIN".equalsIgnoreCase(currentUser.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(userRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> registerUser(@RequestBody User user) {
        if (user.getEmail() == null || user.getEmail().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Email is required.");
        }
        if (userRepository.findByEmail(user.getEmail().trim()).isPresent()) {
            return ResponseEntity.badRequest().body("Email already registered!");
        }

        // Validate referredByCode if provided
        if (user.getReferredByCode() != null && !user.getReferredByCode().trim().isEmpty()) {
            String refCode = user.getReferredByCode().trim();
            if (userRepository.findByReferralCode(refCode).isEmpty()) {
                return ResponseEntity.badRequest().body("Invalid referral code. Please check and try again.");
            }
            user.setReferredByCode(refCode);
        }
        
        user.setEmail(user.getEmail().trim());
        if (user.getRole() == null || user.getRole().trim().isEmpty()) {
            user.setRole("USER");
        }
        user.setWalletBalance(0.0);
        user.setFirstOrderCompleted(false);
        user.setTotalPenalty(0.0);
        user.setSuspended(false);

        User savedUser = userRepository.save(user);

        // Generate and save unique referral code
        String namePart = savedUser.getName() != null ? savedUser.getName().replaceAll("\\s+", "").toUpperCase() : "USER";
        if (namePart.length() > 4) {
            namePart = namePart.substring(0, 4);
        }
        savedUser.setReferralCode("REF-" + savedUser.getId() + "-" + namePart);
        User finalUser = userRepository.save(savedUser);

        return ResponseEntity.ok(finalUser);
    }

    // 3. User Login
    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody Map<String, String> credentials, HttpServletRequest request) {
        String email = credentials.get("email");
        String password = credentials.get("password");

        if (email == null || password == null) {
            return ResponseEntity.badRequest().body("Email and password are required.");
        }

        Optional<User> userOpt = userRepository.findByEmail(email.trim());
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (Boolean.TRUE.equals(user.getSuspended())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Your account has been suspended by the administrator.");
            }
            if (user.getPassword().equals(password)) {
                HttpSession session = request.getSession(true);
                session.setAttribute("currentUser", user);
                return ResponseEntity.ok(user);
            }
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid email or password!");
    }

    // 4. Retrieve Logged-in User Profile
    @GetMapping("/me")
    public ResponseEntity<User> getLoggedInUser(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(currentUser);
    }

    // 5. User Logout
    @PostMapping("/logout")
    public ResponseEntity<Void> logoutUser(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        return ResponseEntity.ok().build();
    }

    // 6. Update User Profile
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody User updatedUser, HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Not authenticated.");
        }
        
        // Users can only update their own profile, unless they are admin
        if (!currentUser.getId().equals(id) && !"ADMIN".equalsIgnoreCase(currentUser.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
        }

        return userRepository.findById(id).map(user -> {
            user.setName(updatedUser.getName());
            user.setEmail(updatedUser.getEmail().trim());
            user.setPhone(updatedUser.getPhone());
            user.setAddress(updatedUser.getAddress());
            
            if (updatedUser.getPassword() != null && !updatedUser.getPassword().trim().isEmpty()) {
                user.setPassword(updatedUser.getPassword());
            }

            User saved = userRepository.save(user);
            
            // If the user updated their own profile, refresh session cache
            if (currentUser.getId().equals(id)) {
                session.setAttribute("currentUser", saved);
            }
            return ResponseEntity.ok(saved);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }


    // 8. Suspend User (Admin)
    @PutMapping("/{id}/suspend")
    public ResponseEntity<?> suspendUser(@PathVariable Long id, HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        if (currentUser == null || !"ADMIN".equalsIgnoreCase(currentUser.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Admin privilege required.");
        }
        return userRepository.findById(id).map(user -> {
            if ("ADMIN".equalsIgnoreCase(user.getRole())) {
                return ResponseEntity.badRequest().body("Cannot suspend admin accounts.");
            }
            user.setSuspended(true);
            userRepository.save(user);
            return ResponseEntity.ok().body("User suspended successfully.");
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // 9. Reactivate User (Admin)
    @PutMapping("/{id}/reactivate")
    public ResponseEntity<?> reactivateUser(@PathVariable Long id, HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        if (currentUser == null || !"ADMIN".equalsIgnoreCase(currentUser.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Admin privilege required.");
        }
        return userRepository.findById(id).map(user -> {
            user.setSuspended(false);
            userRepository.save(user);
            return ResponseEntity.ok().body("User reactivated successfully.");
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/wallet")
    public ResponseEntity<?> getWallet(@PathVariable Long id) {
        return userRepository.findById(id).map(user -> {
            List<com.foodordering.model.WalletTransaction> txs = walletTransactionRepository.findByUserId(id);
            txs.sort((a, b) -> b.getId().compareTo(a.getId()));
            return ResponseEntity.ok(Map.of(
                "walletBalance", user.getWalletBalance() != null ? user.getWalletBalance() : 0.0,
                "transactions", txs
            ));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/coupons")
    public ResponseEntity<?> getCoupons(@PathVariable Long id) {
        return userRepository.findById(id).map(user -> {
            List<com.foodordering.model.UserCoupon> userCoupons = userCouponRepository.findByUserId(id);
            java.util.List<Map<String, Object>> result = new java.util.ArrayList<>();

            if (user.getFirstOrderCompleted() == null || !user.getFirstOrderCompleted()) {
                result.add(Map.of(
                    "code", "NEWUSER25",
                    "discountPercentage", 25.0,
                    "maxDiscount", 1000.0,
                    "expiryDate", java.time.LocalDate.now().plusDays(30).toString(),
                    "used", false,
                    "minOrderAmount", 0.0,
                    "description", "25% Off on your first order!",
                    "type", "NEW_USER"
                ));
            }

            for (com.foodordering.model.UserCoupon uc : userCoupons) {
                Optional<com.foodordering.model.Coupon> optC = couponRepository.findByCode(uc.getCouponCode());
                if (optC.isPresent()) {
                    com.foodordering.model.Coupon c = optC.get();
                    result.add(Map.of(
                        "code", c.getCode(),
                        "discountPercentage", c.getDiscountPercentage(),
                        "maxDiscount", c.getMaxDiscount(),
                        "expiryDate", uc.getExpiryDate().toString(),
                        "used", uc.getUsed(),
                        "minOrderAmount", c.getMinOrderAmount(),
                        "description", c.getType() + " Reward Coupon",
                        "type", c.getType()
                    ));
                } else {
                    result.add(Map.of(
                        "code", uc.getCouponCode(),
                        "discountPercentage", 10.0,
                        "maxDiscount", 200.0,
                        "expiryDate", uc.getExpiryDate().toString(),
                        "used", uc.getUsed(),
                        "minOrderAmount", 0.0,
                        "description", "Reward Coupon",
                        "type", "STANDARD"
                    ));
                }
            }
            return ResponseEntity.ok(result);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}
