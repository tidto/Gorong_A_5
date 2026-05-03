package com.gorong.backend.domain.juso.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/api/v1/juso")
@RequiredArgsConstructor
public class JusoController {

    @Value("${juso.api.key}")
    private String jusoApiKey;

    @GetMapping("/search")
    public ResponseEntity<?> search(@RequestParam String keyword,
                                    @RequestParam(defaultValue = "1") int page,
                                    @RequestParam(defaultValue = "10") int size) {
        String url = "https://business.juso.go.kr/addrlink/addrLinkApi.do" +
                "?currentPage=" + page +
                "&countPerPage=" + size +
                "&keyword=" + keyword +
                "&confmKey=" + jusoApiKey +
                "&resultType=json";

        RestTemplate restTemplate = new RestTemplate();
        Object result = restTemplate.getForObject(url, Object.class);
        return ResponseEntity.ok(result);
    }
}