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
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class AppVenueService {

    @Value("${tour.api.service-key}")
    private String tourApiKey;

    private final Map<String, VenueGeo> venueGeoCache = new ConcurrentHashMap<>();

    public record VenueGeo(String id, double lat, double lng, int radius) {}

    public Optional<VenueGeo> findCachedVenueGeo(String venueId) {
        return Optional.ofNullable(venueGeoCache.get(venueId));
    }

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
            Object rawItems = (items == null) ? null : items.get("item");
            List<Map<String, Object>> itemList = new ArrayList<>();
            if (rawItems instanceof List<?> list) {
                for (Object entry : list) {
                    if (entry instanceof Map<?, ?> map) {
                        itemList.add((Map<String, Object>) map);
                    }
                }
            } else if (rawItems instanceof Map<?, ?> map) {
                itemList.add((Map<String, Object>) map);
            }

            List<NearbyVenueResponseDto> result = new ArrayList<>();
            if (itemList != null) {
                for (Map<String, Object> item : itemList) {
                    String id = String.valueOf(item.get("contentid"));
                    double venueLat = Double.parseDouble(String.valueOf(item.get("mapy")));
                    double venueLng = Double.parseDouble(String.valueOf(item.get("mapx")));
                    int geofenceRadius = 150;

                    venueGeoCache.put(id, new VenueGeo(id, venueLat, venueLng, geofenceRadius));

                    result.add(NearbyVenueResponseDto.builder()
                            .id(id)
                            .name(String.valueOf(item.get("title")))
                            .lat(venueLat)
                            .lng(venueLng)
                            .radius(geofenceRadius)
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
