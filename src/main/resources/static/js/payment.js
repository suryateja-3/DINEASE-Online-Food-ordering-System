document.addEventListener("DOMContentLoaded", function () {
    const paymentForm = document.getElementById("paymentForm");
    const orderIdInput = document.getElementById("orderId");
    const amountInput = document.getElementById("amount");
    const paymentMethodSelect = document.getElementById("paymentMethod");

    // Setup tab switcher
    const tabs = document.querySelectorAll(".payment-tab");
    const forms = document.querySelectorAll(".payment-form-box");

    tabs.forEach(tab => {
        tab.addEventListener("click", function () {
            tabs.forEach(t => t.classList.remove("active"));
            forms.forEach(f => f.classList.remove("active"));

            tab.classList.add("active");
            const mode = tab.getAttribute("data-mode");
            document.getElementById(mode + "Form").classList.add("active");

            // Update hidden select
            if (paymentMethodSelect) {
                if (mode === "upi") paymentMethodSelect.value = "UPI";
                if (mode === "card") paymentMethodSelect.value = "Credit Card";
                if (mode === "cash") paymentMethodSelect.value = "Cash at Restaurant";
            }
        });
    });

    if (paymentForm) {
        // Pre-fill fields from session
        const lastOrderId = sessionStorage.getItem("lastOrderId");
        const lastOrderAmount = sessionStorage.getItem("lastOrderAmount");

        if (lastOrderId && orderIdInput) {
            orderIdInput.value = lastOrderId;
            orderIdInput.readOnly = true;
        }
        if (lastOrderAmount && amountInput) {
            amountInput.value = lastOrderAmount;
            amountInput.readOnly = true;
        }

        paymentForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const orderId = parseInt(document.getElementById("orderId").value);
            const amount = parseFloat(document.getElementById("amount").value);
            const paymentMethod = paymentMethodSelect.value;
            const currentTab = document.querySelector(".payment-tab.active").getAttribute("data-mode");

            // Perform tab-specific validation
            if (currentTab === "upi") {
                const upiId = document.getElementById("upiId").value.trim();
                if (!upiId || !upiId.includes("@")) {
                    alert("Please enter a valid UPI ID (e.g. yourname@okaxis).");
                    return;
                }
            } else if (currentTab === "card") {
                const cardNo = document.getElementById("cardNumber").value.replace(/\s+/g, "");
                const expiry = document.getElementById("cardExpiry").value;
                const cvv = document.getElementById("cardCvv").value;

                if (cardNo.length !== 16 || isNaN(cardNo)) {
                    alert("Please enter a valid 16-digit Card Number.");
                    return;
                }
                if (!expiry || !expiry.includes("/")) {
                    alert("Please enter expiration date (MM/YY).");
                    return;
                }
                if (cvv.length !== 3 || isNaN(cvv)) {
                    alert("Please enter a valid 3-digit CVV.");
                    return;
                }
            }

            const payment = {
                orderId: orderId,
                amount: amount,
                paymentMethod: paymentMethod,
                paymentStatus: "SUCCESS"
            };

            fetch("/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payment)
            })
            .then(res => {
                if (res.ok) {
                    alert("Payment Processed Successfully!");
                    sessionStorage.removeItem("lastOrderId");
                    sessionStorage.removeItem("lastOrderAmount");
                    window.location.href = "/orders-page";
                } else {
                    alert("Payment Processing Failed!");
                }
            })
            .catch(error => {
                console.error(error);
                alert("Server Connection Error during payment.");
            });
        });
    }
});
