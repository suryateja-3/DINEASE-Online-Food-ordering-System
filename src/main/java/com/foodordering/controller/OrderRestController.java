package com.foodordering.controller;

import com.foodordering.model.CartItem;
import com.foodordering.model.FoodItem;
import com.foodordering.model.Order;
import com.foodordering.model.User;
import com.foodordering.repository.CartItemRepository;
import com.foodordering.repository.FoodItemRepository;
import com.foodordering.repository.OrderRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.foodordering.model.Restaurant;
import com.foodordering.repository.RestaurantRepository;
import com.foodordering.repository.UserRepository;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import com.foodordering.service.EmailService;


@RestController
@RequestMapping("/orders")
public class OrderRestController {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private FoodItemRepository foodItemRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RestaurantRepository restaurantRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private com.foodordering.repository.WalletTransactionRepository walletTransactionRepository;

    @Autowired
    private com.foodordering.repository.UserCouponRepository userCouponRepository;

    @Autowired
    private com.foodordering.repository.CouponRepository couponRepository;

    // 1. Get all orders (Admin or Session authorized)
    @GetMapping
    public ResponseEntity<List<Order>> getAllOrders(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        if (currentUser == null || !"ADMIN".equalsIgnoreCase(currentUser.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(orderRepository.findAll());
    }

    // 2. Get orders by user ID
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserOrders(@PathVariable Long userId, HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Not authenticated.");
        }
        if (!currentUser.getId().equals(userId) && !"ADMIN".equalsIgnoreCase(currentUser.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
        }
        return ResponseEntity.ok(orderRepository.findByUserId(userId));
    }

    // 3. Place a new Order from cart
    @PostMapping
    @Transactional
    public ResponseEntity<?> placeOrder(@RequestBody Order orderInput, HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Login required to place order.");
        }

        Long userId = orderInput.getUserId();
        if (userId == null) {
            userId = currentUser.getId();
        }

        List<CartItem> cartItems = cartItemRepository.findByUserId(userId);
        if (cartItems.isEmpty()) {
            return ResponseEntity.badRequest().body("Your cart is empty! Add items to cart first.");
        }

        // Calculate Totals & Prep Time, and build item text representation
        double totalAmount = 0.0;
        int maxPrepTime = 0;
        Long restaurantId = cartItems.get(0).getRestaurantId();
        
        StringBuilder itemsTextBuilder = new StringBuilder();

        for (int i = 0; i < cartItems.size(); i++) {
            CartItem cartItem = cartItems.get(i);
            totalAmount += cartItem.getTotalPrice();

            // Format: Hamburger [Extra Cheese] (x2), French Fries (x1)
            itemsTextBuilder.append(cartItem.getFoodName());
            if (cartItem.getCustomizations() != null && !cartItem.getCustomizations().trim().isEmpty()) {
                itemsTextBuilder.append(" [").append(cartItem.getCustomizations().trim()).append("]");
            }
            itemsTextBuilder.append(" (x").append(cartItem.getQuantity()).append(")");
            if (i < cartItems.size() - 1) {
                itemsTextBuilder.append(", ");
            }

            // Fetch food item to check and update stock
            FoodItem foodItem = foodItemRepository.findById(cartItem.getFoodItemId()).orElse(null);
            if (foodItem != null) {
                if (foodItem.getPreparationTime() > maxPrepTime) {
                    maxPrepTime = foodItem.getPreparationTime();
                }
                // Update stock inventory
                int remainingQty = foodItem.getQuantity() - cartItem.getQuantity();
                if (remainingQty < 0) {
                    return ResponseEntity.badRequest().body("Insufficient stock for item: " + foodItem.getFoodName() + ". Available: " + foodItem.getQuantity());
                }
                foodItem.setQuantity(remainingQty);
                if (remainingQty == 0) {
                    foodItem.setAvailable(false);
                }
                foodItemRepository.save(foodItem);
            }
        }
        Restaurant restaurant = restaurantRepository.findById(restaurantId).orElse(null);
        if (restaurant == null) {
            return ResponseEntity.badRequest().body("Restaurant not found.");
        }

        java.time.LocalDateTime readyDateTime;
        java.time.LocalDateTime prepStartDateTime;
        try {
            java.time.LocalDate arrivalLocalDate = java.time.LocalDate.parse(orderInput.getArrivalDate());
            java.time.LocalTime arrivalLocalTime = java.time.LocalTime.parse(orderInput.getArrivalTime());
            readyDateTime = java.time.LocalDateTime.of(arrivalLocalDate, arrivalLocalTime);
            prepStartDateTime = readyDateTime.minusMinutes(maxPrepTime);
            
            java.time.LocalTime openingLocalTime = parseTime(restaurant.getOpeningTime());
            java.time.LocalTime closingLocalTime = parseTime(restaurant.getClosingTime());

            if (openingLocalTime != null && arrivalLocalTime.isBefore(openingLocalTime)) {
                return ResponseEntity.badRequest().body("Arrival time cannot be before restaurant opening time (" + restaurant.getOpeningTime() + ").");
            }
            if (closingLocalTime != null && arrivalLocalTime.isAfter(closingLocalTime)) {
                return ResponseEntity.badRequest().body("Arrival time cannot be after restaurant closing time (" + restaurant.getClosingTime() + ").");
            }
            if (openingLocalTime != null && prepStartDateTime.toLocalTime().isBefore(openingLocalTime)) {
                return ResponseEntity.badRequest().body("We cannot accept this booking. The kitchen would need to start preparing your food at " 
                    + prepStartDateTime.toLocalTime().toString() + ", which is before the restaurant's opening time (" + restaurant.getOpeningTime() + ").");
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Invalid arrival date or time format.");
        }

        // Build Order entity
        Order order = new Order();
        order.setUserId(userId);
        order.setRestaurantId(restaurantId);
        order.setTotalAmount(totalAmount);
        order.setArrivalDate(orderInput.getArrivalDate());
        order.setArrivalTime(orderInput.getArrivalTime());
        order.setNumberOfPeople(orderInput.getNumberOfPeople());
        order.setSpecialInstructions(orderInput.getSpecialInstructions());
        order.setOrderStatus("Pending");
        order.setDeliveryAddress("Dine-In Reservation");
        order.setItemsText(itemsTextBuilder.toString());
        order.setEstimatedPreparationTime(maxPrepTime > 0 ? maxPrepTime : 15);
        
        // Save Table Details
        order.setTableId(orderInput.getTableId());
        order.setTableNumber(orderInput.getTableNumber());
        order.setTableType(orderInput.getTableType());

        // Policy details mapping
        order.setPaymentType(orderInput.getPaymentType() != null ? orderInput.getPaymentType() : "Prepaid");
        order.setReservationStatus("Pending");
        order.setGuestsCount(orderInput.getNumberOfPeople() != null ? orderInput.getNumberOfPeople() : 1);

        // Kitchen Scheduling Timestamps
        order.setOrderTime(java.time.LocalDateTime.now());
        order.setAcceptedTime(order.getOrderTime().plusMinutes(2));
        order.setPreparationStartTime(prepStartDateTime);
        order.setReadyTime(readyDateTime);
        order.setTotalPreparationTime(maxPrepTime);
        order.setPenaltyWaived(false);
        order.setCancellationFee(0.0);
        order.setNoShowPenalty(0.0);
        order.setCouponDiscount(0.0);
        order.setWalletDiscountUsed(0.0);

        // Apply Coupon and Wallet Discounts
        User orderUser = userRepository.findById(userId).orElse(null);
        if (orderUser != null) {
            double couponDiscount = 0.0;
            String couponCode = orderInput.getAppliedCouponCode();
            if (couponCode != null && !couponCode.trim().isEmpty()) {
                couponCode = couponCode.trim();
                if ("NEWUSER25".equalsIgnoreCase(couponCode)) {
                    if (orderUser.getFirstOrderCompleted() == null || !orderUser.getFirstOrderCompleted()) {
                        couponDiscount = totalAmount * 0.25;
                        if (couponDiscount > 1000.0) couponDiscount = 1000.0;
                        order.setAppliedCouponCode(couponCode);
                    }
                } else {
                    java.util.Optional<com.foodordering.model.Coupon> optC = couponRepository.findByCode(couponCode);
                    if (optC.isPresent()) {
                        com.foodordering.model.Coupon c = optC.get();
                        if ("ACTIVE".equalsIgnoreCase(c.getStatus()) && totalAmount >= c.getMinOrderAmount()) {
                            java.util.Optional<com.foodordering.model.UserCoupon> optUC = userCouponRepository.findByUserIdAndCouponCode(userId, couponCode);
                            boolean alreadyUsed = optUC.isPresent() && Boolean.TRUE.equals(optUC.get().getUsed());
                            if (!alreadyUsed && c.getExpiryDate().isAfter(java.time.LocalDate.now())) {
                                couponDiscount = totalAmount * (c.getDiscountPercentage() / 100.0);
                                if (c.getMaxDiscount() != null && couponDiscount > c.getMaxDiscount()) {
                                    couponDiscount = c.getMaxDiscount();
                                }
                                order.setAppliedCouponCode(couponCode);
                                // Mark UserCoupon as used
                                if (optUC.isPresent()) {
                                    com.foodordering.model.UserCoupon uc = optUC.get();
                                    uc.setUsed(true);
                                    userCouponRepository.save(uc);
                                }
                                // Update Coupon usage count
                                c.setUsageCount(c.getUsageCount() + 1);
                                couponRepository.save(c);
                            }
                        }
                    }
                }
            }
            order.setCouponDiscount(couponDiscount);
            totalAmount = totalAmount - couponDiscount;

            // Apply Wallet Balance
            double walletUsed = 0.0;
            if (orderInput.getWalletDiscountUsed() != null && orderInput.getWalletDiscountUsed() > 0) {
                double requestedWallet = orderInput.getWalletDiscountUsed();
                double availableWallet = orderUser.getWalletBalance() != null ? orderUser.getWalletBalance() : 0.0;
                if (requestedWallet > availableWallet) requestedWallet = availableWallet;
                if (requestedWallet > totalAmount) requestedWallet = totalAmount;
                if (requestedWallet < 0) requestedWallet = 0;
                walletUsed = requestedWallet;
                orderUser.setWalletBalance(availableWallet - walletUsed);
                userRepository.save(orderUser);

                if (walletUsed > 0) {
                    com.foodordering.model.WalletTransaction debitTx = new com.foodordering.model.WalletTransaction();
                    debitTx.setUserId(userId);
                    debitTx.setAmount(walletUsed);
                    debitTx.setType("DEBIT");
                    debitTx.setDescription("Wallet Payment for Order #" + " (Pending)");
                    debitTx.setTransactionTime(java.time.LocalDateTime.now());
                    walletTransactionRepository.save(debitTx);
                }
            }
            order.setWalletDiscountUsed(walletUsed);
            totalAmount = totalAmount - walletUsed;
        }
        order.setTotalAmount(totalAmount < 0 ? 0.0 : totalAmount);

        Order savedOrder = orderRepository.save(order);

        // Clear cart
        cartItemRepository.deleteByUserId(userId);

        // Email notifications trigger
        try {
            userRepository.findById(userId).ifPresent(user -> {
                Restaurant rest = restaurantRepository.findById(restaurantId).orElse(null);
                String restName = (rest != null) ? rest.getRestaurantName() : "Partner Restaurant";
                
                if (!"Pay at Restaurant".equalsIgnoreCase(savedOrder.getPaymentType())) {
                    // Send Payment successful email
                    String paySubject = "Payment Successful - Slot Booked at " + restName + " (#" + savedOrder.getId() + ")";
                    String payBody = "Hello " + user.getName() + ",\n\n"
                            + "We have successfully received your online payment of ₹" + savedOrder.getTotalAmount().intValue()
                            + " for Dine-In slot booking and pre-ordering at " + restName + ".\n\n"
                            + "Reservation Details:\n"
                            + "- Slot ID: #" + savedOrder.getId() + "\n"
                            + "- Date: " + savedOrder.getArrivalDate() + " at " + savedOrder.getArrivalTime() + "\n"
                            + "- Guests: " + savedOrder.getGuestsCount() + "\n"
                            + "- Menu Items: " + savedOrder.getItemsText() + "\n\n"
                            + "Thank you for using DineEase!";
                    emailService.sendEmail(user.getEmail(), paySubject, payBody);

                    // Send Reservation Confirmed email
                    String confSubject = "Reservation Confirmed at " + restName + " (#" + savedOrder.getId() + ")";
                    String confBody = "Hello " + user.getName() + ",\n\n"
                            + "Your table reservation at " + restName + " has been CONFIRMED!\n"
                            + "We look forward to welcoming you on " + savedOrder.getArrivalDate() + " at " + savedOrder.getArrivalTime() + ".\n\n"
                            + "Thank you!";
                    emailService.sendEmail(user.getEmail(), confSubject, confBody);
                } else {
                    // Pay at Restaurant: Slot request receipt
                    String reqSubject = "Reservation Booking Request Received - " + restName + " (#" + savedOrder.getId() + ")";
                    String reqBody = "Hello " + user.getName() + ",\n\n"
                            + "We have received your table slot reservation request at " + restName + ".\n"
                            + "Your slot is currently PENDING approval from the restaurant.\n\n"
                            + "Reservation slot summary:\n"
                            + "- Slot ID: #" + savedOrder.getId() + "\n"
                            + "- Date: " + savedOrder.getArrivalDate() + " at " + savedOrder.getArrivalTime() + "\n"
                            + "- Total pre-order amount: ₹" + savedOrder.getTotalAmount().intValue() + "\n"
                            + "- Selected payment method: Pay at Restaurant (Subject to No-Show & Late cancellation policy)\n\n"
                            + "You will receive an email once the restaurant confirms your reservation.";
                    emailService.sendEmail(user.getEmail(), reqSubject, reqBody);
                }
            });
        } catch (Exception e) {
            System.err.println("Failed to send placement email: " + e.getMessage());
        }

        return ResponseEntity.ok(savedOrder);
    }

    @PutMapping("/{id}/edit")
    @Transactional
    public ResponseEntity<?> editOrder(@PathVariable Long id, @RequestBody Order editedInput, HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Login required.");
        }

        return orderRepository.findById(id).map(order -> {
            if (!currentUser.getId().equals(order.getUserId()) && !"ADMIN".equalsIgnoreCase(currentUser.getRole())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
            }

            String status = order.getOrderStatus();
            if ("Preparing".equalsIgnoreCase(status) || "Ready to Serve".equalsIgnoreCase(status) || "Completed".equalsIgnoreCase(status) || "Cancelled".equalsIgnoreCase(status) || "No Show".equalsIgnoreCase(status)) {
                return ResponseEntity.badRequest().body("Editing is not allowed once food preparation has started or order is finalized.");
            }

            try {
                java.time.LocalDate originalDate = java.time.LocalDate.parse(order.getArrivalDate());
                java.time.LocalTime originalTime = parseTime(order.getArrivalTime());
                java.time.LocalDateTime originalArrival = java.time.LocalDateTime.of(originalDate, originalTime);
                if (java.time.LocalDateTime.now().isAfter(originalArrival.minusMinutes(90))) {
                    return ResponseEntity.badRequest().body("Editing is only allowed until 1 hour and 30 minutes before the arrival time.");
                }
            } catch (Exception e) {
                // Parse error on original, skip cutoff checks but proceed
            }

            Restaurant restaurant = restaurantRepository.findById(order.getRestaurantId()).orElse(null);
            if (restaurant == null) {
                return ResponseEntity.badRequest().body("Restaurant not found.");
            }

            java.time.LocalDate newDate;
            java.time.LocalTime newTime;
            java.time.LocalDateTime newArrival;
            try {
                newDate = java.time.LocalDate.parse(editedInput.getArrivalDate());
                newTime = parseTime(editedInput.getArrivalTime());
                newArrival = java.time.LocalDateTime.of(newDate, newTime);
                if (java.time.LocalDateTime.now().isAfter(newArrival.minusMinutes(90))) {
                    return ResponseEntity.badRequest().body("Selected new arrival time must be at least 1 hour and 30 minutes in the future.");
                }

                java.time.LocalTime openingLocalTime = parseTime(restaurant.getOpeningTime());
                java.time.LocalTime closingLocalTime = parseTime(restaurant.getClosingTime());

                if (openingLocalTime != null && newTime.isBefore(openingLocalTime)) {
                    return ResponseEntity.badRequest().body("Arrival time cannot be before restaurant opening time (" + restaurant.getOpeningTime() + ").");
                }
                if (closingLocalTime != null && newTime.isAfter(closingLocalTime)) {
                    return ResponseEntity.badRequest().body("Arrival time cannot be after restaurant closing time (" + restaurant.getClosingTime() + ").");
                }
                
                int maxPrepTime = editedInput.getEstimatedPreparationTime() != null && editedInput.getEstimatedPreparationTime() > 0 ? editedInput.getEstimatedPreparationTime() : order.getEstimatedPreparationTime();
                java.time.LocalDateTime prepStartDateTime = newArrival.minusMinutes(maxPrepTime);
                if (openingLocalTime != null && prepStartDateTime.toLocalTime().isBefore(openingLocalTime)) {
                    return ResponseEntity.badRequest().body("We cannot accept this booking timing. The kitchen would need to start preparing your food at " 
                        + prepStartDateTime.toLocalTime().toString() + ", which is before the restaurant's opening time (" + restaurant.getOpeningTime() + ").");
                }

                order.setEstimatedPreparationTime(maxPrepTime);
                order.setPreparationStartTime(prepStartDateTime);
                order.setReadyTime(newArrival);
                order.setTotalPreparationTime(maxPrepTime);
            } catch (Exception e) {
                return ResponseEntity.badRequest().body("Invalid arrival date or time format.");
            }

            User user = userRepository.findById(order.getUserId()).orElse(null);
            if (user != null) {
                // Refund previous wallet discount to user's wallet first
                if (order.getWalletDiscountUsed() != null && order.getWalletDiscountUsed() > 0) {
                    user.setWalletBalance(user.getWalletBalance() + order.getWalletDiscountUsed());
                    
                    com.foodordering.model.WalletTransaction refundTx = new com.foodordering.model.WalletTransaction();
                    refundTx.setUserId(user.getId());
                    refundTx.setAmount(order.getWalletDiscountUsed());
                    refundTx.setType("CREDIT");
                    refundTx.setDescription("Refund for Order #" + order.getId() + " edits");
                    refundTx.setTransactionTime(java.time.LocalDateTime.now());
                    walletTransactionRepository.save(refundTx);
                }
                
                // Calculate Coupon discount
                double couponDiscount = 0.0;
                if (editedInput.getAppliedCouponCode() != null && !editedInput.getAppliedCouponCode().trim().isEmpty()) {
                    String code = editedInput.getAppliedCouponCode().trim();
                    double baseAmount = editedInput.getTotalAmount();
                    if ("NEWUSER25".equalsIgnoreCase(code)) {
                        if (user.getFirstOrderCompleted() == null || !user.getFirstOrderCompleted()) {
                            couponDiscount = baseAmount * 0.25;
                            if (couponDiscount > 1000.0) couponDiscount = 1000.0;
                        }
                    } else {
                        Optional<com.foodordering.model.Coupon> optC = couponRepository.findByCode(code);
                        if (optC.isPresent()) {
                            com.foodordering.model.Coupon c = optC.get();
                            if (baseAmount >= c.getMinOrderAmount()) {
                                couponDiscount = baseAmount * (c.getDiscountPercentage() / 100.0);
                                if (c.getMaxDiscount() != null && couponDiscount > c.getMaxDiscount()) {
                                    couponDiscount = c.getMaxDiscount();
                                }
                            }
                        }
                    }
                }
                
                // Deduct new wallet discount
                double walletUsed = 0.0;
                if (editedInput.getWalletDiscountUsed() != null && editedInput.getWalletDiscountUsed() > 0) {
                    double requestedWallet = editedInput.getWalletDiscountUsed();
                    if (requestedWallet > user.getWalletBalance()) {
                        requestedWallet = user.getWalletBalance();
                    }
                    double maxWalletDeduct = editedInput.getTotalAmount() - couponDiscount;
                    if (requestedWallet > maxWalletDeduct) {
                        requestedWallet = maxWalletDeduct;
                    }
                    if (requestedWallet < 0) requestedWallet = 0;
                    
                    walletUsed = requestedWallet;
                    user.setWalletBalance(user.getWalletBalance() - walletUsed);
                    
                    com.foodordering.model.WalletTransaction debitTx = new com.foodordering.model.WalletTransaction();
                    debitTx.setUserId(user.getId());
                    debitTx.setAmount(walletUsed);
                    debitTx.setType("DEBIT");
                    debitTx.setDescription("Payment for Order #" + order.getId() + " edits");
                    debitTx.setTransactionTime(java.time.LocalDateTime.now());
                    walletTransactionRepository.save(debitTx);
                }
                
                userRepository.save(user);
                
                order.setAppliedCouponCode(editedInput.getAppliedCouponCode());
                order.setCouponDiscount(couponDiscount);
                order.setWalletDiscountUsed(walletUsed);
            }

            order.setItemsText(editedInput.getItemsText());
            order.setTotalAmount(editedInput.getTotalAmount());
            order.setArrivalDate(editedInput.getArrivalDate());
            order.setArrivalTime(editedInput.getArrivalTime());
            order.setPaymentType(editedInput.getPaymentType());
            order.setGuestsCount(editedInput.getGuestsCount() != null ? editedInput.getGuestsCount() : editedInput.getNumberOfPeople());
            order.setNumberOfPeople(order.getGuestsCount());
            order.setSpecialInstructions(editedInput.getSpecialInstructions());

            Order saved = orderRepository.save(order);

            // Trigger email: Order Edited
            try {
                if (user != null) {
                    emailService.sendEmail(user.getEmail(), "Order Edited - #" + order.getId(),
                        "Hello " + user.getName() + ",\n\nYour Dine-In Pre-Order #" + order.getId() 
                        + " has been successfully edited!\n\nNew Schedule Details:\n"
                        + "- Date: " + order.getArrivalDate() + " at " + order.getArrivalTime() + "\n"
                        + "- Total Amount: ₹" + order.getTotalAmount() + "\n"
                        + "- Items: " + order.getItemsText() + "\n\nThank you for choosing DineEase!");
                }
            } catch (Exception ex) {
                System.err.println("Failed to send order edited email: " + ex.getMessage());
            }

            return ResponseEntity.ok(saved);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // 4. Update order details (like Order Status from Admin)
    @PutMapping("/{id}")
    public ResponseEntity<?> updateOrder(@PathVariable Long id, @RequestBody Map<String, String> body, HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Login required.");
        }

        String newStatus = body.get("orderStatus");
        if (newStatus == null || newStatus.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("OrderStatus is required.");
        }

        return orderRepository.findById(id).map(order -> {
            // Security: Only Admin can change status of an order, except canceling pending order by the user
            boolean isOwner = currentUser.getId().equals(order.getUserId());
            boolean isAdmin = "ADMIN".equalsIgnoreCase(currentUser.getRole());

            if (!isAdmin && !isOwner) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
            }

            if (!isAdmin && "Cancelled".equalsIgnoreCase(newStatus)) {
                // Customer can cancel only if status is Pending
                if (!"Pending".equalsIgnoreCase(order.getOrderStatus())) {
                    return ResponseEntity.badRequest().body("Orders can only be cancelled while in Pending status.");
                }
            }

            String oldStatus = order.getOrderStatus();
            order.setOrderStatus(newStatus);
            order.setReservationStatus(newStatus);
            if ("Completed".equalsIgnoreCase(newStatus) && !"Completed".equalsIgnoreCase(oldStatus)) {
                order.setCompletedTime(java.time.LocalDateTime.now());

                User user = userRepository.findById(order.getUserId()).orElse(null);
                if (user != null && (user.getFirstOrderCompleted() == null || !user.getFirstOrderCompleted())) {
                    user.setFirstOrderCompleted(true);
                    userRepository.save(user);

                    if (user.getReferredByCode() != null && !user.getReferredByCode().trim().isEmpty()) {
                        Optional<User> optReferrer = userRepository.findByReferralCode(user.getReferredByCode().trim());
                        if (optReferrer.isPresent()) {
                            User referrer = optReferrer.get();
                            double balance = referrer.getWalletBalance() != null ? referrer.getWalletBalance() : 0.0;
                            referrer.setWalletBalance(balance + 200.0);
                            userRepository.save(referrer);

                            com.foodordering.model.WalletTransaction refTx = new com.foodordering.model.WalletTransaction();
                            refTx.setUserId(referrer.getId());
                            refTx.setAmount(200.0);
                            refTx.setType("CREDIT");
                            refTx.setDescription("Referral Reward - First Order completed by " + user.getName());
                            refTx.setTransactionTime(java.time.LocalDateTime.now());
                            walletTransactionRepository.save(refTx);

                            try {
                                emailService.sendEmail(referrer.getEmail(), "Referral Reward Added - ₹200 Credited!",
                                    "Hello " + referrer.getName() + ",\n\n"
                                    + "Congratulations! Your friend " + user.getName() + " has completed their first successful order.\n"
                                    + "We have credited ₹200 to your Digital Wallet as a reward!\n\n"
                                    + "You can use this wallet balance during checkout for your future reservations.\n\n"
                                    + "Thank you for sharing DineEase!");
                            } catch (Exception ex) {
                                System.err.println("Referral email failed: " + ex.getMessage());
                            }
                        }
                    }
                }
            }
            Order saved = orderRepository.save(order);

            try {
                sendStatusNotificationEmail(saved, oldStatus, newStatus);
            } catch (Exception e) {
                System.err.println("Failed to send status notification email: " + e.getMessage());
            }

            return ResponseEntity.ok(saved);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // 5. Get cancellation fee quote before confirming cancellation
    @GetMapping("/{id}/cancellation-quote")
    public ResponseEntity<?> getCancellationQuote(@PathVariable Long id, HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Login required.");
        }

        return orderRepository.findById(id).map(order -> {
            boolean isOwner = currentUser.getId().equals(order.getUserId());
            boolean isAdmin = "ADMIN".equalsIgnoreCase(currentUser.getRole());
            if (!isAdmin && !isOwner) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
            }

            Map<String, Object> response = new HashMap<>();
            response.put("orderId", order.getId());
            response.put("paymentType", order.getPaymentType());
            response.put("totalAmount", order.getTotalAmount());
            response.put("arrivalDate", order.getArrivalDate());
            response.put("arrivalTime", order.getArrivalTime());

            if (!"Pay at Restaurant".equalsIgnoreCase(order.getPaymentType())) {
                response.put("fee", 0.0);
                response.put("isLate", false);
                response.put("policyApplies", false);
                response.put("message", "Prepaid orders are not subject to late cancellation fees.");
            } else {
                try {
                    LocalDate arrDate = LocalDate.parse(order.getArrivalDate());
                    LocalTime arrTime = parseTime(order.getArrivalTime());
                    LocalDateTime arrivalDateTime = LocalDateTime.of(arrDate, arrTime);
                    LocalDateTime now = LocalDateTime.now();

                    if (now.isBefore(arrivalDateTime.minusHours(1))) {
                        response.put("fee", 0.0);
                        response.put("isLate", false);
                        response.put("policyApplies", true);
                        response.put("message", "Free cancellation: Cancelled at least 1 hour before arrival.");
                    } else if (now.isBefore(arrivalDateTime.plusHours(1))) {
                        double fee = order.getTotalAmount() * 0.10;
                        response.put("fee", fee);
                        response.put("isLate", true);
                        response.put("policyApplies", true);
                        response.put("message", "Late cancellation: 10% fee applies within 1 hour of reservation arrival.");
                    } else {
                        double penalty = order.getTotalAmount() * 0.20;
                        response.put("fee", penalty);
                        response.put("isLate", true);
                        response.put("policyApplies", true);
                        response.put("message", "Grace period exceeded: Order is marked as No-Show. 20% penalty applies.");
                    }
                } catch (Exception e) {
                    response.put("fee", 0.0);
                    response.put("isLate", false);
                    response.put("policyApplies", true);
                    response.put("message", "Error checking timing parameters, default to free.");
                }
            }
            return ResponseEntity.ok(response);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // 6. Custom Cancel endpoint that calculates and registers late cancellation fees
    @PutMapping("/{id}/cancel")
    @Transactional
    public ResponseEntity<?> cancelOrder(@PathVariable Long id, HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Login required.");
        }

        return orderRepository.findById(id).map(order -> {
            boolean isOwner = currentUser.getId().equals(order.getUserId());
            boolean isAdmin = "ADMIN".equalsIgnoreCase(currentUser.getRole());
            if (!isAdmin && !isOwner) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
            }

            // Only allow cancellation if not completed or already cancelled/no show
            String status = order.getOrderStatus();
            if ("Completed".equalsIgnoreCase(status) || 
                "Cancelled".equalsIgnoreCase(status) || 
                "Cancelled (Free)".equalsIgnoreCase(status) || 
                "Late Cancelled (10% Fee)".equalsIgnoreCase(status) || 
                "No Show (20% Penalty)".equalsIgnoreCase(status)) {
                return ResponseEntity.badRequest().body("This reservation cannot be cancelled in its current state.");
            }

            java.time.LocalDate arrDate;
            java.time.LocalTime arrTime;
            java.time.LocalDateTime arrivalDateTime;
            java.time.LocalDateTime now = java.time.LocalDateTime.now();

            try {
                arrDate = java.time.LocalDate.parse(order.getArrivalDate());
                arrTime = parseTime(order.getArrivalTime());
                arrivalDateTime = java.time.LocalDateTime.of(arrDate, arrTime);
            } catch (Exception e) {
                // If timings are unparseable, default to free cancel
                order.setOrderStatus("Cancelled (Free)");
                order.setReservationStatus("Cancelled (Free)");
                order.setCancellationFee(0.0);
                order.setCancellationTime(now.toString());
                Order saved = orderRepository.save(order);
                return ResponseEntity.ok(saved);
            }

            // Grace period check: 1 hour after arrival time
            if (now.isAfter(arrivalDateTime.plusHours(1))) {
                return ResponseEntity.badRequest().body("The 1-hour grace period has expired. This reservation is now a No-Show and cannot be cancelled.");
            }

            order.setCancellationTime(now.toString());

            User user = userRepository.findById(order.getUserId()).orElse(null);
            if (user != null) {
                // Refund wallet discount used on the order back to the user's wallet
                if (order.getWalletDiscountUsed() != null && order.getWalletDiscountUsed() > 0) {
                    user.setWalletBalance((user.getWalletBalance() != null ? user.getWalletBalance() : 0.0) + order.getWalletDiscountUsed());
                    
                    com.foodordering.model.WalletTransaction refundTx = new com.foodordering.model.WalletTransaction();
                    refundTx.setUserId(user.getId());
                    refundTx.setAmount(order.getWalletDiscountUsed());
                    refundTx.setType("CREDIT");
                    refundTx.setDescription("Refund wallet usage for Cancelled Order #" + order.getId());
                    refundTx.setTransactionTime(now);
                    walletTransactionRepository.save(refundTx);
                }

                if (!"Pay at Restaurant".equalsIgnoreCase(order.getPaymentType())) {
                    // Prepaid orders: free cancellation
                    order.setOrderStatus("Cancelled");
                    order.setReservationStatus("Cancelled (Free)");
                    order.setCancellationFee(0.0);
                } else {
                    // Pay at restaurant orders: No-Show & cancellation policies apply
                    if (now.isBefore(arrivalDateTime.minusHours(1))) {
                        // Free cancellation (at least 1 hour before arrival)
                        order.setOrderStatus("Cancelled (Free)");
                        order.setReservationStatus("Cancelled (Free)");
                        order.setCancellationFee(0.0);
                    } else {
                        // Late cancellation: 10% fee applies
                        double fee = order.getTotalAmount() * 0.10;
                        order.setOrderStatus("Late Cancelled (10% Fee)");
                        order.setReservationStatus("Late Cancelled");
                        order.setCancellationFee(fee);

                        user.setTotalPenalty(user.getTotalPenalty() + fee);
                        user.setWalletBalance((user.getWalletBalance() != null ? user.getWalletBalance() : 0.0) - fee);

                        // Log Wallet transaction
                        com.foodordering.model.WalletTransaction feeTx = new com.foodordering.model.WalletTransaction();
                        feeTx.setUserId(user.getId());
                        feeTx.setAmount(fee);
                        feeTx.setType("DEBIT");
                        feeTx.setDescription("Late Cancellation Fee - Order #" + order.getId());
                        feeTx.setTransactionTime(now);
                        walletTransactionRepository.save(feeTx);
                    }
                }
                userRepository.save(user);
            } else {
                // If user doesn't exist, just save order cancellation
                order.setOrderStatus("Cancelled (Free)");
                order.setReservationStatus("Cancelled (Free)");
                order.setCancellationFee(0.0);
            }

            Order saved = orderRepository.save(order);
            
            try {
                sendStatusNotificationEmail(saved, status, saved.getOrderStatus());
            } catch (Exception ex) {
                System.err.println("Failed to send cancellation notification email: " + ex.getMessage());
            }

            return ResponseEntity.ok(saved);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // 7. Waive late cancellation or no show penalty charges (Admin privilege)
    @PutMapping("/{id}/waive")
    @Transactional
    public ResponseEntity<?> waivePenalty(@PathVariable Long id, HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        if (currentUser == null || !"ADMIN".equalsIgnoreCase(currentUser.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Admin privileges required.");
        }

        return orderRepository.findById(id).map(order -> {
            if (Boolean.TRUE.equals(order.getPenaltyWaived())) {
                return ResponseEntity.badRequest().body("Penalties on this reservation are already waived.");
            }

            double activePenalty = 0.0;
            if (order.getCancellationFee() != null) {
                activePenalty += order.getCancellationFee();
            }
            if (order.getNoShowPenalty() != null) {
                activePenalty += order.getNoShowPenalty();
            }

            if (activePenalty <= 0.0) {
                return ResponseEntity.badRequest().body("No penalty charges found for this reservation.");
            }

            order.setPenaltyWaived(true);
            final double penaltyToWaive = activePenalty;

            // Deduct from user's penalty statement
            userRepository.findById(order.getUserId()).ifPresent(user -> {
                double newPenalty = Math.max(0.0, user.getTotalPenalty() - penaltyToWaive);
                user.setTotalPenalty(newPenalty);
                userRepository.save(user);
            });

            Order saved = orderRepository.save(order);
            return ResponseEntity.ok(saved);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // 8. Admin trigger to manually run the No-Show check
    @PostMapping("/run-no-show-check")
    @Transactional
    public ResponseEntity<?> triggerNoShowSweep(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        if (currentUser == null || !"ADMIN".equalsIgnoreCase(currentUser.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Admin privileges required.");
        }

        int count = performNoShowCheck();
        Map<String, Object> result = new HashMap<>();
        result.put("status", "SUCCESS");
        result.put("message", "No-show sweep completed successfully.");
        result.put("markedCount", count);
        return ResponseEntity.ok(result);
    }

    // Dynamic No-Show assessment logic
    public int performNoShowCheck() {
        int count = 0;
        List<Order> activeReservations = orderRepository.findAll().stream()
                .filter(o -> "Pay at Restaurant".equalsIgnoreCase(o.getPaymentType()))
                .filter(o -> "Pending".equalsIgnoreCase(o.getOrderStatus()) || 
                             "Accepted".equalsIgnoreCase(o.getOrderStatus()) || 
                             "Preparing".equalsIgnoreCase(o.getOrderStatus()) || 
                             o.getOrderStatus().toLowerCase().contains("ready"))
                .collect(Collectors.toList());

        LocalDateTime now = LocalDateTime.now();

        for (Order order : activeReservations) {
            try {
                LocalDate arrivalDate = LocalDate.parse(order.getArrivalDate());
                LocalTime arrivalTime = parseTime(order.getArrivalTime());
                LocalDateTime arrivalDateTime = LocalDateTime.of(arrivalDate, arrivalTime);

                // No show trigger: 1 hour past arrival time
                if (now.isAfter(arrivalDateTime.plusHours(1))) {
                    String oldStatus = order.getOrderStatus();
                    order.setOrderStatus("No Show (20% Penalty)");
                    order.setReservationStatus("No Show");
                    double penalty = order.getTotalAmount() * 0.20;
                    order.setNoShowPenalty(penalty);
                    orderRepository.save(order);

                    // Accumulate user penalty and deduct from Wallet
                    userRepository.findById(order.getUserId()).ifPresent(user -> {
                        user.setTotalPenalty(user.getTotalPenalty() + penalty);
                        user.setWalletBalance((user.getWalletBalance() != null ? user.getWalletBalance() : 0.0) - penalty);
                        userRepository.save(user);

                        // Log Wallet transaction
                        com.foodordering.model.WalletTransaction tx = new com.foodordering.model.WalletTransaction();
                        tx.setUserId(user.getId());
                        tx.setAmount(penalty);
                        tx.setType("DEBIT");
                        tx.setDescription("No-Show Penalty - Order #" + order.getId());
                        tx.setTransactionTime(LocalDateTime.now());
                        walletTransactionRepository.save(tx);

                        try {
                            sendStatusNotificationEmail(order, oldStatus, "No Show");
                        } catch (Exception ex) {
                            System.err.println("No-show email fail: " + ex.getMessage());
                        }
                    });
                    count++;
                }
            } catch (Exception e) {
                System.err.println("Error processing no-show check for order #" + order.getId() + ": " + e.getMessage());
            }
        }
        return count;
    }

    private LocalTime parseRestaurantTime(String timeStr) {
        if (timeStr == null) return LocalTime.of(23, 0);
        try {
            timeStr = timeStr.trim().toUpperCase();
            boolean pm = timeStr.endsWith("PM");
            boolean am = timeStr.endsWith("AM");
            String cleanTime = timeStr.replace("AM", "").replace("PM", "").trim();
            String[] parts = cleanTime.split(":");
            int hour = Integer.parseInt(parts[0]);
            int minute = parts.length > 1 ? Integer.parseInt(parts[1]) : 0;
            if (pm && hour < 12) {
                hour += 12;
            } else if (am && hour == 12) {
                hour = 0;
            }
            return LocalTime.of(hour, minute);
        } catch (Exception e) {
            return LocalTime.of(23, 0);
        }
    }

    // Scheduled Cron job to run automatic check every 1 minute
    @org.springframework.scheduling.annotation.Scheduled(cron = "0 * * * * *")
    public void scheduledNoShowCheck() {
        System.out.println(">>> Running automatic Scheduled No-Show Check...");
        int count = performNoShowCheck();
        if (count > 0) {
            System.out.println(">>> Automatically marked " + count + " reservations as 'No Show'.");
        }
    }

    // Smart Kitchen Scheduling automatic status progression runner
    @org.springframework.scheduling.annotation.Scheduled(fixedRate = 30000)
    @org.springframework.transaction.annotation.Transactional
    public void updateKitchenSchedules() {
        java.time.LocalDateTime now = java.time.LocalDateTime.now();

        // 1. Pending -> Accepted (exactly 2 minutes after orderTime)
        List<Order> pendingOrders = orderRepository.findByOrderStatus("Pending");
        for (Order order : pendingOrders) {
            if (order.getAcceptedTime() != null && now.isAfter(order.getAcceptedTime())) {
                String oldStatus = order.getOrderStatus();
                order.setOrderStatus("Accepted");
                order.setReservationStatus("Confirmed");
                Order saved = orderRepository.save(order);
                try {
                    sendStatusNotificationEmail(saved, oldStatus, "Accepted");
                } catch (Exception e) {
                    System.err.println("Scheduler failed to send acceptance notification: " + e.getMessage());
                }
            }
        }

        // 2. Accepted -> Preparing (at preparationStartTime)
        List<Order> acceptedOrders = orderRepository.findByOrderStatus("Accepted");
        for (Order order : acceptedOrders) {
            if (order.getPreparationStartTime() != null && now.isAfter(order.getPreparationStartTime())) {
                String oldStatus = order.getOrderStatus();
                order.setOrderStatus("Preparing");
                Order saved = orderRepository.save(order);
                try {
                    sendStatusNotificationEmail(saved, oldStatus, "Preparing");
                    notifyRestaurantStaff(saved, "Start Preparing");
                } catch (Exception e) {
                    System.err.println("Scheduler failed to send preparing notification: " + e.getMessage());
                }
            }
        }

        // 3. Preparing -> Ready to Serve (at readyTime / arrivalTime)
        List<Order> preparingOrders = orderRepository.findByOrderStatus("Preparing");
        for (Order order : preparingOrders) {
            if (order.getReadyTime() != null && now.isAfter(order.getReadyTime())) {
                String oldStatus = order.getOrderStatus();
                order.setOrderStatus("Ready to Serve");
                Order saved = orderRepository.save(order);
                try {
                    sendStatusNotificationEmail(saved, oldStatus, "Ready");
                    notifyRestaurantStaff(saved, "Ready to Serve");
                } catch (Exception e) {
                    System.err.println("Scheduler failed to send ready-to-serve notification: " + e.getMessage());
                }
            }
        }
    }

    private void notifyRestaurantStaff(Order order, String type) {
        try {
            Restaurant restaurant = restaurantRepository.findById(order.getRestaurantId()).orElse(null);
            if (restaurant == null || restaurant.getEmail() == null || restaurant.getEmail().trim().isEmpty()) {
                return;
            }
            
            String subject = "";
            String body = "";
            
            if ("Start Preparing".equals(type)) {
                subject = "KITCHEN NOTICE: Start Preparing Order #" + order.getId();
                body = "Dear Kitchen Staff,\n\n"
                     + "It is time to start preparing Order #" + order.getId() + ".\n"
                     + "Customer arrival time is: " + order.getArrivalTime() + ".\n"
                     + "Ordered Items: " + order.getItemsText() + "\n"
                     + "Total Preparation Time: " + order.getTotalPreparationTime() + " minutes.\n\n"
                     + "Please ensure food is freshly prepared and ready exactly on time.";
            } else if ("Ready to Serve".equals(type)) {
                subject = "KITCHEN NOTICE: Order #" + order.getId() + " is Ready to Serve";
                body = "Dear Restaurant Staff,\n\n"
                     + "Order #" + order.getId() + " is now READY TO SERVE!\n"
                     + "Please serve the fresh items immediately to the customer upon arrival.\n"
                     + "Assigned Table: " + (order.getTableNumber() != null ? order.getTableNumber() : "Standard Table") + "\n"
                     + "Items: " + order.getItemsText() + "\n\n"
                     + "Thank you!";
            }
            
            if (!subject.isEmpty()) {
                emailService.sendEmail(restaurant.getEmail(), subject, body);
            }
        } catch (Exception e) {
            System.err.println("Error notifying restaurant staff: " + e.getMessage());
        }
    }

    // Email notification helper
    private void sendStatusNotificationEmail(Order order, String oldStatus, String newStatus) {
        userRepository.findById(order.getUserId()).ifPresent(user -> {
            Restaurant restaurant = restaurantRepository.findById(order.getRestaurantId()).orElse(null);
            String restaurantName = (restaurant != null) ? restaurant.getRestaurantName() : "Partner Restaurant";
            
            String subject = "";
            String body = "";

            if (newStatus.contains("Accepted")) {
                subject = "Your Dine-In Reservation & Pre-Order is Accepted! (#" + order.getId() + ")";
                body = "Hello " + user.getName() + ",\n\n"
                        + "Great news! Your Dine-In reservation slot at " + restaurantName + " has been accepted.\n\n"
                        + "Reservation Details:\n"
                        + "- Reservation ID: #" + order.getId() + "\n"
                        + "- Date: " + order.getArrivalDate() + "\n"
                        + "- Time: " + order.getArrivalTime() + "\n"
                        + "- Guests: " + order.getGuestsCount() + " guests\n"
                        + "- Table: " + (order.getTableNumber() != null ? order.getTableNumber() : "Standard Table") + "\n"
                        + "- Pre-Ordered Menu: " + order.getItemsText() + "\n\n"
                        + "We look forward to serving you. Please arrive on time!";
                emailService.sendEmail(user.getEmail(), subject, body);

                // Also send Reservation Confirmed email!
                subject = "Reservation Confirmed at " + restaurantName + " (#" + order.getId() + ")";
                body = "Hello " + user.getName() + ",\n\n"
                        + "Your table reservation is officially CONFIRMED at " + restaurantName + " for "
                        + order.getArrivalDate() + " at " + order.getArrivalTime() + ".\n\n"
                        + "If you need to cancel, you can do so for free up to 30 minutes before your scheduled arrival time.\n\n"
                        + "Thank you!";
                emailService.sendEmail(user.getEmail(), subject, body);

            } else if (newStatus.contains("Preparing")) {
                subject = "Chef has started preparing your pre-order! (#" + order.getId() + ")";
                body = "Hello " + user.getName() + ",\n\n"
                        + "Your pre-ordered food is now PREPARING in the kitchen at " + restaurantName + ".\n\n"
                        + "It will be fresh and ready by the time you arrive at " + order.getArrivalTime() + "!\n\n"
                        + "See you soon!";
                emailService.sendEmail(user.getEmail(), subject, body);

            } else if (newStatus.contains("Ready")) {
                subject = "Your pre-ordered food is Ready! (#" + order.getId() + ")";
                body = "Hello " + user.getName() + ",\n\n"
                        + "Your pre-ordered food is READY and waiting for you at " + restaurantName + ".\n\n"
                        + "Please head over to your assigned table: " + (order.getTableNumber() != null ? order.getTableNumber() : "Standard Table") + ".\n\n"
                        + "Bon Appetit!";
                emailService.sendEmail(user.getEmail(), subject, body);

            } else if (newStatus.contains("Completed")) {
                if ("Pay at Restaurant".equalsIgnoreCase(order.getPaymentType())) {
                    subject = "Payment Successful & Reservation Completed (#" + order.getId() + ")";
                    body = "Hello " + user.getName() + ",\n\n"
                            + "Thank you for dining with us! Your payment of ₹" + order.getTotalAmount().intValue()
                            + " has been successfully processed at the restaurant.\n\n"
                            + "We hope you enjoyed your meal and experience at " + restaurantName + ". Please visit us again soon!";
                    emailService.sendEmail(user.getEmail(), subject, body);
                } else {
                    subject = "Reservation Completed (#" + order.getId() + ")";
                    body = "Hello " + user.getName() + ",\n\n"
                            + "Your reservation #" + order.getId() + " at " + restaurantName + " has been completed.\n\n"
                            + "Thank you for dining with us! We hope to see you again soon.";
                    emailService.sendEmail(user.getEmail(), subject, body);
                }

            } else if (newStatus.toLowerCase().contains("cancel")) {
                subject = "Reservation Cancelled (#" + order.getId() + ")";
                String feeMsg = (order.getCancellationFee() > 0) ? "A late cancellation fee of 10% (₹" + order.getCancellationFee().intValue() + ") has been applied to your profile." : "No cancellation charges were applied.";
                body = "Hello " + user.getName() + ",\n\n"
                        + "Your reservation #" + order.getId() + " at " + restaurantName + " has been cancelled.\n\n"
                        + "Cancellation Policy Details:\n"
                        + "- " + feeMsg + "\n\n"
                        + "We hope to serve you in the future.";
                emailService.sendEmail(user.getEmail(), subject, body);

            } else if (newStatus.toLowerCase().contains("no show")) {
                subject = "No-Show Penalty Applied (#" + order.getId() + ")";
                body = "Hello " + user.getName() + ",\n\n"
                        + "You did not arrive for your scheduled reservation #" + order.getId() + " at " + restaurantName + ".\n\n"
                        + "As per our policy for \"Pay at Restaurant\" bookings, a 20% No-Show penalty of ₹" 
                        + order.getNoShowPenalty().intValue() + " has been applied to your account balance.\n\n"
                        + "Outstanding penalties must be cleared. Please contact support or clear it in your profile if you have questions.\n\n"
                        + "Thank you.";
                emailService.sendEmail(user.getEmail(), subject, body);
            }
        });
    }

    // Reports Aggregator (Admin)
    @GetMapping("/reports")
    public ResponseEntity<?> getReports(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        if (currentUser == null || !"ADMIN".equalsIgnoreCase(currentUser.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Admin privilege required.");
        }

        List<Order> allOrders = orderRepository.findAll();
        Map<String, Object> reports = new HashMap<>();

        // Daily Orders
        Map<String, Long> dailyOrders = allOrders.stream()
                .filter(o -> o.getArrivalDate() != null)
                .collect(Collectors.groupingBy(Order::getArrivalDate, Collectors.counting()));
        reports.put("dailyOrders", dailyOrders);

        // Weekly Orders
        Map<String, Long> weeklyOrders = new HashMap<>();
        for (Order o : allOrders) {
            String date = o.getArrivalDate();
            if (date != null && date.contains("-")) {
                try {
                    LocalDate localDate = LocalDate.parse(date);
                    int week = localDate.get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR);
                    String key = localDate.getYear() + "-W" + week;
                    weeklyOrders.put(key, weeklyOrders.getOrDefault(key, 0L) + 1);
                } catch (Exception e) {
                    weeklyOrders.put("Unknown", weeklyOrders.getOrDefault("Unknown", 0L) + 1);
                }
            }
        }
        reports.put("weeklyOrders", weeklyOrders);

        // Monthly Revenue
        Map<String, Double> monthlyRevenue = allOrders.stream()
                .filter(o -> o.getArrivalDate() != null && o.getArrivalDate().length() >= 7)
                .filter(o -> !o.getOrderStatus().toLowerCase().contains("cancel"))
                .collect(Collectors.groupingBy(
                        o -> o.getArrivalDate().substring(0, 7),
                        Collectors.summingDouble(Order::getTotalAmount)
                ));
        reports.put("monthlyRevenue", monthlyRevenue);

        // Popular Items
        Map<String, Integer> popularItems = new HashMap<>();
        for (Order o : allOrders) {
            String txt = o.getItemsText();
            if (txt != null) {
                String[] parts = txt.split(",");
                for (String part : parts) {
                    part = part.trim();
                    if (part.isEmpty()) continue;
                    try {
                        int index = part.lastIndexOf("(x");
                        if (index != -1) {
                            String itemName = part.substring(0, index).trim();
                            int qty = Integer.parseInt(part.substring(index + 2, part.length() - 1).trim());
                            popularItems.put(itemName, popularItems.getOrDefault(itemName, 0) + qty);
                        } else {
                            popularItems.put(part, popularItems.getOrDefault(part, 0) + 1);
                        }
                    } catch (Exception e) {
                        popularItems.put(part, popularItems.getOrDefault(part, 0) + 1);
                    }
                }
            }
        }
        reports.put("popularItems", popularItems);

        // Popular Restaurants
        Map<String, Long> popularRestaurants = new HashMap<>();
        for (Order o : allOrders) {
            try {
                Restaurant rest = restaurantRepository.findById(o.getRestaurantId()).orElse(null);
                String name = (rest != null) ? rest.getRestaurantName() : "Restaurant #" + o.getRestaurantId();
                popularRestaurants.put(name, popularRestaurants.getOrDefault(name, 0L) + 1);
            } catch (Exception e) {}
        }
        reports.put("popularRestaurants", popularRestaurants);

        // Peak Booking Times
        Map<String, Long> peakTimes = allOrders.stream()
                .filter(o -> o.getArrivalTime() != null)
                .collect(Collectors.groupingBy(Order::getArrivalTime, Collectors.counting()));
        reports.put("peakTimes", peakTimes);

        // No Show Statistics
        long totalNoShows = allOrders.stream().filter(o -> o.getOrderStatus().toLowerCase().contains("no show")).count();
        long totalCompleted = allOrders.stream().filter(o -> "Completed".equalsIgnoreCase(o.getOrderStatus())).count();
        long totalCancelled = allOrders.stream().filter(o -> o.getOrderStatus().toLowerCase().contains("cancel")).count();
        reports.put("noShowsCount", totalNoShows);
        reports.put("completedCount", totalCompleted);
        reports.put("cancelledCount", totalCancelled);

        return ResponseEntity.ok(reports);
    }

    // Arrive customer (Admin)
    @PutMapping("/{id}/arrive")
    public ResponseEntity<?> markArrived(@PathVariable Long id, HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        if (currentUser == null || !"ADMIN".equalsIgnoreCase(currentUser.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Admin privilege required.");
        }
        return orderRepository.findById(id).map(order -> {
            String oldStatus = order.getOrderStatus();
            order.setOrderStatus("Completed");
            order.setReservationStatus("Arrived");
            Order saved = orderRepository.save(order);

            try {
                sendStatusNotificationEmail(saved, oldStatus, "Completed");
            } catch (Exception e) {
                System.err.println("Failed to send status update email: " + e.getMessage());
            }

            return ResponseEntity.ok(saved);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Allocate table (Admin)
    @PutMapping("/{id}/allocate-table")
    public ResponseEntity<?> allocateTable(
            @PathVariable Long id, 
            @RequestBody Map<String, String> body, 
            HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        if (currentUser == null || !"ADMIN".equalsIgnoreCase(currentUser.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Admin privilege required.");
        }

        String tableNumber = body.get("tableNumber");
        String tableType = body.get("tableType");
        
        return orderRepository.findById(id).map(order -> {
            order.setTableNumber(tableNumber);
            if (tableType != null) {
                order.setTableType(tableType);
            }
            Order saved = orderRepository.save(order);
            return ResponseEntity.ok(saved);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Reject reservation (Admin)
    @PutMapping("/{id}/reject")
    public ResponseEntity<?> rejectOrder(@PathVariable Long id, HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        if (currentUser == null || !"ADMIN".equalsIgnoreCase(currentUser.getRole())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Admin privilege required.");
        }
        return orderRepository.findById(id).map(order -> {
            String oldStatus = order.getOrderStatus();
            order.setOrderStatus("Cancelled");
            order.setReservationStatus("Rejected");
            Order saved = orderRepository.save(order);

            userRepository.findById(order.getUserId()).ifPresent(user -> {
                Restaurant restaurant = restaurantRepository.findById(order.getRestaurantId()).orElse(null);
                String restName = (restaurant != null) ? restaurant.getRestaurantName() : "Partner Restaurant";
                String subject = "Reservation Rejected (#" + order.getId() + ")";
                String body = "Hello " + user.getName() + ",\n\n"
                        + "We regret to inform you that your Dine-In reservation and pre-order #" + order.getId()
                        + " at " + restName + " has been rejected by the restaurant.\n\n"
                        + "If you made any pre-payment, the amount will be refunded to your account within 3-5 business days.\n\n"
                        + "Thank you.";
                emailService.sendEmail(user.getEmail(), subject, body);
            });

            return ResponseEntity.ok(saved);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    private static java.time.LocalTime parseTime(String timeStr) {
        if (timeStr == null || timeStr.trim().isEmpty()) {
            return null;
        }
        timeStr = timeStr.trim().toUpperCase();
        try {
            if (timeStr.contains("AM") || timeStr.contains("PM")) {
                java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("h:mm a", java.util.Locale.ENGLISH);
                if (timeStr.indexOf(":") == 1) {
                    timeStr = "0" + timeStr;
                }
                return java.time.LocalTime.parse(timeStr, java.time.format.DateTimeFormatter.ofPattern("hh:mm a", java.util.Locale.ENGLISH));
            } else {
                if (timeStr.length() == 4 && timeStr.indexOf(":") == 1) {
                    timeStr = "0" + timeStr;
                }
                return java.time.LocalTime.parse(timeStr);
            }
        } catch (Exception e) {
            System.err.println("Error parsing time string: " + timeStr + " - " + e.getMessage());
            return null;
        }
    }

    // --- Coupon Validation Endpoint ---
    @PostMapping("/apply-coupon")
    public ResponseEntity<?> applyCoupon(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Login required.");
        }

        String code = (String) body.get("couponCode");
        Object cartTotalObj = body.get("cartTotal");
        double cartTotal = 0.0;
        if (cartTotalObj instanceof Number) {
            cartTotal = ((Number) cartTotalObj).doubleValue();
        }

        if (code == null || code.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Coupon code is required.");
        }
        code = code.trim();

        Map<String, Object> result = new HashMap<>();

        if ("NEWUSER25".equalsIgnoreCase(code)) {
            if (currentUser.getFirstOrderCompleted() == null || !currentUser.getFirstOrderCompleted()) {
                double discount = cartTotal * 0.25;
                if (discount > 1000.0) discount = 1000.0;
                result.put("valid", true);
                result.put("couponCode", code);
                result.put("discount", discount);
                result.put("message", "25% off your first order! ₹" + String.format("%.2f", discount) + " savings applied.");
            } else {
                result.put("valid", false);
                result.put("message", "NEWUSER25 coupon is only valid for first-time orders.");
            }
            return ResponseEntity.ok(result);
        }

        Optional<com.foodordering.model.Coupon> optC = couponRepository.findByCode(code);
        if (optC.isEmpty()) {
            result.put("valid", false);
            result.put("message", "Coupon code not found.");
            return ResponseEntity.ok(result);
        }

        com.foodordering.model.Coupon c = optC.get();
        if (!"ACTIVE".equalsIgnoreCase(c.getStatus())) {
            result.put("valid", false);
            result.put("message", "This coupon is no longer active.");
            return ResponseEntity.ok(result);
        }
        if (c.getExpiryDate().isBefore(java.time.LocalDate.now())) {
            result.put("valid", false);
            result.put("message", "This coupon has expired.");
            return ResponseEntity.ok(result);
        }
        if (cartTotal < c.getMinOrderAmount()) {
            result.put("valid", false);
            result.put("message", "Minimum order amount of ₹" + c.getMinOrderAmount() + " required for this coupon.");
            return ResponseEntity.ok(result);
        }

        Optional<com.foodordering.model.UserCoupon> optUC = userCouponRepository.findByUserIdAndCouponCode(currentUser.getId(), code);
        if (optUC.isPresent() && Boolean.TRUE.equals(optUC.get().getUsed())) {
            result.put("valid", false);
            result.put("message", "You have already used this coupon.");
            return ResponseEntity.ok(result);
        }

        double discount = cartTotal * (c.getDiscountPercentage() / 100.0);
        if (c.getMaxDiscount() != null && discount > c.getMaxDiscount()) {
            discount = c.getMaxDiscount();
        }

        result.put("valid", true);
        result.put("couponCode", code);
        result.put("discount", discount);
        result.put("discountPercentage", c.getDiscountPercentage());
        result.put("maxDiscount", c.getMaxDiscount());
        result.put("message", c.getDiscountPercentage() + "% off! You save ₹" + String.format("%.2f", discount));
        return ResponseEntity.ok(result);
    }
}

