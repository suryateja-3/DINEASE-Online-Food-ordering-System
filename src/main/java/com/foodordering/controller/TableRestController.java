package com.foodordering.controller;

import com.foodordering.model.RestaurantTable;
import com.foodordering.model.Order;
import com.foodordering.model.User;
import com.foodordering.repository.RestaurantTableRepository;
import com.foodordering.repository.OrderRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/restaurants/{restaurantId}")
public class TableRestController {

    @Autowired
    private RestaurantTableRepository restaurantTableRepository;

    @Autowired
    private OrderRepository orderRepository;

    // 1. Get all tables of a restaurant
    @GetMapping("/tables")
    public ResponseEntity<List<RestaurantTable>> getTables(@PathVariable Long restaurantId) {
        return ResponseEntity.ok(restaurantTableRepository.findByRestaurantId(restaurantId));
    }

    // 2. Get available tables for a given restaurant, date, and arrival time
    @GetMapping("/available-tables")
    public ResponseEntity<List<RestaurantTable>> getAvailableTables(
            @PathVariable Long restaurantId,
            @RequestParam("date") String date,
            @RequestParam("time") String time) {

        List<RestaurantTable> allTables = restaurantTableRepository.findByRestaurantId(restaurantId);
        
        // Find all active orders for this restaurant and date
        List<Order> activeOrders = orderRepository.findByRestaurantId(restaurantId).stream()
                .filter(o -> date.equals(o.getArrivalDate()))
                .filter(o -> !"Cancelled".equalsIgnoreCase(o.getOrderStatus()))
                .filter(o -> !"Completed".equalsIgnoreCase(o.getOrderStatus()))
                .collect(Collectors.toList());

        List<RestaurantTable> availableTables = new ArrayList<>();

        for (RestaurantTable table : allTables) {
            boolean isReserved = false;
            for (Order order : activeOrders) {
                if (table.getId().equals(order.getTableId())) {
                    // Check if time overlaps (within 2 hours window)
                    if (isTimeOverlapping(time, order.getArrivalTime())) {
                        isReserved = true;
                        break;
                    }
                }
            }
            if (!isReserved && table.isAvailable()) {
                availableTables.add(table);
            }
        }

        return ResponseEntity.ok(availableTables);
    }

    // 3. Add a new table (Admin)
    @PostMapping("/tables")
    public ResponseEntity<?> addTable(
            @PathVariable Long restaurantId,
            @RequestBody RestaurantTable table,
            HttpServletRequest request) {
        
        if (!isAdmin(request)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Admin privilege required.");
        }
        
        table.setRestaurantId(restaurantId);
        if (table.getTableNumber() == null || table.getTableNumber().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Table number is required.");
        }
        if (table.getTableType() == null) {
            table.setTableType("4-Seater");
        }
        if (table.getCapacity() == null) {
            table.setCapacity(4);
        }
        
        RestaurantTable saved = restaurantTableRepository.save(table);
        return ResponseEntity.ok(saved);
    }

    // 4. Delete a table (Admin)
    @DeleteMapping("/tables/{tableId}")
    public ResponseEntity<?> deleteTable(
            @PathVariable Long restaurantId,
            @PathVariable Long tableId,
            HttpServletRequest request) {
        
        if (!isAdmin(request)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Admin privilege required.");
        }

        return restaurantTableRepository.findById(tableId).map(table -> {
            restaurantTableRepository.delete(table);
            return ResponseEntity.ok().build();
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    private boolean isTimeOverlapping(String time1, String time2) {
        try {
            // Parse HH:mm
            String[] parts1 = time1.split(":");
            String[] parts2 = time2.split(":");
            int mins1 = Integer.parseInt(parts1[0]) * 60 + Integer.parseInt(parts1[1]);
            int mins2 = Integer.parseInt(parts2[0]) * 60 + Integer.parseInt(parts2[1]);
            return Math.abs(mins1 - mins2) < 120; // 2 hour window
        } catch (Exception e) {
            return true; // Safer default
        }
    }

    private boolean isAdmin(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        return currentUser != null && "ADMIN".equalsIgnoreCase(currentUser.getRole());
    }
}
