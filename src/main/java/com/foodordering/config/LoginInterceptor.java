package com.foodordering.config;

import com.foodordering.model.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class LoginInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        HttpSession session = request.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("currentUser") : null;
        String uri = request.getRequestURI();

        // 1. Admin Page Protection
        if (uri.startsWith("/admin-page")) {
            if (currentUser == null) {
                response.sendRedirect("/login-page");
                return false;
            }
            if (!"ADMIN".equalsIgnoreCase(currentUser.getRole())) {
                response.sendRedirect("/");
                return false;
            }
            return true;
        }

        // 2. Protected User Pages Protection
        if (uri.equals("/profile-page") || 
            uri.equals("/cart-page") || 
            uri.equals("/checkout-page") || 
            uri.equals("/payment-page") || 
            uri.equals("/orders-page")) {
            
            if (currentUser == null) {
                response.sendRedirect("/login-page");
                return false;
            }
            return true;
        }

        return true;
    }
}
