package com.foodordering.controller;

import com.foodordering.model.FoodItem;
import com.foodordering.model.User;
import com.foodordering.repository.FoodItemRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/fooditems")
public class FoodItemRestController {

    @Autowired
    private FoodItemRepository foodItemRepository;

    // 1. Get food items (with filters for Restaurant details and Admin dashboard)
    @GetMapping
    public ResponseEntity<List<FoodItem>> getFoodItems(
            @RequestParam(value = "restaurantId", required = false) Long restaurantId,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "search", required = false) String search) {

        String cleanCategory = (category != null && !category.trim().isEmpty()) ? category.trim() : null;
        String cleanSearch = (search != null && !search.trim().isEmpty()) ? search.trim() : null;

        List<FoodItem> list = foodItemRepository.searchFoodItems(restaurantId, cleanCategory, cleanSearch);
        return ResponseEntity.ok(list);
    }

    // 2. Get single food item by ID
    @GetMapping("/{id}")
    public ResponseEntity<FoodItem> getFoodItemById(@PathVariable Long id) {
        return foodItemRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // 3. Create food item (Admin)
    @PostMapping
    public ResponseEntity<?> createFoodItem(@RequestBody FoodItem foodItem, HttpServletRequest request) {
        if (!isAdmin(request)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Admin privilege required.");
        }
        FoodItem saved = foodItemRepository.save(foodItem);
        return ResponseEntity.ok(saved);
    }

    // 4. Update food item (Admin)
    @PutMapping("/{id}")
    public ResponseEntity<?> updateFoodItem(
            @PathVariable Long id,
            @RequestBody FoodItem updated,
            HttpServletRequest request) {

        if (!isAdmin(request)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Admin privilege required.");
        }

        return foodItemRepository.findById(id).map(f -> {
            f.setFoodName(updated.getFoodName());
            f.setDescription(updated.getDescription());
            f.setCategory(updated.getCategory());
            f.setPrice(updated.getPrice());
            f.setQuantity(updated.getQuantity());
            f.setAvailable(updated.isAvailable());
            f.setPreparationTime(updated.getPreparationTime());
            f.setImageUrl(updated.getImageUrl());
            f.setRestaurantId(updated.getRestaurantId());
            return ResponseEntity.ok(foodItemRepository.save(f));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // 5. Delete food item (Admin)
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteFoodItem(@PathVariable Long id, HttpServletRequest request) {
        if (!isAdmin(request)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Admin privilege required.");
        }
        return foodItemRepository.findById(id).map(f -> {
            foodItemRepository.delete(f);
            return ResponseEntity.ok().build();
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    private boolean isAdmin(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        return currentUser != null && "ADMIN".equalsIgnoreCase(currentUser.getRole());
    }
}
