document.addEventListener("DOMContentLoaded", function () {
    loadCart();
});

function loadCart() {
    const cartContainer = document.getElementById("cartContainer");
    const checkoutBtn = document.getElementById("checkoutBtn");
    const clearCartBtn = document.getElementById("clearCartBtn");

    if (!cartContainer) return;

    fetch("/users/me")
    .then(response => {
        if (!response.ok) throw new Error("Not logged in");
        return response.json();
    })
    .then(user => {
        fetch("/carts/user/" + user.id)
        .then(res => res.json())
        .then(data => {
            cartContainer.innerHTML = "";
            if (data.length === 0) {
                cartContainer.innerHTML = `
                    <div class="cart-empty-state">
                        <div class="cart-empty-icon">🛒</div>
                        <h2>Your Cart is Empty</h2>
                        <br>
                        <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Choose a restaurant and add some tasty dine-in pre-orders!</p>
                        <a href="/restaurants-page" class="btn btn-primary">Browse Restaurants</a>
                    </div>
                `;
                if (checkoutBtn) checkoutBtn.style.display = "none";
                if (clearCartBtn) clearCartBtn.style.display = "none";
                updateSummary(0, 0, "");
                return;
            }

            if (checkoutBtn) checkoutBtn.style.display = "inline-flex";
            if (clearCartBtn) {
                clearCartBtn.style.display = "inline-flex";
                // Attach click listener for clearing cart
                clearCartBtn.onclick = function() {
                    if (confirm("Are you sure you want to clear your cart?")) {
                        fetch("/carts/user/" + user.id, { method: "DELETE" })
                        .then(() => loadCart());
                    }
                };
            }

            let subtotal = 0;
            let maxPrepTime = 0;
            let restaurantId = data[0].restaurantId;

            // Load Restaurant Name
            if (restaurantId) {
                fetch("/restaurants/" + restaurantId)
                .then(r => r.json())
                .then(rest => {
                    document.getElementById("cartRestaurantName").textContent = rest.restaurantName;
                })
                .catch(() => {});
            }

            data.forEach(item => {
                subtotal += item.totalPrice;
                
                cartContainer.innerHTML += `
                    <div class="cart-item animate-fade-in">
                        <div class="cart-item-details">
                            <h3 class="cart-item-name">🍔 ${item.foodName}</h3>
                            <p class="cart-item-price">₹${item.price.toFixed(2)} each</p>
                        </div>
                        <div class="quantity-controls">
                            <button class="qty-btn" onclick="updateQty(${item.id}, ${item.quantity - 1})">-</button>
                            <span class="qty-val">${item.quantity}</span>
                            <button class="qty-btn" onclick="updateQty(${item.id}, ${item.quantity + 1})">+</button>
                        </div>
                        <div style="font-weight: 700; font-size: 1.05rem; min-width: 80px; text-align: right;">
                            ₹${item.totalPrice.toFixed(2)}
                        </div>
                        <button class="cart-item-remove" onclick="removeCartItem(${item.id})" style="margin-left: 1.5rem;">
                            🗑️
                        </button>
                    </div>
                `;

                // Fetch preparation times
                fetch("/fooditems/" + item.foodItemId)
                .then(fr => fr.json())
                .then(food => {
                    if (food.preparationTime && food.preparationTime > maxPrepTime) {
                        maxPrepTime = food.preparationTime;
                        updateSummary(subtotal, maxPrepTime + 5, ""); // update prep time dynamically with 5 min buffer
                    }
                })
                .catch(() => {});
            });

            updateSummary(subtotal, maxPrepTime > 0 ? maxPrepTime + 5 : 15, "");
        });
    })
    .catch(() => {
        window.location.href = "/login-page";
    });
}

function updateQty(id, newQty) {
    if (newQty <= 0) {
        removeCartItem(id);
        return;
    }

    fetch("/carts/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQty })
    })
    .then(res => {
        if (res.ok) {
            loadCart();
        } else {
            alert("Quantity update failed!");
        }
    });
}

function removeCartItem(id) {
    if (confirm("Remove this item from your cart?")) {
        fetch("/carts/" + id, { method: "DELETE" })
        .then(res => {
            if (res.ok) {
                loadCart();
            }
        });
    }
}

function updateSummary(subtotal, prepTime, restaurantName) {
    const subtotalEl = document.getElementById("cartSubtotal");
    const prepTimeEl = document.getElementById("cartPrepTime");
    const grandTotalEl = document.getElementById("cartGrandTotal");

    if (subtotalEl) subtotalEl.textContent = "₹" + subtotal.toFixed(2);
    if (prepTimeEl) prepTimeEl.textContent = prepTime + " mins";
    if (grandTotalEl) grandTotalEl.textContent = "₹" + subtotal.toFixed(2);
}
