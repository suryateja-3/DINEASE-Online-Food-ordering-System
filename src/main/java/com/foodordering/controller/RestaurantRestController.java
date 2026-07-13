package com.foodordering.controller;

import com.foodordering.model.Restaurant;
import com.foodordering.model.User;
import com.foodordering.repository.RestaurantRepository;
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
            return ResponseEntity.ok(restaurantRepository.save(r));
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
