document.addEventListener("DOMContentLoaded", function () {
    loadOrders();
});

function loadOrders() {
    const orderContainer = document.getElementById("orderContainer");
    if (!orderContainer) return;

    fetch("/users/me")
    .then(response => {
        if (!response.ok) throw new Error("Not logged in");
        return response.json();
    })
    .then(user => {
        fetch("/orders/user/" + user.id)
        .then(res => res.json())
        .then(data => {
            orderContainer.innerHTML = "";
            if (data.length === 0) {
                orderContainer.innerHTML = `
                    <div style="text-align: center; padding: 4rem 2rem;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">📦</div>
                        <h2>No Dine-in Bookings Found</h2>
                        <br>
                        <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Pre-order some food and book your table now!</p>
                        <a href="/restaurants-page" class="btn btn-primary">Browse Restaurants</a>
                    </div>
                `;
                return;
            }

            // Sort orders descending by ID
            data.sort((a, b) => b.id - a.id);

            data.forEach(order => {
                const prepTime = order.estimatedPreparationTime ? order.estimatedPreparationTime : 15;
                const arrivalDate = order.arrivalDate ? order.arrivalDate : "Today";
                const instructions = order.specialInstructions ? order.specialInstructions : "None";
                const guests = order.numberOfPeople ? order.numberOfPeople : 1;

                // Create placeholder card structure first
                const cardId = "order-card-" + order.id;
                orderContainer.innerHTML += `
                    <div class="order-card animate-fade-in" id="${cardId}">
                        <div class="order-card-header">
                            <span class="order-card-title">Order #${order.id}</span>
                            <span id="order-restaurant-${order.id}" style="font-weight: 700; color: var(--primary-color);">Loading restaurant...</span>
                        </div>
                        <div class="order-card-body">
                            <div class="order-info-grid">
                                <div class="order-info-item">
                                    <div class="order-info-label">DINE-IN ARRIVAL</div>
                                    <div class="order-info-value">${arrivalDate} at ${order.arrivalTime}</div>
                                </div>
                                <div class="order-info-item">
                                    <div class="order-info-label">GUESTS</div>
                                    <div class="order-info-value">👥 ${guests} People</div>
                                </div>
                                <div class="order-info-item">
                                    <div class="order-info-label">PREPARATION TIME</div>
                                    <div class="order-info-value">🕒 ${prepTime} mins</div>
                                </div>
                                <div class="order-info-item">
                                    <div class="order-info-label">GRAND TOTAL</div>
                                    <div class="order-info-value" style="color: var(--primary-color); font-size: 1.15rem;">₹${order.totalAmount.toFixed(2)}</div>
                                </div>
                            </div>
                            
                            <div class="order-info-item" style="margin-bottom: 1.5rem;">
                                <div class="order-info-label">ORDERED DISHES</div>
                                <div class="order-info-value" style="font-weight: 600; font-size: 1rem;">${order.itemsText || "Food Menu items"}</div>
                            </div>

                            <div class="order-info-item" style="margin-bottom: 1.5rem;">
                                <div class="order-info-label">SPECIAL INSTRUCTIONS</div>
                                <div style="font-size: 0.9rem; color: var(--text-muted); font-style: italic;">"${instructions}"</div>
                            </div>

                            <div class="order-info-item">
                                <div class="order-info-label">PAYMENT CONFIRMATION</div>
                                <div id="order-payment-${order.id}" class="order-info-value" style="color: var(--warning-color);">Checking payment...</div>
                            </div>
                            
                            <!-- Timeline Status Tracker -->
                            ${getTimelineHTML(order.orderStatus)}
                        </div>
                    </div>
                `;

                // Fetch Restaurant details
                if (order.restaurantId) {
                    fetch("/restaurants/" + order.restaurantId)
                    .then(r => r.json())
                    .then(rest => {
                        document.getElementById("order-restaurant-" + order.id).textContent = "🍽️ " + rest.restaurantName;
                    })
                    .catch(() => {
                        document.getElementById("order-restaurant-" + order.id).textContent = "🍽️ Restaurant";
                    });
                }

                // Fetch Payment status details
                fetch("/payments/order/" + order.id)
                .then(pr => {
                    if (!pr.ok) throw new Error();
                    return pr.json();
                })
                .then(payment => {
                    const payEl = document.getElementById("order-payment-" + order.id);
                    if (payment && payment.paymentStatus === "SUCCESS") {
                        payEl.innerHTML = `<span style="color: var(--success-color);">🟢 PAID via ${payment.paymentMethod}</span>`;
                    } else {
                        payEl.innerHTML = `<span style="color: var(--danger-color);">🔴 Unpaid / Payment Pending</span>`;
                    }
                })
                .catch(() => {
                    document.getElementById("order-payment-" + order.id).innerHTML = `<span style="color: var(--text-muted);">🟡 Pay at Restaurant</span>`;
                });
            });
        });
    })
    .catch(() => {
        window.location.href = "/login-page";
    });
}

function getTimelineHTML(status) {
    status = status ? status.toLowerCase() : "pending";
    
    if (status === "cancelled") {
        return `
            <div class="status-timeline">
                <div class="timeline-step completed">
                    <div class="step-bullet">✓</div>
                    <div class="step-label">Pending</div>
                </div>
                <div class="timeline-step cancelled">
                    <div class="step-bullet">✗</div>
                    <div class="step-label">Cancelled</div>
                </div>
            </div>
        `;
    }

    const steps = ["pending", "preparing", "ready", "completed"];
    const labels = ["Pending", "Preparing", "Ready", "Completed"];
    
    let activeIdx = steps.indexOf(status);
    if (activeIdx === -1) activeIdx = 0; // Default to pending
    
    let stepsHTML = "";
    for (let i = 0; i < steps.length; i++) {
        let stepClass = "";
        let bullet = i + 1;
        if (i < activeIdx) {
            stepClass = "completed";
            bullet = "✓";
        } else if (i === activeIdx) {
            stepClass = "active";
        }
        
        stepsHTML += `
            <div class="timeline-step ${stepClass}">
                <div class="step-bullet">${bullet}</div>
                <div class="step-label">${labels[i]}</div>
            </div>
        `;
    }

    return `
        <div class="status-timeline">
            ${stepsHTML}
        </div>
    `;
}
