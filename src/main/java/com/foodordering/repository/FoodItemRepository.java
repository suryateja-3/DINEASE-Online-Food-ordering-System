package com.foodordering.repository;

import com.foodordering.model.FoodItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FoodItemRepository extends JpaRepository<FoodItem, Long> {
    @Query("SELECT f FROM FoodItem f WHERE (:restaurantId IS NULL OR f.restaurantId = :restaurantId) " +
           "AND (:category IS NULL OR LOWER(f.category) = LOWER(:category)) " +
           "AND (:search IS NULL OR LOWER(f.foodName) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<FoodItem> searchFoodItems(
            @Param("restaurantId") Long restaurantId,
            @Param("category") String category,
            @Param("search") String search
    );
}
