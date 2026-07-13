document.addEventListener("DOMContentLoaded", function () {
    const checkoutForm = document.getElementById("checkoutForm");
    const summaryBox = document.getElementById("checkoutSummaryBox");

    if (checkoutForm) {
        // Pre-fill date field and restrict past dates
        const dateInput = document.getElementById("arrivalDate");
        if (dateInput) {
            const today = new Date().toISOString().split("T")[0];
            dateInput.min = today;
            dateInput.value = today;
        }

        fetch("/users/me")
        .then(response => {
            if (!response.ok) throw new Error("Not logged in");
            return response.json();
        })
        .then(user => {
            // Load cart summary
            fetch("/carts/user/" + user.id)
            .then(res => res.json())
            .then(data => {
                if (data.length === 0) {
                    alert("Your cart is empty! Add food items first.");
                    window.location.href = "/cart-page";
                    return;
                }

                let total = 0;
                let maxPrep = 0;
                if (summaryBox) {
                    summaryBox.innerHTML = "";
                    data.forEach(item => {
                        total += item.totalPrice;
                        summaryBox.innerHTML += `
                            <div class="checkout-summary-item">
                                <span>${item.foodName} (x${item.quantity})</span>
                                <span>₹${item.totalPrice.toFixed(2)}</span>
                            </div>
                        `;
                    });
                    summaryBox.innerHTML += `
                        <div class="checkout-summary-item total">
                            <span>Grand Total</span>
                            <span>₹${total.toFixed(2)}</span>
                        </div>
                    `;
                }

                // Attach submit handler
                checkoutForm.addEventListener("submit", function (e) {
                    e.preventDefault();

                    const arrivalDate = document.getElementById("arrivalDate").value;
                    const arrivalTime = document.getElementById("arrivalTime").value;
                    const numberOfPeople = parseInt(document.getElementById("numberOfPeople").value);
                    const specialInstructions = document.getElementById("specialInstructions").value.trim();

                    // Validation
                    if (!arrivalDate || !arrivalTime) {
                        alert("Please select both Arrival Date and Time.");
                        return;
                    }
                    if (isNaN(numberOfPeople) || numberOfPeople <= 0) {
                        alert("Please enter a valid number of guests.");
                        return;
                    }

                    // Check if date is in the past
                    const selectedDate = new Date(arrivalDate);
                    const todayDate = new Date();
                    todayDate.setHours(0,0,0,0);
                    if (selectedDate < todayDate) {
                        alert("Arrival date cannot be in the past!");
                        return;
                    }

                    const order = {
                        userId: user.id,
                        arrivalDate: arrivalDate,
                        arrivalTime: arrivalTime,
                        numberOfPeople: numberOfPeople,
                        specialInstructions: specialInstructions,
                        orderStatus: "Pending",
                        deliveryAddress: "Dine-In Reservation" // Fallback to avoid schema constraint
                    };

                    fetch("/orders", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(order)
                    })
                    .then(async res => {
                        if (res.ok) {
                            const savedOrder = await res.json();
                            sessionStorage.setItem("lastOrderId", savedOrder.id);
                            sessionStorage.setItem("lastOrderAmount", savedOrder.totalAmount);
                            alert("Pre-Order Registered! Redirecting to payment...");
                            window.location.href = "/payment-page";
                        } else {
                            const err = await res.text();
                            alert(err || "Failed to place order!");
                        }
                    })
                    .catch(err => {
                        console.error(err);
                        alert("Server error during checkout.");
                    });
                });
            });
        })
        .catch(() => {
            window.location.href = "/login-page";
        });
    }
});
