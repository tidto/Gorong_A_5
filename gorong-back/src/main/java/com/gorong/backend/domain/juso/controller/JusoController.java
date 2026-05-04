package com.gorong.backend.domain.juso.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.net.URI;

@RestController
@RequestMapping("/api/v1/juso")
@RequiredArgsConstructor
public class JusoController {

    @Value("${juso.api.key}")
    private String jusoApiKey;

    @GetMapping("/search")
    public ResponseEntity<?> search(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {

        try {

            // 2중 인코딩으로 인식. 특수문자로 넘어감
            // String encodedKeyword = URLEncoder.encode(keyword, StandardCharsets.UTF_8);
            // URI 직접 생성 (인코딩 직접 제어)
            String rawUrl = "https://business.juso.go.kr/addrlink/addrLinkApi.do"
                    + "?currentPage=" + page
                    + "&countPerPage=" + size
                    + "&keyword=" + URLEncoder.encode(keyword, StandardCharsets.UTF_8)
                    + "&confmKey=" + jusoApiKey
                    + "&resultType=json";

            RestTemplate restTemplate = new RestTemplate();
            // getForObject(String) 대신 getForObject(URI) 사용 → 추가 인코딩 없음
            Object result = restTemplate.getForObject(new URI(rawUrl), Object.class);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("주소 검색 실패: " + e.getMessage());
        }
    }
}