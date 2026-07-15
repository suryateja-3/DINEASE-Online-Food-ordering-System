package com.foodordering.controller;

import com.foodordering.model.CartItem;
import com.foodordering.repository.CartItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/carts")
public class CartRestController {

    @Autowired
    private CartItemRepository cartItemRepository;

    // 1. Get user cart items
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<CartItem>> getUserCart(@PathVariable Long userId) {
        return ResponseEntity.ok(cartItemRepository.findByUserId(userId));
    }

    // 2. Add item to cart
    @PostMapping
    @Transactional
    public ResponseEntity<?> addToCart(@RequestBody CartItem item) {
        if (item.getUserId() == null || item.getFoodItemId() == null || item.getRestaurantId() == null) {
            return ResponseEntity.badRequest().body("UserId, FoodItemId, and RestaurantId are required.");
        }

        List<CartItem> currentCart = cartItemRepository.findByUserId(item.getUserId());
        
        // Validation: If new item is from a different restaurant, clear previous cart items
        if (!currentCart.isEmpty()) {
            Long existingRestId = currentCart.get(0).getRestaurantId();
            if (!existingRestId.equals(item.getRestaurantId())) {
                cartItemRepository.deleteByUserId(item.getUserId());
                currentCart.clear();
            }
        }

        // Aggregate quantity if item is already in cart with same customizations
        List<CartItem> existingItems = cartItemRepository.findByUserId(item.getUserId());
        Optional<CartItem> existingItemOpt = existingItems.stream()
                .filter(i -> i.getFoodItemId().equals(item.getFoodItemId()))
                .filter(i -> {
                    String c1 = i.getCustomizations() != null ? i.getCustomizations().trim() : "";
                    String c2 = item.getCustomizations() != null ? item.getCustomizations().trim() : "";
                    return c1.equalsIgnoreCase(c2);
                })
                .findFirst();

        if (existingItemOpt.isPresent()) {
            CartItem existing = existingItemOpt.get();
            int newQty = existing.getQuantity() + item.getQuantity();
            existing.setQuantity(newQty);
            existing.setTotalPrice(existing.getPrice() * newQty);
            return ResponseEntity.ok(cartItemRepository.save(existing));
        }

        // Otherwise, add new item
        item.setTotalPrice(item.getPrice() * item.getQuantity());
        CartItem saved = cartItemRepository.save(item);
        return ResponseEntity.ok(saved);
    }

    // 3. Update quantity of a cart item
    @PutMapping("/{id}")
    public ResponseEntity<?> updateCartQuantity(@PathVariable Long id, @RequestBody Map<String, Integer> body) {
        Integer quantity = body.get("quantity");
        if (quantity == null || quantity <= 0) {
            return ResponseEntity.badRequest().body("Valid quantity is required.");
        }

        return cartItemRepository.findById(id).map(item -> {
            item.setQuantity(quantity);
            item.setTotalPrice(item.getPrice() * quantity);
            CartItem saved = cartItemRepository.save(item);
            return ResponseEntity.ok(saved);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // 4. Delete single item from cart
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCartItem(@PathVariable Long id) {
        return cartItemRepository.findById(id).map(item -> {
            cartItemRepository.delete(item);
            return ResponseEntity.ok().build();
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // 5. Clear cart (Delete all items for a user)
    @DeleteMapping("/user/{userId}")
    @Transactional
    public ResponseEntity<?> clearCart(@PathVariable Long userId) {
        cartItemRepository.deleteByUserId(userId);
        return ResponseEntity.ok().build();
    }
}
