document.addEventListener("DOMContentLoaded", function () {
    const restaurantList = document.getElementById("restaurantList");
    const searchInput = document.getElementById("searchRestaurant");
    const cuisineContainer = document.querySelector(".cuisine-filters");

    if (restaurantList) {
        // Load initial restaurants list
        loadRestaurants();

        // Search trigger
        if (searchInput) {
            searchInput.addEventListener("input", function () {
                const query = searchInput.value.trim();
                loadRestaurants(query, null);
            });
        }

        // Cuisine filter click trigger
        if (cuisineContainer) {
            cuisineContainer.addEventListener("click", function (e) {
                if (e.target.classList.contains("cuisine-btn")) {
                    document.querySelectorAll(".cuisine-btn").forEach(btn => btn.classList.remove("active"));
                    e.target.classList.add("active");
                    
                    const cuisine = e.target.getAttribute("data-cuisine");
                    loadRestaurants(null, cuisine === "All" ? null : cuisine);
                }
            });
        }
    }
});

function loadRestaurants(search = null, cuisine = null) {
    const restaurantList = document.getElementById("restaurantList");
    if (!restaurantList) return;

    let url = "/restaurants";
    const params = [];
    if (search) params.push("search=" + encodeURIComponent(search));
    if (cuisine) params.push("cuisine=" + encodeURIComponent(cuisine));
    if (params.length > 0) {
        url += "?" + params.join("&");
    }

    restaurantList.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">Loading restaurants...</div>`;

    fetch(url)
    .then(response => response.json())
    .then(data => {
        restaurantList.innerHTML = "";
        if (data.length === 0) {
            restaurantList.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-muted);">No restaurants found matching search filters.</div>`;
            return;
        }

        data.forEach(restaurant => {
            const imgUrl = restaurant.imageUrl && restaurant.imageUrl.trim() !== "" ? restaurant.imageUrl : "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=500&q=80";
            const rating = restaurant.rating ? restaurant.rating.toFixed(1) : "New";
            
            restaurantList.innerHTML += `
                <div class="restaurant-card animate-fade-in">
                    <div class="restaurant-img-container">
                        <img src="${imgUrl}" class="restaurant-img" alt="${restaurant.restaurantName}" onerror="this.src='https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=500&q=80'">
                        <span class="restaurant-badge">${restaurant.openingTime} - ${restaurant.closingTime}</span>
                    </div>
                    <div class="restaurant-body">
                        <h2 class="restaurant-title">${restaurant.restaurantName}</h2>
                        <div class="restaurant-meta">
                            <span class="restaurant-cuisine">${restaurant.cuisine}</span>
                            <span class="restaurant-rating">⭐ ${rating}</span>
                        </div>
                        <div class="restaurant-details-list">
                            <div class="restaurant-details-item">📍 ${restaurant.address}</div>
                            <div class="restaurant-details-item">📞 ${restaurant.phone}</div>
                        </div>
                        <br>
                        <a href="/restaurant-details-page?restaurantId=${restaurant.id}" class="btn btn-primary" style="margin-top: auto; text-align: center;">View Details</a>
                    </div>
                </div>
            `;
        });
    })
    .catch(error => {
        console.error(error);
        restaurantList.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--danger-color); font-weight: 700;">Unable to Load Restaurants. Please try again later.</div>`;
    });
}
