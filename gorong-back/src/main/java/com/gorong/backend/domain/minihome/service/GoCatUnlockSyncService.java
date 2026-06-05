package com.gorong.backend.domain.minihome.service;

import com.gorong.backend.domain.group.entity.EventParticipation;
import com.gorong.backend.domain.group.repository.EventParticipationRepository;
import com.gorong.backend.domain.minihome.entity.ActivityLog;
import com.gorong.backend.domain.minihome.entity.GoCat;
import com.gorong.backend.domain.minihome.repository.ActivityLogRepository;
import com.gorong.backend.domain.minihome.repository.GoCatRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Go냥이·방 꾸미기 해금 동기화 — 별도 빈으로 분리해 readOnly/self-invocation에서도 DB 반영.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GoCatUnlockSyncService {

    private static final String EVENT_PARTICIPATION_TYPE = "EVENT_PARTICIPATION";

    private final ActivityLogRepository activityLogRepository;
    private final EventParticipationRepository eventParticipationRepository;
    private final GoCatItemUnlockService goCatItemUnlockService;
    private final GoCatRoomUnlockService goCatRoomUnlockService;
    private final EventCategoryItemRewardService eventCategoryItemRewardService;
    private final GoCatRepository goCatRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void syncAllForUser(Long userId) {
        if (userId == null || userId <= 0) {
            return;
        }
        backfillEventParticipationActivities(userId);
        goCatItemUnlockService.syncUnlocksForUser(userId);
        goCatRoomUnlockService.syncRoomUnlocksForUser(userId);
    }

    private void backfillEventParticipationActivities(Long userId) {
        List<EventParticipation> participations =
                eventParticipationRepository.findByUser_IdWithGroupPostOrderByAppliedAtDesc(userId);
        int backfilled = 0;
        for (EventParticipation ep : participations) {
            Long refId = participationReferenceId(ep);
            if (refId == null || refId <= 0) {
                continue;
            }
            if (activityLogRepository.existsByUserIdAndActivityTypeAndReferenceId(
                    userId, EVENT_PARTICIPATION_TYPE, refId)) {
                continue;
            }
            persistEventParticipationActivityOnly(userId, refId, ep.getEventTitle());
            backfilled++;
        }
        if (backfilled > 0) {
            log.info("[GoCatUnlockSync] backfilled {} EVENT_PARTICIPATION logs userId={}", backfilled, userId);
        }
    }

    private void persistEventParticipationActivityOnly(Long userId, Long referenceId, String eventTitle) {
        String resolvedEventTitle = (eventTitle != null && !eventTitle.isBlank())
                ? eventTitle.trim()
                : "행사";
        ActivityLog saved = activityLogRepository.save(ActivityLog.builder()
                .userId(userId)
                .activityType(EVENT_PARTICIPATION_TYPE)
                .referenceId(referenceId)
                .temperatureChange(50)
                .build());
        applyExpToCat(userId, 50);
        eventCategoryItemRewardService.tryGrantForActivity(
                userId,
                EVENT_PARTICIPATION_TYPE,
                referenceId,
                "행사 참여",
                resolvedEventTitle + " 참여 신청"
        );
        log.debug(
                "[GoCatUnlockSync] activityId={} userId={} refId={}",
                saved.getActivityId(),
                userId,
                referenceId
        );
    }

    private static Long participationReferenceId(EventParticipation ep) {
        if (ep == null) {
            return null;
        }
        if (ep.getGroupPost() != null && ep.getGroupPost().getId() != null) {
            return ep.getGroupPost().getId();
        }
        return MiniHomeService.soloEventReferenceId(ep.getEventContentId());
    }

    private void applyExpToCat(Long userId, int delta) {
        GoCat cat = goCatRepository.findFirstByUserIdOrderByGoCatIdAsc(userId).orElse(null);
        if (cat == null) {
            return;
        }
        int total = readTemperatureTotal(cat) + delta;
        Map<String, Object> state = cat.getAppearanceState() != null
                ? new HashMap<>(cat.getAppearanceState())
                : new HashMap<>();
        state.put("temperatureTotal", total);
        long activityCount = activityLogRepository.countByUserId(userId);
        String stage = GrowthStageResolver.effectiveGrowthStage(activityCount, total, state);
        state.put("growthStage", stage);
        state.put("level", MiniHomeService.calcLevel(total));
        cat.setAppearanceState(state);
        cat.setCharacterType(stage);
        goCatRepository.save(cat);
    }

    private static int readTemperatureTotal(GoCat cat) {
        if (cat.getAppearanceState() == null) {
            return 0;
        }
        Object raw = cat.getAppearanceState().get("temperatureTotal");
        if (raw instanceof Number n) {
            return n.intValue();
        }
        return 0;
    }
}
