package com.gorong.backend.domain.chatbot.service;

import com.gorong.backend.domain.app.dto.NearbyVenueResponseDto;
import com.gorong.backend.domain.app.service.AppVenueService;
import com.gorong.backend.domain.chatbot.dto.ChatActionDto;
import com.gorong.backend.domain.chatbot.dto.ChatRecommendResponseDto;
import com.gorong.backend.domain.event.entity.Event;
import com.gorong.backend.domain.event.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatbotNearbyService {

    private static final DateTimeFormatter TOUR_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final AppVenueService appVenueService;
    private final EventRepository eventRepository;
    private final EventRecommendationService eventRecommendationService;

    @Value("${CHATBOT_DEFAULT_LAT:35.8714}")
    private double defaultLat;

    @Value("${CHATBOT_DEFAULT_LNG:128.6014}")
    private double defaultLng;

    @Value("${CHATBOT_NEARBY_RADIUS:5000}")
    private int defaultRadius;

    public ChatRecommendResponseDto recommendNearby(String message, Authentication authentication) {
        String regionLabel = resolveRegionLabel(message, authentication);
        GeoPoint geo = resolveGeo(message, authentication);

        List<Event> merged = new ArrayList<>();
        try {
            List<NearbyVenueResponseDto> venues = appVenueService.getNearbyVenues(geo.lat, geo.lng, defaultRadius);
            for (NearbyVenueResponseDto v : venues) {
                if (v.getId() == null) {
                    continue;
                }
                try {
                    long id = Long.parseLong(v.getId());
                    eventRepository.findById(id).ifPresent(merged::add);
                } catch (NumberFormatException ignored) {
                    /* Tour ID only — DB 미동기 */
                }
            }
        } catch (Exception e) {
            log.warn("[Chatbot] Tour nearby API failed, falling back to DB", e);
        }

        if (merged.isEmpty()) {
            merged.addAll(loadDbNearbyEvents(regionLabel));
        } else {
            merged = dedupeById(merged);
            if (merged.size() < 3) {
                for (Event e : loadDbNearbyEvents(regionLabel)) {
                    if (merged.stream().noneMatch(x -> x.getId().equals(e.getId()))) {
                        merged.add(e);
                    }
                    if (merged.size() >= 5) {
                        break;
                    }
                }
            }
        }

        if (merged.isEmpty()) {
            return ChatRecommendResponseDto.builder()
                    .answer("지금은 " + regionLabel + " 근처 추천 행사를 불러오지 못했어요. 잠시 후 다시 시도하거나 행사 메뉴에서 직접 찾아보세요.")
                    .intent(ChatIntent.LOCATION_RECOMMENDATION.name())
                    .recommendedEvents(List.of())
                    .actions(defaultNearbyActions())
                    .build();
        }

        List<Event> picks = merged.stream().limit(3).toList();
        String answer = "회원님 기준 **" + regionLabel + "** 근처에서 갈 만한 행사를 골라봤어요. (거리·인기 순 Tour API + DB)";
        List<ChatRecommendResponseDto.RecommendedEventDto> recommended =
                eventRecommendationService.mapEventsToRecommendedDtos(picks, regionLabel, message, ChatIntent.LOCATION_RECOMMENDATION);

        return ChatRecommendResponseDto.builder()
                .answer(answer)
                .intent(ChatIntent.LOCATION_RECOMMENDATION.name())
                .recommendedEvents(recommended)
                .actions(defaultNearbyActions())
                .build();
    }

    private List<Event> loadDbNearbyEvents(String regionLabel) {
        String today = LocalDate.now().format(TOUR_DATE);
        List<Event> events = eventRepository.findTop100ByEventEndDateGreaterThanEqualOrderByEventStartDateAsc(today);
        if (events.isEmpty()) {
            events = eventRepository.findTop20ByOrderByCreatedAtDesc();
        }
        String token = regionLabel.replace(" 근처", "").trim();
        return events.stream()
                .sorted(Comparator.comparingInt(e -> -regionMatchScore(e, token)))
                .limit(5)
                .toList();
    }

    private static int regionMatchScore(Event e, String token) {
        String hay = ((e.getAddr() == null ? "" : e.getAddr()) + " " + (e.getAreaCode() == null ? "" : e.getAreaCode())).toLowerCase();
        if (token.isEmpty()) {
            return 0;
        }
        return hay.contains(token.toLowerCase()) ? 10 : 0;
    }

    private static List<Event> dedupeById(List<Event> events) {
        Map<Long, Event> map = new LinkedHashMap<>();
        for (Event e : events) {
            map.putIfAbsent(e.getId(), e);
        }
        return new ArrayList<>(map.values());
    }

    private GeoPoint resolveGeo(String message, Authentication authentication) {
        Optional<String> profileLoc = eventRecommendationService.resolveUserLocationString(authentication);
        if (profileLoc.isPresent() && !profileLoc.get().isBlank()) {
            GeoPoint fromText = geoFromRegionText(profileLoc.get());
            if (fromText != null) {
                return fromText;
            }
        }
        GeoPoint fromMessage = geoFromRegionText(message);
        if (fromMessage != null) {
            return fromMessage;
        }
        return new GeoPoint(defaultLat, defaultLng);
    }

    private String resolveRegionLabel(String message, Authentication authentication) {
        Optional<String> profileLoc = eventRecommendationService.resolveUserLocationString(authentication);
        if (profileLoc.isPresent() && !profileLoc.get().isBlank()) {
            return profileLoc.get().trim() + " 근처";
        }
        if (message != null) {
            if (message.contains("대구")) return "대구";
            if (message.contains("서울")) return "서울";
            if (message.contains("부산")) return "부산";
            if (message.contains("인천")) return "인천";
            if (message.contains("광주")) return "광주";
            if (message.contains("대전")) return "대전";
        }
        return "대구";
    }

    private static GeoPoint geoFromRegionText(String text) {
        if (text == null) {
            return null;
        }
        if (text.contains("대구")) return new GeoPoint(35.8714, 128.6014);
        if (text.contains("서울")) return new GeoPoint(37.5665, 126.9780);
        if (text.contains("부산")) return new GeoPoint(35.1796, 129.0756);
        if (text.contains("인천")) return new GeoPoint(37.4563, 126.7052);
        if (text.contains("광주")) return new GeoPoint(35.1595, 126.8526);
        if (text.contains("대전")) return new GeoPoint(36.3504, 127.3845);
        return null;
    }

    private static List<ChatActionDto> defaultNearbyActions() {
        return List.of(
                ChatActionDto.builder().label("행사 지도").path("/").type("map").build(),
                ChatActionDto.builder().label("행사 목록").path("/events").type("events").build()
        );
    }

    private record GeoPoint(double lat, double lng) {}
}
