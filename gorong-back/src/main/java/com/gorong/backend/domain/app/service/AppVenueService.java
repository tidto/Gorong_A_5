package com.gorong.backend.domain.app.service;

import com.gorong.backend.domain.app.dto.NearbyVenueResponseDto;
import com.gorong.backend.domain.event.entity.Event;
import com.gorong.backend.domain.event.repository.EventRepository;
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

    private final EventRepository eventRepository;
    private final Map<String, VenueGeo> venueGeoCache = new ConcurrentHashMap<>();

    public record VenueGeo(String id, double lat, double lng, int radius) {}

    public Optional<VenueGeo> findCachedVenueGeo(String venueId) {
        return Optional.ofNullable(venueGeoCache.get(venueId));
    }

    public Optional<VenueGeo> resolveVenueGeo(String venueId) {
        if (venueId == null || venueId.isBlank()) {
            return Optional.empty();
        }

        String normalizedVenueId = venueId.trim();

        // 1) 메모리 캐시 확인
        VenueGeo cached = venueGeoCache.get(normalizedVenueId);
        if (cached != null) {
            return Optional.of(cached);
        }

        // 2) DB(events 테이블) 조회
        try {
            Long eventId = Long.parseLong(normalizedVenueId);
            Optional<VenueGeo> fromDb = eventRepository.findById(eventId)
                    .flatMap(this::toVenueGeo);
            if (fromDb.isPresent()) {
                venueGeoCache.put(normalizedVenueId, fromDb.get());
                return fromDb;
            }
        } catch (NumberFormatException e) {
            // venueId가 숫자가 아닌 경우 DB 조회 스킵
        }

        // 3) DB에도 없으면 TourAPI 단건 조회 (서버 재시작 후 캐시 소실 대응)
        Optional<VenueGeo> fromApi = fetchVenueGeoFromTourApi(normalizedVenueId);
        fromApi.ifPresent(geo -> venueGeoCache.put(normalizedVenueId, geo));
        return fromApi;
    }

    /**
     * TourAPI detailCommon1으로 단건 좌표 조회.
     * 캐시/DB에 없을 때 폴백으로 사용.
     */
    @SuppressWarnings("unchecked")
    private Optional<VenueGeo> fetchVenueGeoFromTourApi(String venueId) {
        try {
            Long.parseLong(venueId);
        } catch (NumberFormatException e) {
            return Optional.empty();
        }

        try {
            String url = UriComponentsBuilder
                    .fromUriString("https://apis.data.go.kr/B551011/KorService1/detailCommon1")
                    .queryParam("serviceKey", tourApiKey)
                    .queryParam("contentId", venueId)
                    .queryParam("MobileOS", "ETC")
                    .queryParam("MobileApp", "Gorong")
                    .queryParam("_type", "json")
                    .queryParam("defaultYN", "Y")
                    .queryParam("firstImageYN", "N")
                    .queryParam("areacodeYN", "N")
                    .queryParam("addrinfoYN", "N")
                    .queryParam("mapinfoYN", "Y")
                    .queryParam("overviewYN", "N")
                    .build()
                    .toUriString();

            RestTemplate restTemplate = new RestTemplate();
            Map<String, Object> response = restTemplate.getForObject(new URI(url), Map.class);

            Map<String, Object> body = (Map<String, Object>)
                    ((Map<String, Object>) response.get("response")).get("body");
            Map<String, Object> items = (Map<String, Object>) body.get("items");
            if (items == null) return Optional.empty();

            Object rawItem = items.get("item");
            Map<String, Object> item = null;
            if (rawItem instanceof List<?> list && !list.isEmpty()) {
                item = (Map<String, Object>) list.get(0);
            } else if (rawItem instanceof Map<?, ?> m) {
                item = (Map<String, Object>) m;
            }
            if (item == null) return Optional.empty();

            Object mapxObj = item.get("mapx");
            Object mapyObj = item.get("mapy");
            if (mapxObj == null || mapyObj == null) return Optional.empty();

            double lng = Double.parseDouble(String.valueOf(mapxObj));
            double lat = Double.parseDouble(String.valueOf(mapyObj));
            log.info("[VenueGeo] TourAPI 단건 조회 성공 - venueId={}, lat={}, lng={}", venueId, lat, lng);
            return Optional.of(new VenueGeo(venueId, lat, lng, 1100));

        } catch (Exception e) {
            log.warn("[VenueGeo] TourAPI 단건 조회 실패 - venueId={}, error={}", venueId, e.getMessage());
            return Optional.empty();
        }
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
                    int geofenceRadius = 1100;
                    String eventStartDate = normalizeDate(item.get("eventstartdate"));
                    String eventEndDate = normalizeDate(item.get("eventenddate"));

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
                            .eventStartDate(eventStartDate.isBlank() ? null : eventStartDate)
                            .eventEndDate(eventEndDate.isBlank() ? null : eventEndDate)
                            .build());
                }
            }
            return result;
        } catch (Exception e) {
            log.error("TourAPI 호출 실패: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    private String normalizeDate(Object value) {
        if (value == null) return null;
        String text = String.valueOf(value).trim();
        if (text.isBlank() || "null".equalsIgnoreCase(text)) return null;
        return text;
    }

    private Optional<VenueGeo> toVenueGeo(Event event) {
        if (event == null || event.getMapX() == null || event.getMapY() == null) {
            return Optional.empty();
        }

        try {
            double lng = Double.parseDouble(event.getMapX().trim());
            double lat = Double.parseDouble(event.getMapY().trim());
            return Optional.of(new VenueGeo(String.valueOf(event.getId()), lat, lng, 1100)); // 범위
        } catch (Exception e) {
            log.warn("이벤트 좌표 파싱 실패: eventId={}, message={}",
                    event.getId(), e.getMessage());
            return Optional.empty();
        }
    }
}
