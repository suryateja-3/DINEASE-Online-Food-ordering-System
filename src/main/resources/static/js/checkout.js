document.addEventListener("DOMContentLoaded", function () {
    const checkoutForm = document.getElementById("checkoutForm");
    const summaryBox = document.getElementById("checkoutSummaryBox");

    if (!checkoutForm) return;

    // Pre-fill date field and restrict past dates
    const dateInput = document.getElementById("arrivalDate");
    if (dateInput) {
        const today = new Date().toISOString().split("T")[0];
        dateInput.min = today;
        dateInput.value = today;
    }

    let cartTotal = 0;
    let couponDiscount = 0;
    let appliedCouponCode = null;
    let walletBalance = 0;
    let walletUsed = 0;
    let currentUser = null;

    function updateBreakdown() {
        const afterCoupon = Math.max(0, cartTotal - couponDiscount);
        const walletApplicable = document.getElementById("useWalletCheckbox").checked;
        walletUsed = 0;

        if (walletApplicable && walletBalance > 0) {
            walletUsed = Math.min(walletBalance, afterCoupon);
        }

        const finalTotal = Math.max(0, afterCoupon - walletUsed);

        document.getElementById("bd_subtotal").textContent = "₹" + cartTotal.toFixed(2);
        document.getElementById("bd_total").textContent = "₹" + finalTotal.toFixed(2);

        const couponRow = document.getElementById("bd_coupon_row");
        if (couponDiscount > 0) {
            couponRow.style.display = "flex";
            document.getElementById("bd_coupon").textContent = "-₹" + couponDiscount.toFixed(2);
        } else {
            couponRow.style.display = "none";
        }

        const walletRow = document.getElementById("bd_wallet_row");
        if (walletUsed > 0) {
            walletRow.style.display = "flex";
            document.getElementById("bd_wallet").textContent = "-₹" + walletUsed.toFixed(2);
            document.getElementById("walletApplyInfo").style.display = "block";
            document.getElementById("walletApplyInfo").textContent = "₹" + walletUsed.toFixed(2) + " will be deducted from your wallet.";
        } else {
            walletRow.style.display = "none";
            document.getElementById("walletApplyInfo").style.display = "none";
        }

        document.getElementById("paymentBreakdown").style.display = "block";
    }

    fetch("/users/me")
        .then(res => { if (!res.ok) throw new Error("Not logged in"); return res.json(); })
        .then(user => {
            currentUser = user;

            // Load wallet balance
            if (user.walletBalance && user.walletBalance > 0) {
                walletBalance = user.walletBalance;
                const walletSection = document.getElementById("walletSection");
                walletSection.style.display = "block";
                document.getElementById("walletBalanceDisplay").textContent = "₹" + walletBalance.toFixed(2);
            }

            // Load cart summary
            return fetch("/carts/user/" + user.id)
                .then(res => res.json())
                .then(data => {
                    if (data.length === 0) {
                        alert("Your cart is empty! Add food items first.");
                        window.location.href = "/cart-page";
                        return;
                    }

                    cartTotal = 0;
                    if (summaryBox) {
                        summaryBox.innerHTML = "";
                        data.forEach(item => {
                            cartTotal += item.totalPrice;
                            summaryBox.innerHTML += `
                                <div class="checkout-summary-item">
                                    <span>${item.foodName} (x${item.quantity})</span>
                                    <span>₹${item.totalPrice.toFixed(2)}</span>
                                </div>
                            `;
                        });
                        summaryBox.innerHTML += `
                            <div class="checkout-summary-item total">
                                <span>Subtotal</span>
                                <span>₹${cartTotal.toFixed(2)}</span>
                            </div>
                        `;
                    }

                    updateBreakdown();

                    // If new user, pre-suggest NEWUSER25
                    if (!user.firstOrderCompleted) {
                        const hint = document.createElement("p");
                        hint.style.cssText = "margin: 0.5rem 0 0; font-size: 0.82rem; color: #22c55e; opacity: 0.9;";
                        hint.textContent = "🎁 First order? Try coupon code: NEWUSER25 for 25% off!";
                        document.getElementById("couponCodeInput").parentNode.appendChild(hint);
                    }
                });
        })
        .catch(() => { window.location.href = "/login-page"; });

    // --- Coupon Apply ---
    document.getElementById("applyCouponBtn").addEventListener("click", function () {
        const code = document.getElementById("couponCodeInput").value.trim().toUpperCase();
        const msgEl = document.getElementById("couponMessage");

        if (!code) {
            msgEl.style.display = "block";
            msgEl.style.color = "#ef4444";
            msgEl.textContent = "Please enter a coupon code.";
            return;
        }

        fetch("/orders/apply-coupon", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ couponCode: code, cartTotal: cartTotal })
        })
        .then(res => res.json())
        .then(data => {
            msgEl.style.display = "block";
            if (data.valid) {
                couponDiscount = data.discount;
                appliedCouponCode = data.couponCode;
                msgEl.style.color = "#22c55e";
                msgEl.textContent = "✓ " + data.message;
                document.getElementById("applyCouponBtn").style.display = "none";
                document.getElementById("removeCouponBtn").style.display = "inline-flex";
                document.getElementById("couponCodeInput").disabled = true;
            } else {
                couponDiscount = 0;
                appliedCouponCode = null;
                msgEl.style.color = "#ef4444";
                msgEl.textContent = "✗ " + data.message;
            }
            updateBreakdown();
        })
        .catch(() => {
            msgEl.style.display = "block";
            msgEl.style.color = "#ef4444";
            msgEl.textContent = "Failed to validate coupon. Try again.";
        });
    });

    // --- Remove Coupon ---
    document.getElementById("removeCouponBtn").addEventListener("click", function () {
        couponDiscount = 0;
        appliedCouponCode = null;
        document.getElementById("couponCodeInput").value = "";
        document.getElementById("couponCodeInput").disabled = false;
        document.getElementById("couponMessage").style.display = "none";
        document.getElementById("applyCouponBtn").style.display = "inline-flex";
        document.getElementById("removeCouponBtn").style.display = "none";
        updateBreakdown();
    });

    // --- Wallet Checkbox ---
    document.getElementById("useWalletCheckbox").addEventListener("change", updateBreakdown);

    // --- Form Submit ---
    checkoutForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const arrivalDate = document.getElementById("arrivalDate").value;
        const arrivalTime = document.getElementById("arrivalTime").value;
        const numberOfPeople = parseInt(document.getElementById("numberOfPeople").value);
        const specialInstructions = document.getElementById("specialInstructions").value.trim();

        if (!arrivalDate || !arrivalTime) {
            alert("Please select both Arrival Date and Time.");
            return;
        }
        if (isNaN(numberOfPeople) || numberOfPeople <= 0) {
            alert("Please enter a valid number of guests.");
            return;
        }

        const selectedDate = new Date(arrivalDate);
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        if (selectedDate < todayDate) {
            alert("Arrival date cannot be in the past!");
            return;
        }

        const useWallet = document.getElementById("useWalletCheckbox").checked;
        const walletToUse = useWallet ? walletUsed : 0;

        const order = {
            userId: currentUser.id,
            arrivalDate: arrivalDate,
            arrivalTime: arrivalTime,
            numberOfPeople: numberOfPeople,
            specialInstructions: specialInstructions,
            orderStatus: "Pending",
            deliveryAddress: "Dine-In Reservation",
            appliedCouponCode: appliedCouponCode || null,
            walletDiscountUsed: walletToUse
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
