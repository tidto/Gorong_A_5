package com.gorong.backend.global.security;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.Collections;

public class FirebaseTokenFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                // ⭐️ 핵심: 토큰을 까서 보물상자(decodedToken)를 얻어냅니다.
                FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(token);

                // 💡 [수정됨] UID 글자 하나만 넘기는 게 아니라, 토큰 전체(decodedToken)를 Principal(주체)로 넘깁니다!
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(decodedToken, null, Collections.emptyList());
                SecurityContextHolder.getContext().setAuthentication(authentication);

            } catch (FirebaseAuthException e) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write("Invalid Firebase Token");
                return;
            } catch (Exception e) {
                // Firebase Admin SDK 초기화 실패 등 예상 못한 에러 처리
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                response.getWriter().write("Auth server error: " + e.getMessage());
                return;
            }
        }
        filterChain.doFilter(request, response);
    }
}