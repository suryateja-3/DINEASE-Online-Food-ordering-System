package com.foodordering.controller;

import com.foodordering.model.Review;
import com.foodordering.model.Restaurant;
import com.foodordering.model.User;
import com.foodordering.repository.ReviewRepository;
import com.foodordering.repository.RestaurantRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/restaurants/{restaurantId}/reviews")
public class ReviewRestController {

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private RestaurantRepository restaurantRepository;

    // 1. Get all reviews for a restaurant
    @GetMapping
    public ResponseEntity<List<Review>> getReviews(@PathVariable Long restaurantId) {
        return ResponseEntity.ok(reviewRepository.findByRestaurantId(restaurantId));
    }

    // 2. Submit a review for a restaurant
    @PostMapping
    public ResponseEntity<?> addReview(
            @PathVariable Long restaurantId,
            @RequestBody Review review,
            HttpServletRequest request) {
        
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Login required to submit reviews.");
        }

        if (review.getRating() == null || review.getRating() < 1 || review.getRating() > 5) {
            return ResponseEntity.badRequest().body("Rating must be between 1 and 5 stars.");
        }

        review.setRestaurantId(restaurantId);
        review.setUserId(currentUser.getId());
        review.setUserName(currentUser.getName());
        review.setCreatedAt(LocalDateTime.now().toString());

        Review savedReview = reviewRepository.save(review);

        // Recalculate average rating of the restaurant
        List<Review> allReviews = reviewRepository.findByRestaurantId(restaurantId);
        double sum = 0.0;
        for (Review r : allReviews) {
            sum += r.getRating();
        }
        double averageRating = allReviews.isEmpty() ? 0.0 : sum / allReviews.size();
        averageRating = Math.round(averageRating * 10.0) / 10.0; // round to 1 decimal place

        final double finalRating = averageRating;
        restaurantRepository.findById(restaurantId).ifPresent(rest -> {
            rest.setRating(finalRating);
            restaurantRepository.save(rest);
        });

        return ResponseEntity.ok(savedReview);
    }
}
