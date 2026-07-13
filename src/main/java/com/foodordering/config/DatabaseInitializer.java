package com.foodordering.config;

import com.foodordering.model.FoodItem;
import com.foodordering.model.Restaurant;
import com.foodordering.model.User;
import com.foodordering.repository.FoodItemRepository;
import com.foodordering.repository.RestaurantRepository;
import com.foodordering.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class DatabaseInitializer implements ApplicationRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RestaurantRepository restaurantRepository;

    @Autowired
    private FoodItemRepository foodItemRepository;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        // 1. Seed default Users (Customer and Admin)
        if (userRepository.count() == 0) {
            User admin = new User(
                    null,
                    "System Admin",
                    "admin@dineease.com",
                    "9876543210",
                    "DineEase Headquarters, Connaught Place, New Delhi",
                    "admin123",
                    "ADMIN"
            );
            User customer = new User(
                    null,
                    "Surya Prakash",
                    "surya@gmail.com",
                    "9988776655",
                    "Sector 62, Noida, UP",
                    "surya123",
                    "USER"
            );
            userRepository.saveAll(Arrays.asList(admin, customer));
            System.out.println(">>> Database initialized with default admin and customer user profiles.");
        }

        // 2. Seed default Restaurants
        if (restaurantRepository.count() == 0) {
            Restaurant r1 = new Restaurant(
                    null,
                    "La Piazza",
                    "Giovanni Rossi",
                    "lapiazza@italian.com",
                    "0112345678",
                    "Connaught Place, New Delhi",
                    "Italian",
                    "11:00 AM",
                    "11:00 PM",
                    4.8,
                    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80"
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
                    "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80"
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
                    "https://images.unsplash.com/photo-1585938338392-50a59970d2ee?auto=format&fit=crop&w=800&q=80"
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
                    "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=800&q=80"
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
                    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80"
            );

            restaurantRepository.saveAll(Arrays.asList(r1, r2, r3, r4, r5));
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

                foodItemRepository.saveAll(Arrays.asList(f1, f2, f3, f4, f5, f6, f7, f8, f9, f10, f11, f12, f13, f14, f15));
                System.out.println(">>> Database initialized with default menu food items.");
            }
        }
    }
}
