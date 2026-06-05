package com.gorong.backend.domain.chatbot.service;

import com.gorong.backend.domain.event.entity.Event;
import com.gorong.backend.domain.event.repository.EventRepository;
import com.gorong.backend.domain.group.repository.EventParticipationRepository;
import com.gorong.backend.domain.group.repository.GroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class EventRecommendationSelector {

    private static final DateTimeFormatter TOUR_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final int MIN_CANDIDATE_POOL = 12;
    private static final int PICK_COUNT = 3;

    private final EventRepository eventRepository;
    private final EventParticipationRepository eventParticipationRepository;
    private final GroupRepository groupRepository;

    public enum QueryMode {
        THIS_WEEK,
        POPULAR,
        KEYWORD,
        LOCATION
    }

    public record SelectionResult(
            List<Event> picks,
            int matchedCount,
            QueryMode mode,
            Map<Long, EventRecommendReason> reasonByEventId
    ) {
    }

    public QueryMode detectMode(String message, ChatIntent intent) {
        String m = message == null ? "" : message.toLowerCase().replaceAll("\\s+", " ");
        if (intent == ChatIntent.LOCATION_RECOMMENDATION) {
            return QueryMode.LOCATION;
        }
        if (m.contains("이번 주") || m.contains("이번주") || m.contains("이번 주말") || m.contains("주말에")) {
            return QueryMode.THIS_WEEK;
        }
        if (m.contains("인기") || m.contains("핫한") || m.contains("핫 ")) {
            return QueryMode.POPULAR;
        }
        return QueryMode.KEYWORD;
    }

    public SelectionResult select(
            String message,
            String userLocation,
            ChatIntent intent,
            Set<Long> excludeIds,
            Set<Long> relaxedExcludeIds,
            Long userId
    ) {
        QueryMode mode = detectMode(message, intent);
        List<Event> base = loadUpcomingEvents();
        return selectFromPool(base, message, userLocation, intent, mode, excludeIds, relaxedExcludeIds, userId);
    }

    /** Tour API·DB 등에서 모은 후보 목록에서 선정 */
    public SelectionResult selectFromPool(
            List<Event> candidatePool,
            String message,
            String userLocation,
            ChatIntent intent,
            Set<Long> excludeIds,
            Set<Long> relaxedExcludeIds,
            Long userId
    ) {
        QueryMode mode = detectMode(message, intent);
        return selectFromPool(candidatePool, message, userLocation, intent, mode, excludeIds, relaxedExcludeIds, userId);
    }

    private SelectionResult selectFromPool(
            List<Event> base,
            String message,
            String userLocation,
            ChatIntent intent,
            QueryMode mode,
            Set<Long> excludeIds,
            Set<Long> relaxedExcludeIds,
            Long userId
    ) {
        List<Event> filtered = filterByMode(base, mode);
        int matchedCount = filtered.size();

        PopularityStats stats = loadPopularityStats();

        List<Event> available = applyExclude(filtered, excludeIds);
        if (available.size() < PICK_COUNT && matchedCount > 0) {
            available = applyExclude(filtered, relaxedExcludeIds);
        }

        List<ScoredEvent> scored = scoreEvents(available, message, userLocation, intent, mode, stats);
        List<Event> picks = pickDiverse(scored, userId, message, mode, PICK_COUNT);

        Map<Long, EventRecommendReason> reasons = new HashMap<>();
        for (Event e : picks) {
            reasons.put(e.getId(), reasonForEvent(e, mode, stats, message, userLocation, intent));
        }

        return new SelectionResult(picks, matchedCount, mode, reasons);
    }

    private List<Event> loadUpcomingEvents() {
        String today = LocalDate.now().format(TOUR_DATE);
        List<Event> events = eventRepository.findTop100ByEventEndDateGreaterThanEqualOrderByEventStartDateAsc(today);
        if (!events.isEmpty()) {
            return events;
        }
        return eventRepository.findTop20ByOrderByCreatedAtDesc();
    }

    private List<Event> filterByMode(List<Event> events, QueryMode mode) {
        if (mode == QueryMode.THIS_WEEK) {
            LocalDate weekStart = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            LocalDate weekEnd = weekStart.plusDays(6);
            return events.stream()
                    .filter(e -> isActiveBetween(e, weekStart, weekEnd))
                    .toList();
        }
        return events.stream()
                .filter(e -> isOngoingOrFuture(e, LocalDate.now()))
                .toList();
    }

    private List<Event> applyExclude(List<Event> events, Set<Long> exclude) {
        if (exclude == null || exclude.isEmpty()) {
            return new ArrayList<>(events);
        }
        return events.stream()
                .filter(e -> !exclude.contains(e.getId()))
                .collect(Collectors.toCollection(ArrayList::new));
    }

    private List<ScoredEvent> scoreEvents(
            List<Event> events,
            String message,
            String userLocation,
            ChatIntent intent,
            QueryMode mode,
            PopularityStats stats
    ) {
        List<String> locationTokens = locationTokens(userLocation);
        return events.stream()
                .map(e -> {
                    int score = 0;
                    if (mode == QueryMode.POPULAR) {
                        score += stats.participationCount(e.getId()) * 8;
                        score += stats.groupCount(e) * 5;
                        score += stats.recencyScore(e) * 3;
                    } else if (mode == QueryMode.THIS_WEEK) {
                        score += stats.recencyScore(e) * 2;
                        score += stats.participationCount(e.getId()) * 2;
                        score += keywordScore(e, message) * 3;
                    } else if (mode == QueryMode.LOCATION) {
                        score += locationScore(e, locationTokens) * 10;
                        score += stats.participationCount(e.getId()) * 2;
                    } else {
                        score += keywordScore(e, message) * 6;
                        score += stats.participationCount(e.getId()) * 2;
                        score += stats.recencyScore(e) * 2;
                    }
                    if (intent == ChatIntent.LOCATION_RECOMMENDATION && hasText(userLocation)) {
                        score += locationScore(e, locationTokens) * 4;
                    }
                    return new ScoredEvent(e, score);
                })
                .sorted(Comparator.comparingInt(ScoredEvent::score).reversed()
                        .thenComparing(s -> s.event().getId()))
                .toList();
    }

    private List<Event> pickDiverse(List<ScoredEvent> scored, Long userId, String message, QueryMode mode, int limit) {
        if (scored.isEmpty()) {
            return List.of();
        }
        int poolSize = Math.min(Math.max(MIN_CANDIDATE_POOL, limit * 4), scored.size());
        List<ScoredEvent> pool = scored.subList(0, poolSize);
        List<ScoredEvent> mutable = new ArrayList<>(pool);

        long seed = 31L;
        if (userId != null) {
            seed ^= userId;
        }
        seed ^= LocalDate.now().toEpochDay();
        seed ^= mode.ordinal() * 17L;
        seed ^= message == null ? 0 : message.hashCode();
        Collections.shuffle(mutable, new Random(seed));

        return mutable.stream()
                .limit(limit)
                .map(ScoredEvent::event)
                .toList();
    }

    private EventRecommendReason reasonForEvent(
            Event event,
            QueryMode mode,
            PopularityStats stats,
            String message,
            String userLocation,
            ChatIntent intent
    ) {
        if (mode == QueryMode.THIS_WEEK) {
            return EventRecommendReason.THIS_WEEK;
        }
        if (mode == QueryMode.LOCATION || (intent == ChatIntent.LOCATION_RECOMMENDATION && hasText(userLocation))) {
            return EventRecommendReason.NEARBY;
        }
        if (mode == QueryMode.POPULAR || stats.participationCount(event.getId()) >= 3 || stats.groupCount(event) >= 2) {
            return EventRecommendReason.POPULAR;
        }
        if (stats.recencyScore(event) >= 8) {
            return EventRecommendReason.RECENT;
        }
        return EventRecommendReason.KEYWORD;
    }

    private PopularityStats loadPopularityStats() {
        Map<Long, Integer> participation = new HashMap<>();
        for (Object[] row : eventParticipationRepository.countGroupByEventContentId()) {
            if (row == null || row.length < 2) {
                continue;
            }
            try {
                long eventId = Long.parseLong(String.valueOf(row[0]));
                int count = ((Number) row[1]).intValue();
                participation.put(eventId, count);
            } catch (NumberFormatException ignored) {
                /* skip */
            }
        }

        Map<String, Integer> groupByEventKey = new HashMap<>();
        for (Object[] row : groupRepository.countGroupByEventField()) {
            if (row == null || row.length < 2 || row[0] == null) {
                continue;
            }
            String key = String.valueOf(row[0]).trim().toLowerCase();
            if (key.isEmpty()) {
                continue;
            }
            groupByEventKey.put(key, ((Number) row[1]).intValue());
        }

        return new PopularityStats(participation, groupByEventKey);
    }

    private record ScoredEvent(Event event, int score) {
    }

    private record PopularityStats(Map<Long, Integer> participationByEventId, Map<String, Integer> groupByEventKey) {
        int participationCount(Long eventId) {
            if (eventId == null) {
                return 0;
            }
            return participationByEventId.getOrDefault(eventId, 0);
        }

        int groupCount(Event event) {
            if (event == null) {
                return 0;
            }
            String idKey = String.valueOf(event.getId());
            String titleKey = event.getTitle() == null ? "" : event.getTitle().trim().toLowerCase();
            int score = 0;
            for (Map.Entry<String, Integer> e : groupByEventKey.entrySet()) {
                String k = e.getKey();
                if (k.equals(idKey) || k.equals(titleKey) || (!titleKey.isEmpty() && k.contains(titleKey))) {
                    score += e.getValue();
                }
            }
            return score;
        }

        int recencyScore(Event event) {
            if (event.getCreatedAt() == null) {
                return 0;
            }
            long days = Math.max(0, LocalDate.now().toEpochDay()
                    - event.getCreatedAt().toLocalDate().toEpochDay());
            if (days <= 7) {
                return 10;
            }
            if (days <= 30) {
                return 6;
            }
            if (days <= 90) {
                return 3;
            }
            return 1;
        }
    }

    private static boolean isOngoingOrFuture(Event event, LocalDate today) {
        Optional<LocalDate> end = parseTourDate(event.getEventEndDate());
        if (end.isEmpty()) {
            return true;
        }
        return !end.get().isBefore(today);
    }

    private static boolean isActiveBetween(Event event, LocalDate rangeStart, LocalDate rangeEnd) {
        Optional<LocalDate> start = parseTourDate(event.getEventStartDate());
        Optional<LocalDate> end = parseTourDate(event.getEventEndDate());
        LocalDate s = start.orElse(rangeStart);
        LocalDate e = end.orElse(rangeEnd);
        return !e.isBefore(rangeStart) && !s.isAfter(rangeEnd);
    }

    private static Optional<LocalDate> parseTourDate(String raw) {
        if (raw == null || raw.isBlank()) {
            return Optional.empty();
        }
        String digits = raw.replaceAll("\\D", "");
        if (digits.length() < 8) {
            return Optional.empty();
        }
        try {
            return Optional.of(LocalDate.parse(digits.substring(0, 8), TOUR_DATE));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private static int keywordScore(Event event, String message) {
        if (!hasText(message)) {
            return 0;
        }
        String m = message.toLowerCase();
        String haystack = (safe(event.getTitle()) + " " + safe(event.getDescription()) + " "
                + safe(event.getTourCategoryCode()) + " " + safe(event.getAddr())).toLowerCase();
        int score = 0;
        if (m.contains("사진") || m.contains("야경") || m.contains("인스타")) {
            if (haystack.contains("전시") || haystack.contains("야경") || haystack.contains("축제")
                    || haystack.contains("공원") || haystack.contains("벚꽃")) {
                score += 4;
            }
        }
        if (m.contains("전시") && haystack.contains("전시")) {
            score += 4;
        }
        if (m.contains("축제") && haystack.contains("축제")) {
            score += 4;
        }
        if (m.contains("공연") || m.contains("음악")) {
            if (haystack.contains("공연") || haystack.contains("음악") || haystack.contains("페스티벌")) {
                score += 3;
            }
        }
        return score;
    }

    private static int locationScore(Event event, List<String> tokens) {
        String haystack = (safe(event.getAddr()) + " " + safe(event.getTitle()) + " "
                + safe(event.getAreaCode()) + " " + safe(event.getSigunguCode())).toLowerCase();
        int score = 0;
        for (String token : tokens) {
            if (haystack.contains(token.toLowerCase())) {
                score += token.length() >= 2 ? 2 : 1;
            }
        }
        return score;
    }

    private static List<String> locationTokens(String userLocation) {
        if (!hasText(userLocation)) {
            return List.of();
        }
        String normalized = userLocation
                .replaceAll("[(),]", " ")
                .replaceAll("\\s+", " ")
                .trim();
        List<String> tokens = new ArrayList<>();
        for (String part : normalized.split(" ")) {
            if (part.length() >= 2 && !tokens.contains(part)) {
                tokens.add(part);
            }
        }
        return tokens;
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String safe(String value) {
        return value == null ? "" : value;
    }

}
