package com.foodordering.repository;

import com.foodordering.model.FavoriteRestaurant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FavoriteRestaurantRepository extends JpaRepository<FavoriteRestaurant, Long> {
    List<FavoriteRestaurant> findByUserId(Long userId);
    Optional<FavoriteRestaurant> findByUserIdAndRestaurantId(Long userId, Long restaurantId);
}
