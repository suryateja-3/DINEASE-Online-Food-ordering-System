document.addEventListener("DOMContentLoaded", function () {
    // Check authentication status on page load to update navbar
    checkAuthStatus();

    // ==========================
    // Register Form Handling
    // ==========================
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", function (event) {
            event.preventDefault();
            
            const name = document.getElementById("name").value.trim();
            const email = document.getElementById("email").value.trim();
            const phone = document.getElementById("phone").value.trim();
            const address = document.getElementById("address").value.trim();
            const password = document.getElementById("password").value;

            // Client-side Validation
            if (!validateEmail(email)) {
                alert("Please enter a valid email address.");
                return;
            }
            if (!validatePhone(phone)) {
                alert("Please enter a valid 10-digit phone number.");
                return;
            }
            if (password.length < 6) {
                alert("Password must be at least 6 characters long.");
                return;
            }

            const user = { name, email, phone, address, password, role: "USER" };

            fetch("/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(user)
            })
            .then(async response => {
                const text = await response.text();
                if (response.ok) {
                    alert("Registration Successful! Please login.");
                    window.location.href = "/login-page";
                } else {
                    alert(text || "Registration Failed!");
                }
            })
            .catch(error => {
                console.error(error);
                alert("Server Error! Unable to complete registration.");
            });
        });
    }

    // ==========================
    // Login Form Handling
    // ==========================
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;

            if (!validateEmail(email)) {
                alert("Please enter a valid email.");
                return;
            }

            fetch("/users/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            })
            .then(async response => {
                if (response.ok) {
                    const user = await response.json();
                    sessionStorage.setItem("user", JSON.stringify(user));
                    alert("Welcome back, " + user.name + "!");
                    if (user.role === "ADMIN") {
                        window.location.href = "/admin-page";
                    } else {
                        window.location.href = "/";
                    }
                } else {
                    const errText = await response.text();
                    alert(errText || "Invalid credentials!");
                }
            })
            .catch(error => {
                console.error(error);
                alert("Login Error! Connection refused.");
            });
        });
    }

    // ==========================
    // Profile Page Handling
    // ==========================
    const profileContainer = document.getElementById("profileContainer");
    if (profileContainer) {
        fetch("/users/me")
        .then(response => {
            if (!response.ok) throw new Error("Not authenticated");
            return response.json();
        })
        .then(user => {
            document.getElementById("profileName").value = user.name;
            document.getElementById("profileEmail").value = user.email;
            document.getElementById("profilePhone").value = user.phone;
            document.getElementById("profileAddress").value = user.address;
            document.getElementById("userIdDisplay").textContent = user.id;

            const profileForm = document.getElementById("profileForm");
            profileForm.addEventListener("submit", function (e) {
                e.preventDefault();
                
                const updatedUser = {
                    name: document.getElementById("profileName").value.trim(),
                    email: document.getElementById("profileEmail").value.trim(),
                    phone: document.getElementById("profilePhone").value.trim(),
                    address: document.getElementById("profileAddress").value.trim()
                };

                const newPassword = document.getElementById("profilePassword").value;
                if (newPassword && newPassword.trim().length > 0) {
                    if (newPassword.length < 6) {
                        alert("Password must be at least 6 characters.");
                        return;
                    }
                    updatedUser.password = newPassword;
                }

                fetch("/users/" + user.id, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updatedUser)
                })
                .then(res => {
                    if (res.ok) {
                        alert("Profile Updated Successfully!");
                        window.location.reload();
                    } else {
                        alert("Failed to update profile!");
                    }
                });
            });
        })
        .catch(err => {
            window.location.href = "/login-page";
        });
    }
});

// Helper validation functions
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^[0-9]{10}$/;
    return re.test(phone);
}

// Check session status and update navigation bar dynamically
function checkAuthStatus() {
    fetch("/users/me")
    .then(response => {
        if (!response.ok) {
            sessionStorage.removeItem("user");
            updateNavUI(null);
            // Redirect from protected pages to login
            const protectedPages = ["/profile-page", "/cart-page", "/checkout-page", "/payment-page", "/orders-page", "/admin-page"];
            if (protectedPages.includes(window.location.pathname)) {
                window.location.href = "/login-page";
            }
            return;
        }
        return response.json();
    })
    .then(user => {
        if (user) {
            sessionStorage.setItem("user", JSON.stringify(user));
            updateNavUI(user);
        }
    })
    .catch(err => console.log("Session verify error: ", err));
}

function updateNavUI(user) {
    const authLinksContainer = document.getElementById("authLinks");
    if (!authLinksContainer) return;

    if (user) {
        let adminTab = user.role === "ADMIN" ? `<a href="/admin-page" class="navbar-link">Admin Panel</a>` : "";
        authLinksContainer.innerHTML = `
            <a href="/profile-page" class="navbar-link">👤 ${user.name}</a>
            ${adminTab}
            <a href="#" id="logoutBtn" class="navbar-link" style="color: #ef4444;">Logout</a>
        `;
        
        document.getElementById("logoutBtn").addEventListener("click", function (e) {
            e.preventDefault();
            logout();
        });
    } else {
        authLinksContainer.innerHTML = `
            <a href="/login-page" class="navbar-link">Login</a>
            <a href="/register-page" class="navbar-link btn btn-primary" style="color: white; padding: 0.4rem 1rem;">Register</a>
        `;
    }
}

function logout() {
    fetch("/users/logout", { method: "POST" })
    .then(() => {
        sessionStorage.removeItem("user");
        alert("Logged out successfully!");
        window.location.href = "/";
    });
}
