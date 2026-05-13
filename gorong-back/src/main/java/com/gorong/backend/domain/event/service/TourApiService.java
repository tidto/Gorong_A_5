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

    /**
     * [MapController 연결 메서드]
     * DB에 데이터가 있으면 반환하고, 없으면 API를 통해 가져옵니다.
     */
    @Transactional
    public List<TourItemDto> getSmartFestivalList() {
        List<Event> dbEvents = eventRepository.findAll();

        if (dbEvents.isEmpty()) {
            return getAndSyncApiData();
        }

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

    /**
     * API 데이터를 긁어와서 DB와 동기화하고 상세 정보까지 채웁니다.
     */
    @Transactional
    public List<TourItemDto> getAndSyncApiData() {
        List<TourItemDto> dtoList = getFestivalList();
        for (TourItemDto dto : dtoList) {
            if (dto.getContentid() == null || dto.getContentid().isEmpty()) continue;
            try {
                // 상세 API를 호출하여 무장애 정보(주차, 엘리베이터 등)를 채움
                fillBarrierFreeDetail(dto);

                Long eventId = Long.parseLong(dto.getContentid());
                eventRepository.findById(eventId)
                        .ifPresentOrElse(
                                existingEvent -> existingEvent.updateFromDto(dto),
                                () -> {
                                    Event newEvent = Event.builder()
                                            .id(eventId)
                                            .build();
                                    // 엔티티 내부의 매핑 로직(A01 -> NA 등) 수행
                                    newEvent.updateFromDto(dto);
                                    eventRepository.save(newEvent);
                                }
                        );
            } catch (Exception e) {
                System.err.println("🚨 데이터 동기화 실패 (ID: " + dto.getContentid() + "): " + e.getMessage());
            }
        }
        return dtoList;
    }

    /**
     * 공공 API로부터 행사 목록을 가져옵니다.
     */
    public List<TourItemDto> getFestivalList() {
        int[] contentTypes = {14, 15};
        List<TourItemDto> totalList = new ArrayList<>();

        for (int typeId : contentTypes) {
            String url = "https://apis.data.go.kr/B551011/KorWithService2/locationBasedList2"
                    + "?serviceKey=" + tourApiConfig.getServiceKey()
                    + "&numOfRows=20&pageNo=1&MobileOS=ETC&MobileApp=Gorong&_type=json"
                    + "&mapX=128.6225&mapY=35.895278&radius=2000"
                    + "&contentTypeId=" + typeId;

            try {
                String res = restTemplate.getForObject(url, String.class);
                if (res == null || res.startsWith("<")) {
                    System.err.println("🚨 API 인증 실패 또는 잘못된 응답: " + res);
                    continue;
                }

                JSONObject json = new JSONObject(res);
                JSONObject body = json.optJSONObject("response").optJSONObject("body");
                Object itemsObj = body.opt("items");

                if (itemsObj instanceof JSONObject) {
                    JSONArray itemArr = ((JSONObject) itemsObj).optJSONArray("item");
                    if (itemArr != null) {
                        for (int i = 0; i < itemArr.length(); i++) {
                            totalList.add(mapToDtoFromJson(itemArr.getJSONObject(i)));
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("🚨 목록 호출 실패: " + e.getMessage());
            }
        }
        return totalList;
    }

    /**
     * 무장애 상세 정보를 가져와 DTO를 완성합니다.
     */
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
        dto.setMapx(obj.optString("mapx"));
        dto.setMapy(obj.optString("mapy"));
        dto.setAreacode(obj.optString("areacode"));
        dto.setCat1(obj.optString("cat1"));

        String img = obj.optString("firstimage");
        dto.setFirstimage((img == null || img.isEmpty()) ? "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=500" : img);
        return dto;
    }

    private TourItemDto mapToDtoFromEntity(Event event) {
        TourItemDto dto = new TourItemDto();
        dto.setContentid(String.valueOf(event.getId()));
        dto.setTitle(event.getTitle());
        dto.setAddr1(event.getAddr());
        dto.setMapx(event.getMapX());
        dto.setMapy(event.getMapY());
        dto.setFirstimage(event.getFirstImage());
        dto.setParking(event.getParking());
        dto.setElevator(event.getElevator());
        dto.setRestroom(event.getRestroom());
        dto.setRoute(event.getRoute());
        dto.setOverview(event.getDescription());
        return dto;
    }
}
