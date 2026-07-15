let currentUserId = null;

document.addEventListener("DOMContentLoaded", function () {
    fetch("/users/me")
        .then(res => { if (!res.ok) throw new Error("Not logged in"); return res.json(); })
        .then(user => {
            currentUserId = user.id;
            document.getElementById("walletUserName").textContent = user.name || "User";

            const balance = user.walletBalance || 0;
            document.getElementById("walletHeroAmount").textContent = "₹" + balance.toFixed(2);

            loadTransactions(user.id);
            loadCoupons(user.id, user.firstOrderCompleted);
            loadReferral(user);
        })
        .catch(() => { window.location.href = "/login-page"; });
});

function switchTab(tabName, btn) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));
    document.getElementById("tab-" + tabName).classList.add("active");
    btn.classList.add("active");
}

function loadTransactions(userId) {
    const list = document.getElementById("transactionList");
    fetch("/users/" + userId + "/wallet")
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) {
                list.innerHTML = `<div class="empty-state"><div class="icon">📄</div><p>No transactions yet. Place your first order to get started!</p></div>`;
                return;
            }
            list.innerHTML = "";
            data.sort((a, b) => new Date(b.transactionTime) - new Date(a.transactionTime));
            data.forEach(tx => {
                const isCredit = tx.type === "CREDIT";
                const dt = tx.transactionTime ? new Date(tx.transactionTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "--";
                list.innerHTML += `
                    <div class="tx-item">
                        <div style="display: flex; align-items: center; gap: 0.85rem;">
                            <div class="tx-icon ${isCredit ? 'tx-credit' : 'tx-debit'}">
                                ${isCredit ? '⬆️' : '⬇️'}
                            </div>
                            <div>
                                <p style="margin: 0; font-weight: 600; font-size: 0.92rem;">${tx.description || (isCredit ? 'Credit' : 'Debit')}</p>
                                <p style="margin: 0; font-size: 0.78rem; opacity: 0.6;">${dt}</p>
                            </div>
                        </div>
                        <span class="${isCredit ? 'tx-amount-credit' : 'tx-amount-debit'}">
                            ${isCredit ? '+' : '-'}₹${(tx.amount || 0).toFixed(2)}
                        </span>
                    </div>
                `;
            });
        })
        .catch(() => {
            list.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Failed to load transactions.</p></div>`;
        });
}

function loadCoupons(userId, firstOrderCompleted) {
    const grid = document.getElementById("couponGrid");
    fetch("/users/" + userId + "/coupons")
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) {
                grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="icon">🎫</div><p>No coupons available right now.</p></div>`;
                return;
            }
            grid.innerHTML = "";
            data.forEach(coupon => {
                const isUsed = coupon.used === true;
                const expiry = coupon.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString("en-IN") : "N/A";
                const isExpired = coupon.expiryDate && new Date(coupon.expiryDate) < new Date();
                let badgeText = isUsed ? "Used" : isExpired ? "Expired" : "Available";
                let badgeClass = (isUsed || isExpired) ? "used-badge" : "";
                grid.innerHTML += `
                    <div class="coupon-card ${(isUsed || isExpired) ? 'used' : ''}">
                        <div class="coupon-badge ${badgeClass}">${badgeText}</div>
                        <div class="coupon-code">${coupon.code || coupon.couponCode || 'CODE'}</div>
                        <p style="font-size: 1.15rem; font-weight: 700; margin: 0.5rem 0 0.25rem; color: #a5b4fc;">
                            ${coupon.discountPercentage ? coupon.discountPercentage + '% OFF' : coupon.description || 'Discount'}
                        </p>
                        ${coupon.maxDiscount ? `<p style="font-size: 0.8rem; opacity: 0.7; margin: 0;">Max savings: ₹${coupon.maxDiscount}</p>` : ''}
                        ${coupon.minOrderAmount ? `<p style="font-size: 0.8rem; opacity: 0.7; margin: 0.1rem 0;">Min order: ₹${coupon.minOrderAmount}</p>` : ''}
                        <p style="font-size: 0.78rem; opacity: 0.5; margin: 0.5rem 0 0;">Expires: ${expiry}</p>
                        ${(!isUsed && !isExpired) ? `
                            <button onclick="copyCoupon('${coupon.code || coupon.couponCode}')" class="btn btn-secondary" style="width: 100%; margin-top: 0.75rem; padding: 0.45rem;">
                                Copy Code
                            </button>` : ''}
                    </div>
                `;
            });
        })
        .catch(() => {
            grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="icon">⚠️</div><p>Failed to load coupons.</p></div>`;
        });
}

function loadReferral(user) {
    const codeEl = document.getElementById("referralCodeDisplay");
    const statsEl = document.getElementById("referralStats");

    const code = user.referralCode || "Generating...";
    codeEl.textContent = code;

    // Show stats chips
    statsEl.innerHTML = `
        <div class="stat-chip">💰 ₹200 per referral reward</div>
        <div class="stat-chip">👥 Unlimited referrals</div>
    `;

    if (user.referredByCode) {
        statsEl.innerHTML += `<div class="stat-chip" style="border-color: rgba(34,197,94,0.3); color: #22c55e;">✓ You were referred by someone</div>`;
    }
}

function copyReferralCode() {
    const code = document.getElementById("referralCodeDisplay").textContent;
    if (code && code !== "Generating..." && code !== "Loading...") {
        navigator.clipboard.writeText(code).then(() => {
            showCopyToast("Referral code copied!");
        }).catch(() => {
            prompt("Copy your referral code:", code);
        });
    }
}

function copyCoupon(code) {
    navigator.clipboard.writeText(code).then(() => {
        showCopyToast("Coupon code " + code + " copied!");
    }).catch(() => {
        prompt("Copy this coupon code:", code);
    });
}

function showCopyToast(msg) {
    let toast = document.getElementById("copyToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "copyToast";
        toast.style.cssText = "position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); background: #22c55e; color: #fff; padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 600; font-size: 0.9rem; z-index: 9999; box-shadow: 0 8px 24px rgba(34,197,94,0.4); transition: opacity 0.3s;";
        document.body.appendChild(toast);
    }
    toast.textContent = "✓ " + msg;
    toast.style.opacity = "1";
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => { toast.style.opacity = "0"; }, 2500);
}
