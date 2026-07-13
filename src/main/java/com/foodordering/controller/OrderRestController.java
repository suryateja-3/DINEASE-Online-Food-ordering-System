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

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/orders")
public class OrderRestController {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private FoodItemRepository foodItemRepository;

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

            // Format: Hamburger (x2), French Fries (x1)
            itemsTextBuilder.append(cartItem.getFoodName()).append(" (x").append(cartItem.getQuantity()).append(")");
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
        order.setEstimatedPreparationTime(maxPrepTime > 0 ? maxPrepTime + 5 : 15); // max preparation time + 5 mins buffer

        Order savedOrder = orderRepository.save(order);

        // Clear cart
        cartItemRepository.deleteByUserId(userId);

        return ResponseEntity.ok(savedOrder);
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

            order.setOrderStatus(newStatus);
            Order saved = orderRepository.save(order);
            return ResponseEntity.ok(saved);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}
