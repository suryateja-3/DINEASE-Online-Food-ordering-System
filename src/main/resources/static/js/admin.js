document.addEventListener("DOMContentLoaded", function () {
    verifyAdminSession();
});

function verifyAdminSession() {
    fetch("/users/me")
    .then(response => {
        if (!response.ok) throw new Error();
        return response.json();
    })
    .then(user => {
        if (user.role !== "ADMIN") {
            alert("Unauthorized access! Administrative privilege required.");
            window.location.href = "/";
            return;
        }
        
        // Load initial dashboard statistics and default panel
        loadDashboardStats();
        setupAdminTabs();
        loadRestaurantsTab(); // Load restaurants by default
    })
    .catch(() => {
        window.location.href = "/login-page";
    });
}

function loadDashboardStats() {
    // Resolve all dashboard counts
    Promise.all([
        fetch("/users").then(r => r.json()),
        fetch("/restaurants").then(r => r.json()),
        fetch("/fooditems").then(r => r.json()),
        fetch("/orders").then(r => r.json()),
        fetch("/payments").then(r => r.json())
    ])
    .then(([users, restaurants, foods, orders, payments]) => {
        document.getElementById("statUsers").textContent = users.length;
        document.getElementById("statRestaurants").textContent = restaurants.length;
        document.getElementById("statFoods").textContent = foods.length;
        document.getElementById("statOrders").textContent = orders.length;
        document.getElementById("statPayments").textContent = payments.length;

        // Calculate Revenue from successful payments
        let revenue = 0;
        payments.forEach(p => {
            if (p.paymentStatus === "SUCCESS") {
                revenue += p.amount;
            }
        });
        document.getElementById("statRevenue").textContent = "₹" + revenue.toFixed(2);
    })
    .catch(err => console.error("Error calculating admin stats:", err));
}

function setupAdminTabs() {
    const tabs = document.querySelectorAll(".admin-tab-btn");
    const panels = document.querySelectorAll(".admin-panel");

    tabs.forEach(tab => {
        tab.addEventListener("click", function () {
            tabs.forEach(t => t.classList.remove("active"));
            panels.forEach(p => p.classList.remove("active"));

            tab.classList.add("active");
            const panelId = tab.getAttribute("data-panel");
            document.getElementById(panelId).classList.add("active");

            // Fetch tab data based on activation
            if (panelId === "panelRestaurants") loadRestaurantsTab();
            if (panelId === "panelFoods") loadFoodsTab();
            if (panelId === "panelUsers") loadUsersTab();
            if (panelId === "panelOrders") loadOrdersTab();
            if (panelId === "panelPayments") loadPaymentsTab();
        });
    });
}

