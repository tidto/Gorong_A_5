package com.gorong.backend.domain.app.service;

import com.gorong.backend.domain.app.dto.NearbyVenueResponseDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AppVenueService {

    @Value("${tour.api.service-key}")
    private String tourApiKey;

    // TourAPI 호출 후 앱에 반환 (키는 백엔드에만 존재)
    @SuppressWarnings("unchecked")
    public List<NearbyVenueResponseDto> getNearbyVenues(double lat, double lng, int radius) {
        try {
            String url = UriComponentsBuilder
                    .fromUriString("https://apis.data.go.kr/B551011/KorService1/locationBasedList1")
                    .queryParam("serviceKey", tourApiKey)
                    .queryParam("numOfRows", 20)
                    .queryParam("pageNo", 1)
                    .queryParam("MobileOS", "ETC")
                    .queryParam("MobileApp", "Gorong")
                    .queryParam("_type", "json")
                    .queryParam("listYN", "Y")
                    .queryParam("arrange", "A")
                    .queryParam("mapX", lng)
                    .queryParam("mapY", lat)
                    .queryParam("radius", radius)
                    .queryParam("contentTypeId", 15)  // 축제/행사
                    .build()
                    .toUriString();

            RestTemplate restTemplate = new RestTemplate();
            Map<String, Object> response = restTemplate.getForObject(new URI(url), Map.class);

            Map<String, Object> body = (Map<String, Object>)
                    ((Map<String, Object>) response.get("response")).get("body");
            Map<String, Object> items = (Map<String, Object>) body.get("items");
            List<Map<String, Object>> itemList = (List<Map<String, Object>>) items.get("item");

            List<NearbyVenueResponseDto> result = new ArrayList<>();
            if (itemList != null) {
                for (Map<String, Object> item : itemList) {
                    result.add(NearbyVenueResponseDto.builder()
                            .id(String.valueOf(item.get("contentid")))
                            .name(String.valueOf(item.get("title")))
                            .lat(Double.parseDouble(String.valueOf(item.get("mapy"))))
                            .lng(Double.parseDouble(String.valueOf(item.get("mapx"))))
                            .radius(150)
                            .address(String.valueOf(item.get("addr1")))
                            .category(String.valueOf(item.get("cat1")))
                            .imageUrl(String.valueOf(item.getOrDefault("firstimage", "")))
                            .build());
                }
            }
            return result;
        } catch (Exception e) {
            log.error("TourAPI 호출 실패: {}", e.getMessage());
            return new ArrayList<>();
        }
    }
}