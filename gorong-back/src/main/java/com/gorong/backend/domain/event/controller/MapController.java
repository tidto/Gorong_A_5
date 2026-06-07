package com.gorong.backend.domain.event.controller;

import com.gorong.backend.domain.event.dto.TourItemDto;
import com.gorong.backend.domain.event.service.TourApiService;
import com.gorong.backend.domain.group.repository.EventParticipationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class MapController {

    private final TourApiService tourApiService;
    private final EventParticipationRepository participationRepository;

    // /api/public/** → SecurityConfig에서 이미 permitAll → 비로그인도 접근 가능
    @GetMapping("/public/map")
    public ResponseEntity<List<TourItemDto>> getMapData() {
        List<TourItemDto> festivalList = tourApiService.getSmartFestivalList();
        return ResponseEntity.ok(festivalList);
    }

    // 상세 조회도 public으로 (비로그인 상세페이지 접근 허용)
    @GetMapping("/public/map/{id}")
    public ResponseEntity<TourItemDto> getEventDetail(@PathVariable Long id) {
        TourItemDto detail = tourApiService.getEventDetail(id);
        return ResponseEntity.ok(detail);
    }

    /**
     * GET /api/public/map/popular?limit=10
     * EventParticipation 참여 수 기준 인기 행사 TOP N 반환.
     * 참여 데이터가 부족하면 최신 행사로 채워서 항상 limit개를 반환.
     */
    @GetMapping("/public/map/popular")
    public ResponseEntity<List<TourItemDto>> getPopularEvents(
            @RequestParam(defaultValue = "10") int limit
    ) {
        // 1) 참여 수 TOP limit × 2 contentId 목록 (여유분 확보)
        List<Object[]> rows = participationRepository.findTopEventContentIds(
                PageRequest.of(0, limit * 2)
        );

        // contentId → participationCount 순서 보존 맵
        Map<String, Long> countMap = new LinkedHashMap<>();
        for (Object[] row : rows) {
            countMap.put((String) row[0], (Long) row[1]);
        }

        // 2) TourAPI 전체 목록에서 해당 contentId만 추출 (순서 유지)
        List<TourItemDto> allEvents = tourApiService.getSmartFestivalList();
        Map<String, TourItemDto> byId = allEvents.stream()
                .filter(e -> e.getContentid() != null)
                .collect(Collectors.toMap(TourItemDto::getContentid, e -> e, (a, b) -> a));

        List<TourItemDto> popular = new ArrayList<>();
        for (String contentId : countMap.keySet()) {
            TourItemDto dto = byId.get(contentId);
            if (dto != null) {
                popular.add(dto);
                if (popular.size() >= limit) break;
            }
        }

        // 3) 참여 데이터 부족 시 최신 행사로 보충
        if (popular.size() < limit) {
            for (TourItemDto dto : allEvents) {
                if (popular.size() >= limit) break;
                if (popular.stream().noneMatch(p -> p.getContentid().equals(dto.getContentid()))) {
                    popular.add(dto);
                }
            }
        }

        return ResponseEntity.ok(popular);
    }

    @GetMapping("/public/sync-tour-api")
    public ResponseEntity<String> syncTourApi() {
        List<TourItemDto> result = tourApiService.getAndSyncApiData();
        return ResponseEntity.ok("동기화 완료: " + result.size() + "건");
    }
}