// ==========================================
// Restaurant Management
// ==========================================
function loadRestaurantsTab() {
    const listBody = document.getElementById("adminRestaurantList");
    if (!listBody) return;

    fetch("/restaurants")
    .then(res => res.json())
    .then(data => {
        listBody.innerHTML = "";
        data.forEach(r => {
            listBody.innerHTML += `
                <tr>
                    <td>${r.id}</td>
                    <td>${r.restaurantName}</td>
                    <td>${r.cuisine}</td>
                    <td>${r.openingTime} - ${r.closingTime}</td>
                    <td>${r.phone}</td>
                    <td>⭐ ${r.rating ? r.rating.toFixed(1) : 'New'}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick="showEditRestaurantModal(${r.id})">Edit</button>
                            <button class="btn btn-danger" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick="deleteRestaurant(${r.id})">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        });
    });
}

function showAddRestaurantModal() {
    document.getElementById("restaurantModalTitle").textContent = "Add Restaurant";
    document.getElementById("restaurantForm").reset();
    document.getElementById("restaurantIdField").value = "";
    toggleModal("restaurantModal", true);
}

function showEditRestaurantModal(id) {
    document.getElementById("restaurantModalTitle").textContent = "Edit Restaurant";
    fetch("/restaurants/" + id)
    .then(res => res.json())
    .then(r => {
        document.getElementById("restaurantIdField").value = r.id;
        document.getElementById("restName").value = r.restaurantName;
        document.getElementById("restOwner").value = r.ownerName;
        document.getElementById("restEmail").value = r.email;
        document.getElementById("restPhone").value = r.phone;
        document.getElementById("restAddress").value = r.address;
        document.getElementById("restCuisine").value = r.cuisine;
        document.getElementById("restOpen").value = r.openingTime;
        document.getElementById("restClose").value = r.closingTime;
        document.getElementById("restRating").value = r.rating;
        document.getElementById("restImage").value = r.imageUrl || "";
        toggleModal("restaurantModal", true);
    });
}

function submitRestaurantForm() {
    const id = document.getElementById("restaurantIdField").value;
    const restaurant = {
        restaurantName: document.getElementById("restName").value.trim(),
        ownerName: document.getElementById("restOwner").value.trim(),
        email: document.getElementById("restEmail").value.trim(),
        phone: document.getElementById("restPhone").value.trim(),
        address: document.getElementById("restAddress").value.trim(),
        cuisine: document.getElementById("restCuisine").value.trim(),
        openingTime: document.getElementById("restOpen").value.trim(),
        closingTime: document.getElementById("restClose").value.trim(),
        rating: parseFloat(document.getElementById("restRating").value),
        imageUrl: document.getElementById("restImage").value.trim()
    };

    const method = id ? "PUT" : "POST";
    const url = id ? "/restaurants/" + id : "/restaurants";

    fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(restaurant)
    })
    .then(res => {
        if (res.ok) {
            alert("Restaurant saved successfully!");
            toggleModal("restaurantModal", false);
            loadRestaurantsTab();
            loadDashboardStats();
        } else {
            alert("Failed to save restaurant!");
        }
    });
}

function deleteRestaurant(id) {
    if (confirm("Are you sure you want to delete this restaurant? All menu items might be affected.")) {
        fetch("/restaurants/" + id, { method: "DELETE" })
        .then(() => {
            loadRestaurantsTab();
            loadDashboardStats();
        });
    }
}

// ==========================================
// Food Management
// ==========================================
function loadFoodsTab() {
    const listBody = document.getElementById("adminFoodList");
    if (!listBody) return;

    // Load restaurants list first to build names map
    fetch("/restaurants")
    .then(res => res.json())
    .then(restaurants => {
        const restMap = {};
        restaurants.forEach(r => restMap[r.id] = r.restaurantName);

        fetch("/fooditems")
        .then(res => res.json())
        .then(data => {
            listBody.innerHTML = "";
            data.forEach(f => {
                const restName = restMap[f.restaurantId] || "Global (ID: " + f.restaurantId + ")";
                listBody.innerHTML += `
                    <tr>
                        <td>${f.id}</td>
                        <td>${f.foodName}</td>
                        <td>${f.category}</td>
                        <td>₹${f.price.toFixed(2)}</td>
                        <td>${f.quantity}</td>
                        <td>${f.available ? '🟢 Yes' : '🔴 No'}</td>
                        <td>${restName}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick="showEditFoodModal(${f.id})">Edit</button>
                                <button class="btn btn-danger" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick="deleteFood(${f.id})">Delete</button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        });
    });
}

function showAddFoodModal() {
    document.getElementById("foodModalTitle").textContent = "Add Food Item";
    document.getElementById("foodForm").reset();
    document.getElementById("foodIdField").value = "";
    
    // Populate restaurants dropdown selector
    populateRestaurantsDropdown();
    toggleModal("foodModal", true);
}

function showEditFoodModal(id) {
    document.getElementById("foodModalTitle").textContent = "Edit Food Item";
    populateRestaurantsDropdown().then(() => {
        fetch("/fooditems/" + id)
        .then(res => res.json())
        .then(f => {
            document.getElementById("foodIdField").value = f.id;
            document.getElementById("foodNameField").value = f.foodName;
            document.getElementById("foodDesc").value = f.description;
            document.getElementById("foodCategory").value = f.category;
            document.getElementById("foodPrice").value = f.price;
            document.getElementById("foodQty").value = f.quantity;
            document.getElementById("foodAvail").value = f.available.toString();
            document.getElementById("foodPrep").value = f.preparationTime || 15;
            document.getElementById("foodImage").value = f.imageUrl || "";
            document.getElementById("foodRest").value = f.restaurantId || "";
            toggleModal("foodModal", true);
        });
    });
}

function populateRestaurantsDropdown() {
    const dropdown = document.getElementById("foodRest");
    if (!dropdown) return Promise.resolve();

    return fetch("/restaurants")
    .then(res => res.json())
    .then(data => {
        dropdown.innerHTML = `<option value="">-- Select Restaurant --</option>`;
        data.forEach(r => {
            dropdown.innerHTML += `<option value="${r.id}">${r.restaurantName}</option>`;
        });
    });
}

function submitFoodForm() {
    const id = document.getElementById("foodIdField").value;
    const food = {
        foodName: document.getElementById("foodNameField").value.trim(),
        description: document.getElementById("foodDesc").value.trim(),
        category: document.getElementById("foodCategory").value,
        price: parseFloat(document.getElementById("foodPrice").value),
        quantity: parseInt(document.getElementById("foodQty").value),
        available: document.getElementById("foodAvail").value === "true",
        preparationTime: parseInt(document.getElementById("foodPrep").value),
        imageUrl: document.getElementById("foodImage").value.trim(),
        restaurantId: parseInt(document.getElementById("foodRest").value)
    };

    if (isNaN(food.restaurantId)) {
        alert("Please assign a restaurant for this food item!");
        return;
    }

    const method = id ? "PUT" : "POST";
    const url = id ? "/fooditems/" + id : "/fooditems";

    fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(food)
    })
    .then(res => {
        if (res.ok) {
            alert("Food item saved successfully!");
            toggleModal("foodModal", false);
            loadFoodsTab();
            loadDashboardStats();
        } else {
            alert("Failed to save food item!");
        }
    });
}

