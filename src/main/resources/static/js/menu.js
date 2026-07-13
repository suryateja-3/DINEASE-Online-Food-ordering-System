document.addEventListener("DOMContentLoaded", function () {
    const urlParams = new URLSearchParams(window.location.search);
    const restaurantId = urlParams.get("restaurantId");

    if (!restaurantId) {
        // Redirect to restaurants list if no ID provided
        const foodContainer = document.getElementById("foodContainer");
        if (foodContainer) {
            window.location.href = "/restaurants-page";
        }
        return;
    }

    // Load Restaurant Header Details
    loadRestaurantHeader(restaurantId);

    // Load Food items
    loadMenu(restaurantId);

    // Search food items
    const searchFoodInput = document.getElementById("searchFood");
    if (searchFoodInput) {
        searchFoodInput.addEventListener("input", function () {
            const search = searchFoodInput.value.trim();
            loadMenu(restaurantId, null, search);
        });
    }

    // Category click triggers
    const categoryList = document.querySelector(".category-list");
    if (categoryList) {
        categoryList.addEventListener("click", function (e) {
            const item = e.target.closest(".category-item");
            if (item) {
                document.querySelectorAll(".category-item").forEach(i => i.classList.remove("active"));
                item.classList.add("active");
                const cat = item.getAttribute("data-category");
                loadMenu(restaurantId, cat === "All" ? null : cat, null);
            }
        });
    }
});

function loadRestaurantHeader(restaurantId) {
    const headerTitle = document.getElementById("restaurantNameHeader");
    const headerCuisine = document.getElementById("restaurantCuisineHeader");
    const headerAddress = document.getElementById("restaurantAddressHeader");
    const headerRating = document.getElementById("restaurantRatingHeader");
    const headerTimings = document.getElementById("restaurantTimingsHeader");
    const headerImage = document.getElementById("restaurantImageHeader");

    fetch("/restaurants/" + restaurantId)
    .then(response => response.json())
    .then(restaurant => {
        if (headerTitle) headerTitle.textContent = restaurant.restaurantName;
        if (headerCuisine) headerCuisine.textContent = restaurant.cuisine;
        if (headerAddress) headerAddress.textContent = "📍 " + restaurant.address;
        if (headerRating) headerRating.textContent = "⭐ " + (restaurant.rating ? restaurant.rating.toFixed(1) : "New");
        if (headerTimings) headerTimings.textContent = "🕒 " + restaurant.openingTime + " - " + restaurant.closingTime;
        if (headerImage) {
            const img = restaurant.imageUrl && restaurant.imageUrl.trim() !== "" ? restaurant.imageUrl : "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80";
            headerImage.src = img;
        }
    })
    .catch(err => console.error("Error loading restaurant header:", err));
}

function loadMenu(restaurantId, category = null, search = null) {
    const foodContainer = document.getElementById("foodContainer");
    if (!foodContainer) return;

    let url = "/fooditems?restaurantId=" + restaurantId;
    if (category) url += "&category=" + encodeURIComponent(category);
    if (search) url += "&search=" + encodeURIComponent(search);

    foodContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">Loading dishes...</div>`;

    fetch(url)
    .then(response => response.json())
    .then(data => {
        foodContainer.innerHTML = "";
        if (data.length === 0) {
            foodContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-muted);">No menu items found.</div>`;
            return;
        }

        data.forEach(food => {
            const imgUrl = food.imageUrl && food.imageUrl.trim() !== "" ? food.imageUrl : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80";
            const prepTime = food.preparationTime ? food.preparationTime : 15;
            
            // Check availability
            let buyButtonHTML = "";
            let availabilityHTML = "";
            if (food.available && food.quantity > 0) {
                buyButtonHTML = `<button class="btn btn-primary" onclick="addFoodToCart(${food.id}, '${food.foodName.replace(/'/g, "\\'")}', ${food.price}, ${restaurantId})">Add to Cart</button>`;
                availabilityHTML = `<span class="food-qty-left">In Stock: ${food.quantity} left</span>`;
            } else {
                buyButtonHTML = `<button class="btn btn-secondary" disabled style="cursor: not-allowed; opacity: 0.5;">Out of Stock</button>`;
                availabilityHTML = `<span class="food-out-of-stock">Unavailable</span>`;
            }

            foodContainer.innerHTML += `
                <div class="food-card animate-fade-in">
                    <div class="food-img-container">
                        <img src="${imgUrl}" class="food-img" alt="${food.foodName}" onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'">
                        <span class="food-badge veg">${food.category}</span>
                    </div>
                    <div class="food-body">
                        <h2 class="food-title">${food.foodName}</h2>
                        <p class="food-desc">${food.description}</p>
                        <div class="food-meta">
                            <div class="food-time">🕒 Prep time: ${prepTime} mins</div>
                            ${availabilityHTML}
                            <div class="food-price-buy" style="margin-top: 0.5rem;">
                                <span class="food-price">₹${food.price.toFixed(2)}</span>
                                ${buyButtonHTML}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    })
    .catch(error => {
        console.error(error);
        foodContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--danger-color); font-weight: 700;">Unable to Load Menu Items.</div>`;
    });
}

function addFoodToCart(foodItemId, foodName, price, restaurantId) {
    // Check if user is logged in
    fetch("/users/me")
    .then(async response => {
        if (!response.ok) {
            alert("Please login first to add items to your cart!");
            window.location.href = "/login-page";
            return;
        }
        const user = await response.json();
        
        const cartItem = {
            userId: user.id,
            foodItemId: foodItemId,
            foodName: foodName,
            price: price,
            quantity: 1,
            totalPrice: price,
            restaurantId: restaurantId
        };

        fetch("/carts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cartItem)
        })
        .then(res => {
            if (res.ok) {
                alert("Successfully added " + foodName + " to cart!");
            } else {
                alert("Could not add item to cart!");
            }
        });
    })
    .catch(err => {
        console.error(err);
        alert("Login required!");
    });
}
