package com.gorong.backend.domain.app.controller;

import com.gorong.backend.domain.app.service.AppWeatherService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/app/weather")
@RequiredArgsConstructor
public class AppWeatherController {

    private final AppWeatherService appWeatherService;

    // 앱에서 위경도를 보내면 현재 날씨를 반환 (OpenWeatherMap 호출은 백엔드가 처리)
    // 예) GET /api/v1/app/weather?lat=35.87&lng=128.60  →  {"main":"Clear","city":"Ipseokdong"}
    // SecurityConfig의 anyRequest().authenticated()에 걸리므로 Firebase 토큰이 있어야 호출 가능
    @GetMapping
    public ResponseEntity<Map<String, Object>> getWeather(
            @RequestParam double lat,
            @RequestParam double lng) {
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "잘못된 좌표입니다.");
        }
        return ResponseEntity.ok(appWeatherService.getWeather(lat, lng));
    }
}