function deleteFood(id) {
    if (confirm("Are you sure you want to delete this food item?")) {
        fetch("/fooditems/" + id, { method: "DELETE" })
        .then(() => {
            loadFoodsTab();
            loadDashboardStats();
        });
    }
}

// ==========================================
// Users Management
// ==========================================
function loadUsersTab() {
    const listBody = document.getElementById("adminUserList");
    if (!listBody) return;

    fetch("/users")
    .then(res => res.json())
    .then(data => {
        listBody.innerHTML = "";
        data.forEach(u => {
            listBody.innerHTML += `
                <tr>
                    <td>${u.id}</td>
                    <td>${u.name}</td>
                    <td>${u.email}</td>
                    <td>${u.phone}</td>
                    <td>${u.address}</td>
                    <td><span class="restaurant-cuisine" style="background-color: ${u.role === 'ADMIN' ? '#fee2e2' : '#f1f5f9'}; color: ${u.role === 'ADMIN' ? '#991b1b' : '#334155'}">${u.role}</span></td>
                </tr>
            `;
        });
    });
}

// ==========================================
// Orders Management
// ==========================================
function loadOrdersTab() {
    const listBody = document.getElementById("adminOrderList");
    if (!listBody) return;

    Promise.all([
        fetch("/users").then(r => r.json()),
        fetch("/restaurants").then(r => r.json())
    ])
    .then(([users, restaurants]) => {
        const userMap = {};
        users.forEach(u => userMap[u.id] = u.name);

        const restMap = {};
        restaurants.forEach(r => restMap[r.id] = r.restaurantName);

        fetch("/orders")
        .then(res => res.json())
        .then(data => {
            // Sort orders descending by ID
            data.sort((a,b) => b.id - a.id);

            listBody.innerHTML = "";
            data.forEach(o => {
                const customer = userMap[o.userId] || "User ID: " + o.userId;
                const restaurant = restMap[o.restaurantId] || "Restaurant ID: " + o.restaurantId;
                const arrival = (o.arrivalDate || "Today") + " at " + o.arrivalTime;
                const itemsText = o.itemsText || "Food Menu items";
                
                listBody.innerHTML += `
                    <tr>
                        <td>${o.id}</td>
                        <td>${customer}</td>
                        <td>${restaurant}</td>
                        <td>${itemsText}</td>
                        <td>₹${o.totalAmount.toFixed(2)}</td>
                        <td>${arrival}</td>
                        <td>
                            <select onchange="updateOrderStatus(${o.id}, this.value)" style="padding: 0.35rem 0.5rem; font-size: 0.85rem; font-weight: 600; width: auto; display: inline-block;">
                                <option value="Pending" ${o.orderStatus === 'Pending' ? 'selected' : ''}>Pending</option>
                                <option value="Preparing" ${o.orderStatus === 'Preparing' ? 'selected' : ''}>Preparing</option>
                                <option value="Ready" ${o.orderStatus === 'Ready' ? 'selected' : ''}>Ready</option>
                                <option value="Completed" ${o.orderStatus === 'Completed' ? 'selected' : ''}>Completed</option>
                                <option value="Cancelled" ${o.orderStatus === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                        </td>
                    </tr>
                `;
            });
        });
    });
}

function updateOrderStatus(id, newStatus) {
    const updatedOrder = { orderStatus: newStatus };
    fetch("/orders/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedOrder)
    })
    .then(res => {
        if (res.ok) {
            alert("Order #" + id + " status updated to: " + newStatus);
            loadOrdersTab();
            loadDashboardStats();
        } else {
            alert("Failed to update status!");
        }
    });
}

// ==========================================
// Payments Management
// ==========================================
function loadPaymentsTab() {
    const listBody = document.getElementById("adminPaymentList");
    if (!listBody) return;

    fetch("/payments")
    .then(res => res.json())
    .then(data => {
        listBody.innerHTML = "";
        data.forEach(p => {
            listBody.innerHTML += `
                <tr>
                    <td>${p.id}</td>
                    <td>Order #${p.orderId}</td>
                    <td>₹${p.amount.toFixed(2)}</td>
                    <td>${p.paymentMethod}</td>
                    <td><span class="restaurant-cuisine" style="background-color: ${p.paymentStatus === 'SUCCESS' ? '#d1fae5' : '#fee2e2'}; color: ${p.paymentStatus === 'SUCCESS' ? '#065f46' : '#991b1b'}">${p.paymentStatus}</span></td>
                </tr>
            `;
        });
    });
}

// General UI Modal Toggle Helper
function toggleModal(id, show) {
    const modal = document.getElementById(id);
    if (!modal) return;
    if (show) {
        modal.classList.add("active");
    } else {
        modal.classList.remove("active");
    }
}
