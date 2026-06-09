package com.gorong.backend.domain.minihome.service;

import com.gorong.backend.domain.minihome.dto.CatTowerVisitorStatsDto;
import com.gorong.backend.domain.minihome.entity.CatTowerVisit;
import com.gorong.backend.domain.minihome.repository.CatTowerVisitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CatTowerVisitService {

    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");

    private final CatTowerVisitRepository catTowerVisitRepository;
    private final MiniHomeService miniHomeService;
    private final EventCategoryItemRewardService eventCategoryItemRewardService;

    public CatTowerVisitorStatsDto getStats(Long roomOwnerId, Long viewerUserId) {
        requireUserId(roomOwnerId);
        miniHomeService.requireViewableMiniHome(roomOwnerId, viewerUserId);
        return buildStats(roomOwnerId);
    }

    @Transactional
    public CatTowerVisitorStatsDto recordVisit(Long roomOwnerId, Long visitorUserId) {
        requireUserId(roomOwnerId);
        requireUserId(visitorUserId);

        if (roomOwnerId.equals(visitorUserId)) {
            miniHomeService.requireViewableMiniHome(roomOwnerId, visitorUserId);
            return buildStats(roomOwnerId);
        }

        miniHomeService.requireViewableMiniHome(roomOwnerId, visitorUserId);

        catTowerVisitRepository.save(CatTowerVisit.builder()
                .roomOwnerUserId(roomOwnerId)
                .visitorUserId(visitorUserId)
                .build());

        eventCategoryItemRewardService.tryGrantVisitorReward(visitorUserId);

        return buildStats(roomOwnerId);
    }

    private CatTowerVisitorStatsDto buildStats(Long roomOwnerId) {
        LocalDate today = LocalDate.now(KOREA);
        OffsetDateTime start = today.atStartOfDay(KOREA).toOffsetDateTime();
        OffsetDateTime end = today.plusDays(1).atStartOfDay(KOREA).toOffsetDateTime();

        long todayCount = catTowerVisitRepository.countDistinctVisitorsBetween(roomOwnerId, start, end);
        long totalCount = catTowerVisitRepository.countByRoomOwnerUserId(roomOwnerId);

        return CatTowerVisitorStatsDto.builder()
                .todayCount(todayCount)
                .totalCount(totalCount)
                .build();
    }

    private static Long requireUserId(Long userId) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("userId가 올바르지 않습니다.");
        }
        return userId;
    }
}
