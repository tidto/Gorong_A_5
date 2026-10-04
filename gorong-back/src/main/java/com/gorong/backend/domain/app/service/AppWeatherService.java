package com.gorong.backend.domain.app.service;

import lombok.extern.slf4j.Slf4j;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * OpenWeatherMap 프록시.
 * - API 키는 서버(환경변수 WEATHER_API_KEY)에만 두고, 앱에는 노출하지 않는다.
 * - 좌표를 소수점 2자리(약 1km)로 묶어서 10분간 메모리에 캐시한다.
 */
@Slf4j
@Service
public class AppWeatherService {

    private static final String API_URL = "https://api.openweathermap.org/data/2.5/weather";
    private static final long CACHE_TTL_MS = 10 * 60 * 1000L;

    @Value("${weather.api.key:}")
    private String apiKey;

    private final RestTemplate restTemplate = createRestTemplate();
    private final Map<String, CachedWeather> cache = new ConcurrentHashMap<>();

    private static RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(3));
        factory.setReadTimeout(Duration.ofSeconds(3));
        return new RestTemplate(factory);
    }

    public Map<String, Object> getWeather(double lat, double lng) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "날씨 API 키가 설정되지 않았습니다.");
        }

        String cacheKey = String.format(Locale.US, "%.2f,%.2f", lat, lng);
        long now = System.currentTimeMillis();
        CachedWeather cached = cache.get(cacheKey);
        if (cached != null && now - cached.createdAt() < CACHE_TTL_MS) {
            return cached.value();
        }

        String url = String.format(Locale.US, "%s?lat=%.4f&lon=%.4f&appid=%s", API_URL, lat, lng, apiKey);

        try {
            String res = restTemplate.getForObject(url, String.class);
            JSONObject json = new JSONObject(res);
            JSONArray weather = json.optJSONArray("weather");
            if (weather == null || weather.length() == 0) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "날씨 정보를 받지 못했습니다.");
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("main", weather.getJSONObject(0).optString("main", ""));
            result.put("city", json.optString("name", ""));

            cache.put(cacheKey, new CachedWeather(result, now));
            return result;

        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            // ⚠️ 예외 메시지에는 URL(=API 키)이 들어 있을 수 있으므로 클래스 이름만 남긴다
            log.warn("날씨 API 호출 실패: {}", e.getClass().getSimpleName());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "날씨 조회에 실패했습니다.");
        }
    }

    private record CachedWeather(Map<String, Object> value, long createdAt) {}
}