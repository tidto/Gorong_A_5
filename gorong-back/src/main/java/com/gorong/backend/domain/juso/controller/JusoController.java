package com.gorong.backend.domain.juso.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

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
            String encodedKeyword = URLEncoder.encode(keyword, StandardCharsets.UTF_8);

            String url = "https://business.juso.go.kr/addrlink/addrLinkApi.do"
                    + "?currentPage=" + page
                    + "&countPerPage=" + size
                    + "&keyword=" + encodedKeyword
                    + "&confmKey=" + jusoApiKey
                    + "&resultType=json";

            RestTemplate restTemplate = new RestTemplate();
            Object result = restTemplate.getForObject(url, Object.class);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("주소 검색 실패: " + e.getMessage());
        }
    }
}