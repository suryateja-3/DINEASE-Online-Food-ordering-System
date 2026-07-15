package com.foodordering.controller;

import com.foodordering.model.Restaurant;
import com.foodordering.model.Order;
import com.foodordering.model.User;
import com.foodordering.repository.RestaurantRepository;
import com.foodordering.repository.OrderRepository;
import com.foodordering.repository.UserRepository;
import com.foodordering.service.EmailService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/restaurants")
public class RestaurantRestController {

    @Autowired
    private RestaurantRepository restaurantRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    // 1. Get All or Filtered Restaurants
    @GetMapping
    public ResponseEntity<List<Restaurant>> getRestaurants(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "cuisine", required = false) String cuisine) {
        
        String cleanSearch = (search != null && !search.trim().isEmpty()) ? search.trim() : null;
        String cleanCuisine = (cuisine != null && !cuisine.trim().isEmpty()) ? cuisine.trim() : null;

        List<Restaurant> list = restaurantRepository.searchRestaurants(cleanSearch, cleanCuisine);
        return ResponseEntity.ok(list);
    }

    // 2. Get Restaurant by ID
    @GetMapping("/{id}")
    public ResponseEntity<Restaurant> getRestaurantById(@PathVariable Long id) {
        return restaurantRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // 3. Create Restaurant (Admin)
    @PostMapping
    public ResponseEntity<?> createRestaurant(@RequestBody Restaurant restaurant, HttpServletRequest request) {
        if (!isAdmin(request)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Admin privilege required.");
        }
        Restaurant saved = restaurantRepository.save(restaurant);
        return ResponseEntity.ok(saved);
    }

    // 4. Update Restaurant (Admin)
    @PutMapping("/{id}")
    public ResponseEntity<?> updateRestaurant(
            @PathVariable Long id, 
            @RequestBody Restaurant updated, 
            HttpServletRequest request) {
        
        if (!isAdmin(request)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Admin privilege required.");
        }

        return restaurantRepository.findById(id).map(r -> {
            boolean timingChanged = !r.getOpeningTime().equalsIgnoreCase(updated.getOpeningTime()) 
                                 || !r.getClosingTime().equalsIgnoreCase(updated.getClosingTime());

            r.setRestaurantName(updated.getRestaurantName());
            r.setOwnerName(updated.getOwnerName());
            r.setEmail(updated.getEmail());
            r.setPhone(updated.getPhone());
            r.setAddress(updated.getAddress());
            r.setCuisine(updated.getCuisine());
            r.setOpeningTime(updated.getOpeningTime());
            r.setClosingTime(updated.getClosingTime());
            r.setRating(updated.getRating());
            r.setImageUrl(updated.getImageUrl());
            
            if (updated.getDescription() != null) {
                r.setDescription(updated.getDescription());
            }
            if (updated.getIsOpen() != null) {
                r.setIsOpen(updated.getIsOpen());
            }

            Restaurant saved = restaurantRepository.save(r);

            if (timingChanged) {
                try {
                    List<Order> activeOrders = orderRepository.findByRestaurantId(id);
                    for (Order order : activeOrders) {
                        if (java.util.Arrays.asList("Pending", "Accepted", "Preparing", "Ready").contains(order.getOrderStatus())) {
                            userRepository.findById(order.getUserId()).ifPresent(user -> {
                                String emailSubject = "Important timing updates for your Dine-In reservation at " + saved.getRestaurantName();
                                String emailBody = "Hello " + user.getName() + ",\n\n"
                                        + "Please be informed that the operating hours for " + saved.getRestaurantName() 
                                        + " have been changed by the administration.\n\n"
                                        + "New Opening Time: " + saved.getOpeningTime() + "\n"
                                        + "New Closing Time: " + saved.getClosingTime() + "\n\n"
                                        + "Your reservation #" + order.getId() + " is scheduled for " 
                                        + order.getArrivalDate() + " at " + order.getArrivalTime() + ".\n"
                                        + "Kindly review your reservation details. If you need to make changes, please visit your dashboard.\n\n"
                                        + "Thank you for choosing DineEase!";
                                emailService.sendEmail(user.getEmail(), emailSubject, emailBody);
                            });
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Failed to send timing update emails: " + e.getMessage());
                }
            }

            return ResponseEntity.ok(saved);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // 5. Delete Restaurant (Admin)
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteRestaurant(@PathVariable Long id, HttpServletRequest request) {
        if (!isAdmin(request)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Admin privilege required.");
        }
        return restaurantRepository.findById(id).map(r -> {
            restaurantRepository.delete(r);
            return ResponseEntity.ok().build();
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    private boolean isAdmin(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        return currentUser != null && "ADMIN".equalsIgnoreCase(currentUser.getRole());
    }
}
