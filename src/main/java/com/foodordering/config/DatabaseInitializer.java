package com.foodordering.config;

import com.foodordering.model.RestaurantTable;
import com.foodordering.model.Review;
import com.foodordering.model.FoodItem;
import com.foodordering.model.Restaurant;
import com.foodordering.model.User;
import com.foodordering.repository.FoodItemRepository;
import com.foodordering.repository.RestaurantRepository;
import com.foodordering.repository.RestaurantTableRepository;
import com.foodordering.repository.ReviewRepository;
import com.foodordering.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Component
public class DatabaseInitializer implements ApplicationRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RestaurantRepository restaurantRepository;

    @Autowired
    private FoodItemRepository foodItemRepository;

    @Autowired
    private RestaurantTableRepository restaurantTableRepository;

    @Autowired
    private ReviewRepository reviewRepository;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        // 1. Seed default Users (Customer and Admin)
        Optional<User> adminOpt = userRepository.findByEmail("suryatejathamma@gmail.com");
        if (adminOpt.isEmpty()) {
            User admin = new User();
            admin.setName("System Admin");
            admin.setEmail("suryatejathamma@gmail.com");
            admin.setPhone("9876543210");
            admin.setAddress("DineEase Headquarters, Hi-Tech City, Hyderabad");
            admin.setPassword("369");
            admin.setRole("ADMIN");
            admin.setWalletBalance(0.0);
            admin.setFirstOrderCompleted(false);
            userRepository.save(admin);
            System.out.println(">>> Seeded default admin user.");
        } else {
            User admin = adminOpt.get();
            admin.setRole("ADMIN");
            admin.setPassword("369");
            userRepository.save(admin);
            System.out.println(">>> Updated existing admin account status to ADMIN.");
        }

        if (userRepository.findByEmail("surya@gmail.com").isEmpty()) {
            User customer = new User();
            customer.setName("Surya Prakash");
            customer.setEmail("surya@gmail.com");
            customer.setPhone("9988776655");
            customer.setAddress("Sector 62, Noida, UP");
            customer.setPassword("surya123");
            customer.setRole("USER");
            customer.setWalletBalance(0.0);
            customer.setFirstOrderCompleted(false);
            userRepository.save(customer);
            System.out.println(">>> Seeded default customer user.");
        }

        // 2. Seed default Restaurants
        if (restaurantRepository.count() == 0) {
            Restaurant r1 = new Restaurant(
                    null,
                    "La Piazza",
                    "Giovanni Rossi",
                    "lapiazza@italian.com",
                    "0112345678",
                    "Hi-Tech City, Hyderabad",
                    "Italian",
                    "11:00 AM",
                    "11:00 PM",
                    4.8,
                    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
                    "Authentic Italian woodfired pizzas & handmade pasta in a rustic, cozy ambience.",
                    true
            );

            Restaurant r2 = new Restaurant(
                    null,
                    "Golden Dragon",
                    "Chen Wei",
                    "goldendragon@chinese.com",
                    "0808765432",
                    "Indiranagar, Bangalore",
                    "Chinese",
                    "12:00 PM",
                    "10:30 PM",
                    4.5,
                    "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80",
                    "Exquisite Szechuan specialties & classic Cantonese recipes curated by master chefs.",
                    true
            );

            Restaurant r3 = new Restaurant(
                    null,
                    "Spice Symphony",
                    "Rajesh Kumar",
                    "spicesymphony@indian.com",
                    "0339876543",
                    "Salt Lake, Kolkata",
                    "Indian",
                    "10:30 AM",
                    "11:00 PM",
                    4.7,
                    "https://images.unsplash.com/photo-1585938338392-50a59970d2ee?auto=format&fit=crop&w=800&q=80",
                    "A rich fusion of classic North and South Indian curries, kebabs, and aromatic biryanis.",
                    true
            );

            Restaurant r4 = new Restaurant(
                    null,
                    "Sweet Treats",
                    "Sarah Miller",
                    "sweettreats@dessert.com",
                    "0224567890",
                    "Juhu, Mumbai",
                    "Dessert",
                    "09:00 AM",
                    "11:30 PM",
                    4.6,
                    "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=800&q=80",
                    "Heavenly pastries, custom-crafted cakes, and delicious artisanal desserts.",
                    true
            );

            Restaurant r5 = new Restaurant(
                    null,
                    "Burger House",
                    "Mike Tyson",
                    "burgerhouse@fastfood.com",
                    "0401122334",
                    "Gachibowli, Hyderabad",
                    "Fast Food",
                    "10:00 AM",
                    "11:00 PM",
                    4.4,
                    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
                    "Flame-grilled beef & chicken burgers with golden french fries and thick milkshakes.",
                    true
            );

            Restaurant r6 = new Restaurant(
                    null,
                    "Sushi Zen",
                    "Kenji Tanaka",
                    "sushizen@japanese.com",
                    "0119876541",
                    "Saket, New Delhi",
                    "Japanese",
                    "12:00 PM",
                    "10:00 PM",
                    4.9,
                    "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80",
                    "Premium sashimi, nigiri, and traditional hand-rolled sushi served with fresh wasabi.",
                    true
            );

            Restaurant r7 = new Restaurant(
                    null,
                    "Taco Loco",
                    "Carlos Santana",
                    "tacoloco@mexican.com",
                    "0801122335",
                    "Koramangala, Bangalore",
                    "Mexican",
                    "11:00 AM",
                    "11:00 PM",
                    4.6,
                    "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80",
                    "Street-style tacos, quesadillas, and delicious burritos bursting with fresh Mexican flavors.",
                    true
            );

            Restaurant r8 = new Restaurant(
                    null,
                    "The Grillhouse",
                    "John Doe",
                    "grillhouse@american.com",
                    "0228899001",
                    "Bandra, Mumbai",
                    "American",
                    "12:00 PM",
                    "11:30 PM",
                    4.7,
                    "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
                    "Slow-cooked ribs, ribeye steaks, and premium woodfired BBQ delicacies.",
                    true
            );

            restaurantRepository.saveAll(Arrays.asList(r1, r2, r3, r4, r5, r6, r7, r8));
            System.out.println(">>> Database initialized with default partner restaurants.");

            // 3. Seed default Menu items matching the saved restaurants
            if (foodItemRepository.count() == 0) {
                // Fetch saved IDs to link properly
                List<Restaurant> savedRest = restaurantRepository.findAll();
                Long idLaPiazza = savedRest.stream().filter(r -> r.getRestaurantName().equals("La Piazza")).findFirst().get().getId();
                Long idGoldenDragon = savedRest.stream().filter(r -> r.getRestaurantName().equals("Golden Dragon")).findFirst().get().getId();
                Long idSpiceSymphony = savedRest.stream().filter(r -> r.getRestaurantName().equals("Spice Symphony")).findFirst().get().getId();
                Long idSweetTreats = savedRest.stream().filter(r -> r.getRestaurantName().equals("Sweet Treats")).findFirst().get().getId();
                Long idBurgerHouse = savedRest.stream().filter(r -> r.getRestaurantName().equals("Burger House")).findFirst().get().getId();
                Long idSushiZen = savedRest.stream().filter(r -> r.getRestaurantName().equals("Sushi Zen")).findFirst().get().getId();
                Long idTacoLoco = savedRest.stream().filter(r -> r.getRestaurantName().equals("Taco Loco")).findFirst().get().getId();
                Long idGrillhouse = savedRest.stream().filter(r -> r.getRestaurantName().equals("The Grillhouse")).findFirst().get().getId();

                // La Piazza
                FoodItem f1 = new FoodItem(null, "Bruschetta Al Pomodoro", "Toasted garlic bread topped with fresh diced tomatoes, basil, and extra virgin olive oil.", "Starter", 180.00, 20, true, 10, "https://images.unsplash.com/photo-1572656631137-7935297eff55?auto=format&fit=crop&w=500&q=80", idLaPiazza);
                FoodItem f2 = new FoodItem(null, "Margherita Woodfire Pizza", "Classic Napoletana pizza with tomato sauce, fresh mozzarella, and fresh basil leaves.", "Main Course", 350.00, 15, true, 20, "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&w=500&q=80", idLaPiazza);
                FoodItem f3 = new FoodItem(null, "Classic Tiramisu", "Espresso-dipped ladyfingers layered with a whipped mixture of egg yolks, sugar, and mascarpone cheese.", "Dessert", 220.00, 10, true, 12, "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=500&q=80", idLaPiazza);

                // Golden Dragon
                FoodItem f4 = new FoodItem(null, "Veg Spring Rolls", "Crispy deep-fried wrapper stuffed with stir-fried minced vegetables.", "Starter", 150.00, 25, true, 10, "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=500&q=80", idGoldenDragon);
                FoodItem f5 = new FoodItem(null, "Schezwan Hakka Noodles", "Stir-fried noodles tossed in spicy Schezwan sauce with colorful vegetables.", "Main Course", 250.00, 30, true, 15, "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=500&q=80", idGoldenDragon);
                FoodItem f6 = new FoodItem(null, "Golden Fried Wontons", "Crispy fried wontons filled with minced water chestnut and paneer.", "Starter", 180.00, 18, true, 12, "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=500&q=80", idGoldenDragon);

                // Spice Symphony
                FoodItem f7 = new FoodItem(null, "Tandoori Paneer Tikka", "Cottage cheese cubes marinated in tandoori spices and grilled in clay oven.", "Starter", 260.00, 30, true, 18, "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=500&q=80", idSpiceSymphony);
                FoodItem f8 = new FoodItem(null, "Premium Butter Chicken Combo", "Rich creamy butter chicken served with 2 butter naans or basmati rice.", "Main Course", 380.00, 40, true, 25, "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=500&q=80", idSpiceSymphony);
                FoodItem f9 = new FoodItem(null, "Kesari Gulab Jamun", "Soft, melt-in-the-mouth fried dumplings soaked in rose and cardamom syrup.", "Dessert", 90.00, 50, true, 5, "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=500&q=80", idSpiceSymphony);

                // Sweet Treats
                FoodItem f10 = new FoodItem(null, "Blueberry Cheesecake Slice", "New York style baked cheesecake slice topped with blueberry compote.", "Dessert", 190.00, 15, true, 5, "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=500&q=80", idSweetTreats);
                FoodItem f11 = new FoodItem(null, "Hot Chocolate Fudge", "Vanilla ice cream scoops loaded with hot chocolate fudge sauce and roasted cashew nuts.", "Dessert", 170.00, 20, true, 10, "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=500&q=80", idSweetTreats);
                FoodItem f12 = new FoodItem(null, "Fresh Mango Smoothie", "Thick blend of fresh ripe Alphonso mangoes, milk, and cream.", "Beverage", 120.00, 30, true, 8, "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=500&q=80", idSweetTreats);

                // Burger House
                FoodItem f13 = new FoodItem(null, "Crispy Paneer Burger", "Cottage cheese patty with crispy crumbs coating, spicy mayo, and lettuce.", "Main Course", 160.00, 35, true, 10, "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80", idBurgerHouse);
                FoodItem f14 = new FoodItem(null, "Peri Peri French Fries", "Spicy french fries seasoned with peri peri salt.", "Starter", 110.00, 60, true, 8, "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=500&q=80", idBurgerHouse);
                FoodItem f15 = new FoodItem(null, "Iced Caramel Macchiato", "Freshly brewed espresso with caramel syrup, milk, and ice cubes.", "Beverage", 130.00, 45, true, 6, "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=500&q=80", idBurgerHouse);

                // Sushi Zen
                FoodItem f16 = new FoodItem(null, "Salmon Nigiri", "Slices of fresh, raw salmon placed over pressed vinegared sushi rice.", "Starter", 290.00, 15, true, 10, "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=500&q=80", idSushiZen);
                FoodItem f17 = new FoodItem(null, "Spicy Tuna Roll", "Uramaki style sushi roll filled with minced spicy tuna, cucumber, and topped with spicy mayo.", "Main Course", 380.00, 20, true, 15, "https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=500&q=80", idSushiZen);
                FoodItem f18 = new FoodItem(null, "Tonkotsu Ramen", "Rich and creamy pork bone broth served with ramen noodles, chashu pork, soft egg, and green onion.", "Main Course", 450.00, 25, true, 12, "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=500&q=80", idSushiZen);

                // Taco Loco
                FoodItem f19 = new FoodItem(null, "Crispy Corn Tacos", "Three crispy corn shells filled with seasoned beans, cheese, salsa, and sour cream.", "Starter", 160.00, 10, true, 20, "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=500&q=80", idTacoLoco);
                FoodItem f20 = new FoodItem(null, "Spicy Bean Burrito", "Warm flour tortilla wrapped around spicy refried beans, Mexican rice, cheese, and guacamole.", "Main Course", 240.00, 15, true, 15, "https://images.unsplash.com/photo-1626700051175-6518c4793fdf?auto=format&fit=crop&w=500&q=80", idTacoLoco);
                FoodItem f21 = new FoodItem(null, "Cheese Quesadilla", "Toasted flour tortilla filled with melted Monterey Jack cheese, served with pico de gallo.", "Starter", 190.00, 12, true, 18, "https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?auto=format&fit=crop&w=500&q=80", idTacoLoco);

                // The Grillhouse
                FoodItem f22 = new FoodItem(null, "Signature Beef Burger", "Premium flame-grilled beef patty with melted cheddar, bacon, lettuce, tomato, and barbecue sauce.", "Main Course", 390.00, 20, true, 15, "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80", idGrillhouse);
                FoodItem f23 = new FoodItem(null, "BBQ Chicken Wings", "Crispy fried wings tossed in sweet and smoky hickory barbecue sauce.", "Starter", 280.00, 15, true, 25, "https://images.unsplash.com/photo-1608039829572-78524f79c4c7?auto=format&fit=crop&w=500&q=80", idGrillhouse);
                FoodItem f24 = new FoodItem(null, "Loaded Onion Rings", "Thick-cut golden fried onion rings drizzled with cheese sauce and spring onions.", "Starter", 140.00, 10, true, 30, "https://images.unsplash.com/photo-1639024471283-27789c6d4be3?auto=format&fit=crop&w=500&q=80", idGrillhouse);

                foodItemRepository.saveAll(Arrays.asList(f1, f2, f3, f4, f5, f6, f7, f8, f9, f10, f11, f12, f13, f14, f15, f16, f17, f18, f19, f20, f21, f22, f23, f24));
                System.out.println(">>> Database initialized with default menu food items.");
            }
        }

        // 4. Seed Restaurant Tables
        if (restaurantTableRepository.count() == 0) {
            List<Restaurant> allRestaurants = restaurantRepository.findAll();
            for (Restaurant r : allRestaurants) {
                RestaurantTable t1 = new RestaurantTable(null, r.getId(), "Table T1 (2-Seater)", "2-Seater", 2, true);
                RestaurantTable t2 = new RestaurantTable(null, r.getId(), "Table T2 (2-Seater)", "2-Seater", 2, true);
                RestaurantTable t3 = new RestaurantTable(null, r.getId(), "Table T3 (4-Seater)", "4-Seater", 4, true);
                RestaurantTable t4 = new RestaurantTable(null, r.getId(), "Table T4 (4-Seater)", "4-Seater", 4, true);
                RestaurantTable t5 = new RestaurantTable(null, r.getId(), "Table T5 (Family Table)", "Family Table", 6, true);
                RestaurantTable t6 = new RestaurantTable(null, r.getId(), "Table T6 (Family Table)", "Family Table", 8, true);
                restaurantTableRepository.saveAll(Arrays.asList(t1, t2, t3, t4, t5, t6));
            }
            System.out.println(">>> Database initialized with default restaurant tables.");
        }

        // 5. Seed Reviews
        if (reviewRepository.count() == 0) {
            List<Restaurant> allRestaurants = restaurantRepository.findAll();
            if (!allRestaurants.isEmpty()) {
                Restaurant r = allRestaurants.get(0); // La Piazza
                Review rev1 = new Review(null, 2L, "Surya Prakash", r.getId(), 5, "Outstanding woodfire pizza! Table T3 was ready immediately on our arrival. Highly recommend pre-ordering.", "2026-07-10T19:30:00");
                Review rev2 = new Review(null, 2L, "Surya Prakash", r.getId(), 4, "Tiramisu was delicious and cold. Excellent service and zero wait time.", "2026-07-11T20:15:00");
                reviewRepository.saveAll(Arrays.asList(rev1, rev2));
            }
            System.out.println(">>> Database initialized with default reviews.");
        }
    }
}
