package com.gorong.backend.domain.event.service;

import com.gorong.backend.domain.event.dto.TourItemDto;
import com.gorong.backend.domain.event.entity.Event;
import com.gorong.backend.domain.event.repository.EventRepository;
import com.gorong.backend.global.TourApiConfig;
import jakarta.annotation.PostConstruct;
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

    @PostConstruct
    @Transactional
    public void initMissingCategories() {
        long naCount = eventRepository.countByTourCategoryCode("NA");
        long lsCount = eventRepository.countByTourCategoryCode("LS");

        if (naCount == 0 || lsCount == 0) {
            System.out.println("📭 자연관광/레포츠 데이터 없음 → 자동 동기화 시작");
            getAndSyncApiData();
        } else {
            System.out.println("✅ 자연관광(" + naCount + "개) / 레포츠(" + lsCount + "개) 확인 완료");
        }
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
                fillGalleryImages(dto);
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
        int[] contentTypes = {12, 14, 15, 28};
        List<TourItemDto> totalList = new ArrayList<>();

        double[][] centers = {
                {128.6225, 35.8714},
                {128.5911, 35.8019},
                {129.0756, 35.5665},
                {128.7322, 36.5760},
                {128.9963, 35.9078},
                {128.3445, 35.7300},
                {128.6922, 36.0390},
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

                    // 무장애 추가 필드
                    dto.setWheelchair(detail.optString("wheelchair"));
                    dto.setExit(detail.optString("exit"));
                    dto.setPublicTransport(detail.optString("publictransport"));
                    dto.setBraileBlock(detail.optString("braileblock"));
                    dto.setAudioGuide(detail.optString("audioguide"));
                    dto.setHelpDog(detail.optString("helpdog"));
                    dto.setSignGuide(detail.optString("signguide"));
                    dto.setVideoGuide(detail.optString("videoguide"));
                    dto.setStroller(detail.optString("stroller"));
                }
            }
        } catch (Exception e) {
            System.err.println("🚨 상세 정보 호출 실패 (ID: " + dto.getContentid() + ")");
        }
    }

    private void fillGalleryImages(TourItemDto dto) {
        String galleryUrl = "https://apis.data.go.kr/B551011/KorService2/detailImage2"
                + "?serviceKey=" + tourApiConfig.getServiceKey()
                + "&contentId=" + dto.getContentid()
                + "&imageYN=Y&subImageYN=Y&numOfRows=5"
                + "&MobileOS=ETC&MobileApp=Gorong&_type=json";

        try {
            String res = restTemplate.getForObject(galleryUrl, String.class);
            if (res == null || res.startsWith("<")) return;

            JSONObject json = new JSONObject(res);
            JSONObject body = json.optJSONObject("response").optJSONObject("body");
            Object itemsObj = body.opt("items");

            if (itemsObj instanceof JSONObject) {
                JSONArray itemArr = ((JSONObject) itemsObj).optJSONArray("item");
                if (itemArr != null && itemArr.length() > 0) {
                    List<String> urls = new ArrayList<>();
                    for (int i = 0; i < itemArr.length(); i++) {
                        String imgUrl = itemArr.getJSONObject(i).optString("originimgurl", "").trim();
                        if (!imgUrl.isEmpty()) urls.add(imgUrl);
                    }
                    if (!urls.isEmpty()) {
                        dto.setGalleryImages(String.join(",", urls));
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("🚨 관광사진 호출 실패 (ID: " + dto.getContentid() + "): " + e.getMessage());
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

        String img2 = obj.optString("firstimage2", "").trim();
        if (!img2.isEmpty()) dto.setFirstimage2(img2);

        String startDate = obj.optString("eventstartdate", "").trim();
        String endDate   = obj.optString("eventenddate",   "").trim();
        if (!startDate.isEmpty()) dto.setEventStartDate(startDate);
        if (!endDate.isEmpty())   dto.setEventEndDate(endDate);

        String tel = obj.optString("tel", "").trim();
        if (!tel.isEmpty()) dto.setTel(tel);

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
        dto.setFirstimage2(event.getFirstImage2());
        dto.setParking(event.getParking());
        dto.setElevator(event.getElevator());
        dto.setRestroom(event.getRestroom());
        dto.setRoute(event.getRoute());
        dto.setOverview(event.getDescription());
        dto.setEventStartDate(event.getEventStartDate());
        dto.setEventEndDate(event.getEventEndDate());
        dto.setTel(event.getTel());

        // 무장애 추가 필드
        dto.setWheelchair(event.getWheelchair());
        dto.setExit(event.getExit());
        dto.setPublicTransport(event.getPublicTransport());
        dto.setBraileBlock(event.getBraileBlock());
        dto.setAudioGuide(event.getAudioGuide());
        dto.setHelpDog(event.getHelpDog());
        dto.setSignGuide(event.getSignGuide());
        dto.setVideoGuide(event.getVideoGuide());
        dto.setStroller(event.getStroller());
        dto.setGalleryImages(event.getGalleryImages());

        String code = event.getTourCategoryCode();
        if (code != null) {
            switch (code) {
                case "NA":  dto.setCat1("A01"); break;
                case "VE":  dto.setCat1("A02"); break;
                case "LS":  dto.setCat1("A03"); break;
                case "SH":  dto.setCat1("A04"); break;
                case "FD":  dto.setCat1("A05"); break;
                case "C01": dto.setCat1("C01"); break;
                default:    dto.setCat1("ETC");
            }
        }

        return dto;
    }
}