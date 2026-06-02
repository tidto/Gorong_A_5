package com.gorong.backend.domain.event.service;

import com.gorong.backend.domain.event.dto.TourItemDto;
import com.gorong.backend.domain.event.entity.Event;
import com.gorong.backend.domain.event.repository.EventRepository;
import com.gorong.backend.global.TourApiConfig;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.DefaultUriBuilderFactory;

@Service
@RequiredArgsConstructor
public class TourApiService {

    private static final String FALLBACK_IMAGE =
            "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=500";

    private final TourApiConfig tourApiConfig;
    private final EventRepository eventRepository;
    private final RestTemplate restTemplate = createRestTemplate();
    private volatile boolean missingRegionSyncChecked = false;

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
            System.out.println("DB empty. Start API sync.");
            return getAndSyncApiData();
        }

        if (!missingRegionSyncChecked && hasMissingTargetRegion(dbEvents)) {
            int addedCount = addMissingDaeguGyeongbukEvents();
            missingRegionSyncChecked = true;
            if (addedCount > 0) {
                dbEvents = eventRepository.findAll();
            }
        } else {
            missingRegionSyncChecked = true;
        }

        System.out.println("Loaded " + dbEvents.size() + " events from DB.");
        return dbEvents.stream()
                .filter(this::isCulturalEvent)
                .map(this::mapToDtoFromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TourItemDto getEventDetail(Long id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found."));
        return mapToDtoFromEntity(event);
    }

    private boolean isCulturalEvent(Event event) {
        String title = event.getTitle();
        if (title == null) return false;
        return !(title.contains("카페") || title.contains("식당") || title.contains("커피") || title.contains("집밥"));
    }

    private boolean hasMissingTargetRegion(List<Event> events) {
        return !hasRegion(events, "포항") || !hasRegion(events, "영덕") || !hasRegion(events, "울진");
    }

    private boolean hasRegion(List<Event> events, String regionName) {
        return events.stream()
                .map(Event::getAddr)
                .filter(addr -> addr != null && !addr.isBlank())
                .anyMatch(addr -> addr.contains(regionName));
    }

    @Transactional
    public List<TourItemDto> getAndSyncApiData() {
        List<TourItemDto> dtoList = getFestivalList();
        System.out.println("Fetched " + dtoList.size() + " events from API.");

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
                System.err.println("Sync failed (ID: " + dto.getContentid() + "): " + e.getMessage());
            }
        }
        return dtoList;
    }

    @Transactional
    public int addMissingDaeguGyeongbukEvents() {
        List<TourItemDto> dtoList = getFestivalList();
        int addedCount = 0;

        for (TourItemDto dto : dtoList) {
            if (dto.getContentid() == null || dto.getContentid().isEmpty()) continue;
            try {
                Long eventId = Long.parseLong(dto.getContentid());
                if (eventRepository.existsById(eventId)) {
                    continue;
                }

                fillBarrierFreeDetail(dto);
                Event newEvent = Event.builder().id(eventId).build();
                newEvent.updateFromDto(dto);
                eventRepository.save(newEvent);
                addedCount++;
            } catch (Exception e) {
                System.err.println("Add missing event failed (ID: " + dto.getContentid() + "): " + e.getMessage());
            }
        }

        System.out.println("Added missing events: " + addedCount);
        return addedCount;
    }

    public List<TourItemDto> getFestivalList() {
        int[] contentTypes = {14, 15};
        List<TourItemDto> totalList = new ArrayList<>();

        double[][] centers = {
                {128.6225, 35.8714},  // Daegu
                {128.5911, 35.8019},  // Daegu Seo-gu
                {129.0756, 35.5665},  // Gyeongju
                {128.7322, 36.5760},  // Andong
                {129.3435, 36.0190},  // Pohang
                {129.3657, 36.4151},  // Yeongdeok
                {129.4006, 36.9931},  // Uljin
                {128.3445, 35.7300},  // Goryeong/Seongju
                {128.6922, 36.0390},  // Yeongcheon
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
                        System.err.println("API response error: " + res);
                        continue;
                    }

                    JSONObject response = new JSONObject(res).optJSONObject("response");
                    if (response == null) continue;
                    JSONObject body = response.optJSONObject("body");
                    if (body == null) continue;
                    Object itemsObj = body.opt("items");

                    if (itemsObj instanceof JSONObject items) {
                        JSONArray itemArr = items.optJSONArray("item");
                        if (itemArr != null) {
                            for (int i = 0; i < itemArr.length(); i++) {
                                TourItemDto dto = mapToDtoFromJson(itemArr.getJSONObject(i));
                                boolean isDuplicate = totalList.stream()
                                        .anyMatch(d -> d.getContentid().equals(dto.getContentid()));
                                if (!isDuplicate) totalList.add(dto);
                            }
                        }
                    }
                } catch (Exception e) {
                    System.err.println("List API call failed: " + e.getMessage());
                }
            }
        }

        System.out.println("Collected events: " + totalList.size());
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

            JSONObject response = new JSONObject(res).optJSONObject("response");
            if (response == null) return;
            JSONObject body = response.optJSONObject("body");
            if (body == null) return;
            Object itemsObj = body.opt("items");

            if (itemsObj instanceof JSONObject items) {
                JSONArray itemArr = items.optJSONArray("item");
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
            System.err.println("Detail API call failed (ID: " + dto.getContentid() + ")");
        }
    }

    private TourItemDto mapToDtoFromJson(JSONObject obj) {
        TourItemDto dto = new TourItemDto();
        dto.setContentid(obj.optString("contentid"));
        dto.setTitle(obj.optString("title"));
        dto.setAddr1(obj.optString("addr1"));
        dto.setTel(obj.optString("tel"));
        dto.setEventstartdate(obj.optString("eventstartdate"));
        dto.setEventenddate(obj.optString("eventenddate"));
        dto.setModifiedtime(obj.optString("modifiedtime"));

        String mapx = obj.optString("mapx", "").trim();
        String mapy = obj.optString("mapy", "").trim();
        if (mapx.isEmpty()) mapx = obj.optString("mapX", "").trim();
        if (mapy.isEmpty()) mapy = obj.optString("mapY", "").trim();

        dto.setMapx(mapx);
        dto.setMapy(mapy);
        dto.setAreacode(obj.optString("areacode"));
        dto.setSigungucode(obj.optString("sigungucode"));
        dto.setCat1(obj.optString("cat1"));

        String img = obj.optString("firstimage", "").trim();
        dto.setFirstimage(img.isEmpty() ? FALLBACK_IMAGE : img);
        dto.setFirstimage2(obj.optString("firstimage2"));
        return dto;
    }

    private TourItemDto mapToDtoFromEntity(Event event) {
        TourItemDto dto = new TourItemDto();
        dto.setContentid(String.valueOf(event.getId()));
        dto.setTitle(event.getTitle());
        dto.setAddr1(event.getAddr());
        dto.setTel(event.getTel());
        dto.setMapx(event.getMapX() != null ? event.getMapX().trim() : "");
        dto.setMapy(event.getMapY() != null ? event.getMapY().trim() : "");
        dto.setFirstimage(event.getFirstImage());
        dto.setFirstimage2(event.getFirstImage2());
        dto.setEventstartdate(event.getEventStartDate());
        dto.setEventenddate(event.getEventEndDate());
        dto.setModifiedtime(event.getModifiedTime());
        dto.setAreacode(event.getAreaCode());
        dto.setSigungucode(event.getSigunguCode());
        dto.setParking(event.getParking());
        dto.setElevator(event.getElevator());
        dto.setRestroom(event.getRestroom());
        dto.setRoute(event.getRoute());
        dto.setOverview(event.getDescription());
        dto.setCat1(convertTourCategoryToCat1(event.getTourCategoryCode())); // ← 추가
        return dto;
    }


    private String convertTourCategoryToCat1(String tourCategoryCode) {
    if (tourCategoryCode == null) return null;
    return switch (tourCategoryCode) {
        case "NA"  -> "A01";
        case "VE"  -> "A02";
        case "LS"  -> "A03";
        case "SH"  -> "A04";
        case "FD"  -> "A05";
        case "C01" -> "C01";
        default    -> null;
        };
    }
}