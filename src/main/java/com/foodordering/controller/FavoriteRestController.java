package com.foodordering.controller;

import com.foodordering.model.FavoriteRestaurant;
import com.foodordering.model.Restaurant;
import com.foodordering.model.User;
import com.foodordering.repository.FavoriteRestaurantRepository;
import com.foodordering.repository.RestaurantRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/restaurants")
public class FavoriteRestController {

    @Autowired
    private FavoriteRestaurantRepository favoriteRestaurantRepository;

    @Autowired
    private RestaurantRepository restaurantRepository;

    // 1. Get favorite restaurants of a user
    @GetMapping("/favorites/user/{userId}")
    public ResponseEntity<?> getUserFavorites(@PathVariable Long userId, HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Login required.");
        }
        if (!currentUser.getId().equals(userId) && !"ADMIN".equalsIgnoreCase(currentUser.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
        }

        List<FavoriteRestaurant> favList = favoriteRestaurantRepository.findByUserId(userId);
        List<Restaurant> restaurants = favList.stream()
                .map(fav -> restaurantRepository.findById(fav.getRestaurantId()).orElse(null))
                .filter(r -> r != null)
                .collect(Collectors.toList());

        return ResponseEntity.ok(restaurants);
    }

    // 2. Toggle favorite status for a restaurant
    @PostMapping("/{restaurantId}/favorite")
    public ResponseEntity<?> toggleFavorite(@PathVariable Long restaurantId, HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Login required to favorite restaurants.");
        }

        Optional<FavoriteRestaurant> existing = favoriteRestaurantRepository
                .findByUserIdAndRestaurantId(currentUser.getId(), restaurantId);

        if (existing.isPresent()) {
            favoriteRestaurantRepository.delete(existing.get());
            return ResponseEntity.ok(Map.of("isFavorite", false));
        } else {
            FavoriteRestaurant newFav = new FavoriteRestaurant(null, currentUser.getId(), restaurantId);
            favoriteRestaurantRepository.save(newFav);
            return ResponseEntity.ok(Map.of("isFavorite", true));
        }
    }

    // 3. Check if restaurant is user's favorite
    @GetMapping("/{restaurantId}/is-favorite/user/{userId}")
    public ResponseEntity<?> checkIsFavorite(@PathVariable Long restaurantId, @PathVariable Long userId) {
        boolean isFav = favoriteRestaurantRepository.findByUserIdAndRestaurantId(userId, restaurantId).isPresent();
        return ResponseEntity.ok(Map.of("isFavorite", isFav));
    }
}
