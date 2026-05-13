package com.gorong.backend.global.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 1. CORS 설정 적용
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // 2. CSRF 비활성화 (POST, PUT 요청 허용을 위해 필수)
                .csrf(csrf -> csrf.disable())

                // 3. JWT 방식이므로 세션 사용 안 함
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> auth
                        // 브라우저의 OPTIONS(Preflight) 요청은 무조건 통과
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // ✅ [수정] 모집 게시판 관련 모든 API를 테스트를 위해 일시적으로 전면 허용
                        // 기존에 .authenticated()로 되어있던 POST, PUT을 .permitAll()로 변경합니다.
                        .requestMatchers("/api/groups/**").permitAll()

                        // 기존 허용 목록들
                        .requestMatchers("/api/public/**", "/api/v1/users/login", "/api/v1/users/signup").permitAll()
                        .requestMatchers("/api/v1/juso/**").permitAll()
                        .requestMatchers("/api/v1/app/venues/**").permitAll()
                        .requestMatchers("/ws-chat/**").permitAll()

                        // 관리자 권한
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")

                        // 그 외의 모든 요청은 인증 필요
                        .anyRequest().authenticated()
                )
                // 4. Firebase 필터 추가
                .addFilterBefore(new FirebaseTokenFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // 💡 프론트엔드의 접근을 허락하는 CORS 디테일 설정
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // 모든 도메인 허용 (개발 환경)
        configuration.setAllowedOriginPatterns(List.of("*"));
        // 모든 HTTP 메서드 허용
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        // 모든 헤더 허용
        configuration.setAllowedHeaders(List.of("*"));
        // 쿠키/인증 정보 허용
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // 모든 경로에 위 설정 적용
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}