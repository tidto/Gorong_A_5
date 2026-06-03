package com.gorong.backend.global.security;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import com.gorong.backend.domain.admin.entity.UserBan;
import com.gorong.backend.domain.admin.service.AdminService;
import com.gorong.backend.domain.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class FirebaseTokenFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;
    private final AdminService adminService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(token);
                List<SimpleGrantedAuthority> authorities = new ArrayList<>();

                userRepository.findByFirebaseUid(decodedToken.getUid()).ifPresent(user -> {
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + user.getRoleType().name()));
                    authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
                });

                UserBan activeBan = adminService.getActiveBanByFirebaseUid(decodedToken.getUid());
                if (activeBan != null && shouldBlockByBan(request)) {
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write(String.format(
                            "{\"message\":\"계정 이용이 제한되었습니다.\",\"banReason\":\"%s\",\"appealStatus\":\"%s\"}",
                            escapeJson(activeBan.getBanReason()),
                            activeBan.getAppealStatus().name()
                    ));
                    return;
                }

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(decodedToken, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(authentication);

            } catch (FirebaseAuthException e) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write("Invalid Firebase Token");
                return;
            } catch (Exception e) {
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                response.getWriter().write("Auth server error: " + e.getMessage());
                return;
            }
        }
        filterChain.doFilter(request, response);
    }

    private boolean shouldBlockByBan(HttpServletRequest request) {
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return false;
        }

        String path = request.getRequestURI();
        return !path.startsWith("/api/v1/users/me/ban")
                && !path.startsWith("/api/v1/users/me/appeal")
                && !path.startsWith("/api/v1/users/login");
    }

    private String escapeJson(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
