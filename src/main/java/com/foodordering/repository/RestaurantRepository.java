package com.foodordering.repository;

import com.foodordering.model.Restaurant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RestaurantRepository extends JpaRepository<Restaurant, Long> {
    @Query("SELECT r FROM Restaurant r WHERE " +
           "(:search IS NULL OR LOWER(r.restaurantName) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(r.cuisine) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:cuisine IS NULL OR LOWER(r.cuisine) = LOWER(:cuisine))")
    List<Restaurant> searchRestaurants(@Param("search") String search, @Param("cuisine") String cuisine);
}
