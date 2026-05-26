package com.gorong.backend.domain.event.service;

import com.gorong.backend.domain.event.dto.TourItemDto;
import com.gorong.backend.domain.event.entity.Event;
import com.gorong.backend.domain.event.repository.EventRepository;
import com.gorong.backend.global.TourApiConfig;
import lombok.RequiredArgsConstructor;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.DefaultUriBuilderFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TourApiService {

    private final TourApiConfig tourApiConfig;
    private final EventRepository eventRepository;
    private final RestTemplate restTemplate = createRestTemplate();

    private RestTemplate createRestTemplate() {
        RestTemplate rt = new RestTemplate();
        DefaultUriBuilderFactory factory = new DefaultUriBuilderFactory();
        factory.setEncodingMode(DefaultUriBuilderFactory.EncodingMode.NONE);
        rt.setUriTemplateHandler(factory);
        return rt;
    }

    @Transactional
    public List<TourItemDto> getSmartFestivalList() {
        List<Event> dbEvents = eventRepository.findAll();

        if (dbEvents.isEmpty()) {
            System.out.println("📭 DB 비어있음 → API 동기화 시작");
            return getAndSyncApiData();
        }

        System.out.println("✅ DB에서 " + dbEvents.size() + "개 로드");
        return dbEvents.stream()
                .filter(this::isCulturalEvent)
                .map(this::mapToDtoFromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TourItemDto getEventDetail(Long id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("해당 행사를 찾을 수 없습니다."));
        return mapToDtoFromEntity(event);
    }

    private boolean isCulturalEvent(Event event) {
        String title = event.getTitle();
        if (title == null) return false;
        return !(title.contains("카페") || title.contains("식당") || title.contains("커피") || title.contains("집밥"));
    }

    @Transactional
    public List<TourItemDto> getAndSyncApiData() {
        List<TourItemDto> dtoList = getFestivalList();
        System.out.println("🌐 API에서 가져온 총 데이터: " + dtoList.size() + "개");

        for (TourItemDto dto : dtoList) {
            if (dto.getContentid() == null || dto.getContentid().isEmpty()) continue;
            try {
                fillBarrierFreeDetail(dto);
                Long eventId = Long.parseLong(dto.getContentid());
                eventRepository.findById(eventId)
                        .ifPresentOrElse(
                                existingEvent -> existingEvent.updateFromDto(dto),
                                () -> {
                                    Event newEvent = Event.builder().id(eventId).build();
                                    newEvent.updateFromDto(dto);
                                    eventRepository.save(newEvent);
                                }
                        );
            } catch (Exception e) {
                System.err.println("🚨 동기화 실패 (ID: " + dto.getContentid() + "): " + e.getMessage());
            }
        }
        return dtoList;
    }

    public List<TourItemDto> getFestivalList() {
        int[] contentTypes = {14, 15};
        List<TourItemDto> totalList = new ArrayList<>();

        // 대구/경북 7개 거점 좌표 [경도(mapX), 위도(mapY)]
        double[][] centers = {
                {128.6225, 35.8714},  // 대구 중심
                {128.5911, 35.8019},  // 대구 서구
                {129.0756, 35.5665},  // 경주
                {128.7322, 36.5760},  // 안동
                {128.9963, 35.9078},  // 포항
                {128.3445, 35.7300},  // 고령/성주
                {128.6922, 36.0390},  // 영천
        };

        for (double[] center : centers) {
            for (int typeId : contentTypes) {
                String url = "https://apis.data.go.kr/B551011/KorWithService2/locationBasedList2"
                        + "?serviceKey=" + tourApiConfig.getServiceKey()
                        + "&numOfRows=50&pageNo=1&MobileOS=ETC&MobileApp=Gorong&_type=json"
                        + "&mapX=" + center[0]
                        + "&mapY=" + center[1]
                        + "&radius=30000"
                        + "&contentTypeId=" + typeId;

                try {
                    String res = restTemplate.getForObject(url, String.class);
                    if (res == null || res.startsWith("<")) {
                        System.err.println("🚨 API 응답 오류: " + res);
                        continue;
                    }

                    JSONObject json = new JSONObject(res);
                    JSONObject body = json.optJSONObject("response").optJSONObject("body");
                    Object itemsObj = body.opt("items");

                    if (itemsObj instanceof JSONObject) {
                        JSONArray itemArr = ((JSONObject) itemsObj).optJSONArray("item");
                        if (itemArr != null) {
                            for (int i = 0; i < itemArr.length(); i++) {
                                TourItemDto dto = mapToDtoFromJson(itemArr.getJSONObject(i));
                                // contentid 기준 중복 제거
                                boolean isDuplicate = totalList.stream()
                                        .anyMatch(d -> d.getContentid().equals(dto.getContentid()));
                                if (!isDuplicate) totalList.add(dto);
                            }
                        }
                    }
                } catch (Exception e) {
                    System.err.println("🚨 목록 호출 실패: " + e.getMessage());
                }
            }
        }

        System.out.println("📦 총 수집: " + totalList.size() + "개");
        return totalList;
    }

    private void fillBarrierFreeDetail(TourItemDto dto) {
        String detailUrl = "https://apis.data.go.kr/B551011/KorWithService2/detailWithTour2"
                + "?serviceKey=" + tourApiConfig.getServiceKey()
                + "&contentId=" + dto.getContentid()
                + "&MobileOS=ETC&MobileApp=Gorong&_type=json";

        try {
            String res = restTemplate.getForObject(detailUrl, String.class);
            if (res == null || res.startsWith("<")) return;

            JSONObject json = new JSONObject(res);
            JSONObject body = json.optJSONObject("response").optJSONObject("body");
            Object itemsObj = body.opt("items");

            if (itemsObj instanceof JSONObject) {
                JSONArray itemArr = ((JSONObject) itemsObj).optJSONArray("item");
                if (itemArr != null && itemArr.length() > 0) {
                    JSONObject detail = itemArr.getJSONObject(0);
                    dto.setParking(detail.optString("parking"));
                    dto.setElevator(detail.optString("elevator"));
                    dto.setRestroom(detail.optString("restroom"));
                    dto.setRoute(detail.optString("route"));
                    dto.setOverview(detail.optString("overview"));
                }
            }
        } catch (Exception e) {
            System.err.println("🚨 상세 정보 호출 실패 (ID: " + dto.getContentid() + ")");
        }
    }

    private TourItemDto mapToDtoFromJson(JSONObject obj) {
        TourItemDto dto = new TourItemDto();
        dto.setContentid(obj.optString("contentid"));
        dto.setTitle(obj.optString("title"));
        dto.setAddr1(obj.optString("addr1"));

        String mapx = obj.optString("mapx", "").trim();
        String mapy = obj.optString("mapy", "").trim();
        if (mapx.isEmpty()) mapx = obj.optString("mapX", "").trim();
        if (mapy.isEmpty()) mapy = obj.optString("mapY", "").trim();

        dto.setMapx(mapx);
        dto.setMapy(mapy);
        dto.setAreacode(obj.optString("areacode"));
        dto.setCat1(obj.optString("cat1"));

        String img = obj.optString("firstimage", "").trim();
        dto.setFirstimage(img.isEmpty()
                ? "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=500"
                : img);
        return dto;
    }

    private TourItemDto mapToDtoFromEntity(Event event) {
        TourItemDto dto = new TourItemDto();
        dto.setContentid(String.valueOf(event.getId()));
        dto.setTitle(event.getTitle());
        dto.setAddr1(event.getAddr());
        dto.setMapx(event.getMapX() != null ? event.getMapX().trim() : "");
        dto.setMapy(event.getMapY() != null ? event.getMapY().trim() : "");
        dto.setFirstimage(event.getFirstImage());
        dto.setParking(event.getParking());
        dto.setElevator(event.getElevator());
        dto.setRestroom(event.getRestroom());
        dto.setRoute(event.getRoute());
        dto.setOverview(event.getDescription());
        return dto;
    }
}