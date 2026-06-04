package com.gorong.backend.global.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final FirebaseTokenFilter firebaseTokenFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 💡 [핵심 해결책] Security 단에서 CORS 허용 (프론트 Network Error 방지)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable()) // API 서버이므로 CSRF 비활성화
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)) // JWT/Token 방식이므로 세션 안 씀
                .authorizeHttpRequests(auth -> auth
                        // 브라우저의 OPTIONS(사전 요청)는 무조건 통과시켜야 CORS 에러가 안 납니다.
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // Spring 기본 에러 디스패치 경로는 인증 없이 열어둬야 실제 예외 원인이 가려지지 않습니다.
                        .requestMatchers("/error", "/error/**").permitAll()

                        // 💡 카카오/네이버 전용 주소 삭제.
                        // 프론트엔드와 맞춰서 v1 로그인/회원가입 API 주소로 수정했습니다.
                        .requestMatchers("/api/public/**", "/api/v1/users/login", "/api/v1/users/signup", "/api/v1/auth/github/login").permitAll()
                        // 주소popup
                        .requestMatchers("/api/v1/juso/**").permitAll()
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                        // app 엔드포인트
                        .requestMatchers(
                                "/api/v1/users/login",
                                "/api/v1/users/signup",
                                "/api/v1/auth/github/login",
                                "/api/v1/juso/**",
                                "/api/v1/app/venues/**"   // ← 추가 (행사 조회는 비로그인도 가능)
                        ).permitAll()

                        .requestMatchers("/api/chatbot/**").permitAll()
                        // 💡 [추가] 모집 게시판 관련 API 허용 (조회는 비로그인도 가능하게)
                        .requestMatchers("/api/groups/**").permitAll()
                        
                        // 💬 웹소켓(채팅) 엔드포인트 허용
                        // minihome — Spring Security는 통과, /me/** 는 Controller에서 Firebase userId 검증
                        .requestMatchers("/api/minihomes/**").permitAll()
                        .requestMatchers("/api/ws-chat/**","/ws-chat/**" ).permitAll()
                        .requestMatchers("/api/chat/**").permitAll()
                        .requestMatchers("/api/public-chat/**").permitAll()
                        //행사 참여 이력 API
                        .requestMatchers("/api/event-participation/**").authenticated()
                                       
                        // anyRequest는 항상 마지막
                        .anyRequest().authenticated() // 나머지는 전부 토큰(Firebase) 있어야 함
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType("application/json;charset=UTF-8");
                            response.getWriter().write("{\"message\":\"인증이 필요합니다. Authorization Bearer 토큰을 확인해 주세요.\"}");
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            String uri = request.getRequestURI();
                            // 미니홈 API: 익명 403 대신 401로 안내 (프론트 토큰 누락과 구분)
                            if (uri != null && uri.startsWith("/api/minihomes")) {
                                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                                response.setContentType("application/json;charset=UTF-8");
                                response.getWriter().write(
                                        "{\"message\":\"미니홈 API는 Firebase 로그인 후 Bearer 토큰이 필요합니다.\"}"
                                );
                                return;
                            }
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType("application/json;charset=UTF-8");
                            response.getWriter().write("{\"message\":\"접근 권한이 없습니다.\"}");
                        })
                )
                // 우리가 만든 Firebase 필터를 껴넣음
                .addFilterBefore(firebaseTokenFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // 💡 프론트엔드의 접근을 허락하는 CORS 디테일 설정
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // 현재는 개발의 편의를 위해 모든 출처("*")를 열어둠
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
