package com.gorong.backend.global.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 💡 [핵심 해결책] Security 단에서 CORS 허용 (프론트 Network Error 방지)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable()) // API 서버이므로 CSRF 비활성화
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)) // JWT/Token 방식이므로 세션 안 씀
                .exceptionHandling(ex -> ex.authenticationEntryPoint(new HttpStatusEntryPoint(UNAUTHORIZED)))
                .authorizeHttpRequests(auth -> auth
                        // 브라우저의 OPTIONS(사전 요청)는 무조건 통과시켜야 CORS 에러가 안 납니다.
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // 💡 카카오/네이버 전용 주소 삭제.
                        // 프론트엔드와 맞춰서 v1 로그인/회원가입 API 주소로 수정했습니다.
                        .requestMatchers("/api/public/**", "/api/v1/users/login", "/api/v1/users/signup").permitAll()
                        // 주소popup
                        .requestMatchers("/api/v1/juso/**").permitAll()
                        .requestMatchers("/api/chatbot/**").permitAll()
                        .anyRequest().authenticated() // 나머지는 전부 토큰(Firebase) 있어야 함
                )
                // 우리가 만든 Firebase 필터를 껴넣음
                .addFilterBefore(new FirebaseTokenFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // 💡 프론트엔드의 접근을 허락하는 CORS 디테일 설정
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // 현재는 개발의 편의를 위해 모든 출처("*")를 열어둠
        configuration.setAllowedOrigins(List.of(
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:5173",
                "http://127.0.0.1:5173"
        ));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        // Authorization 헤더를 쓰는 구조라 쿠키 기반 credentials가 필수는 아닙니다.
        configuration.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
