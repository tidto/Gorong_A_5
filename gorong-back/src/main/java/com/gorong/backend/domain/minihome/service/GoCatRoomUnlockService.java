package com.gorong.backend.domain.minihome.service;

import com.gorong.backend.domain.minihome.entity.GoCat;
import com.gorong.backend.domain.group.repository.EventParticipationRepository;
import com.gorong.backend.domain.group.repository.GroupParticipantRepository;
import com.gorong.backend.domain.minihome.repository.ActivityLogRepository;
import com.gorong.backend.domain.minihome.repository.GuestbookRepository;
import com.gorong.backend.domain.minihome.repository.GoCatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * 방 꾸미기 아이템 해금 — GO_CAT.appearance_state.roomOwnedItemIds
 */
@Service
@RequiredArgsConstructor
public class GoCatRoomUnlockService {

    public static final String ID_BG_BASIC = "room_bg_basic";
    public static final String ID_BG_FOREST = "room_bg_forest";
    public static final String ID_BG_NIGHT = "room_bg_night";
    public static final String ID_PLANT = "room_plant";
    public static final String ID_LAMP = "room_lamp";
    public static final String ID_SOFA = "room_sofa";
    public static final String ID_STAR = "room_star";
    public static final String ID_SPEECH = "room_speech";

    private final ActivityLogRepository activityLogRepository;
    private final EventParticipationRepository eventParticipationRepository;
    private final GroupParticipantRepository groupParticipantRepository;
    private final GuestbookRepository guestbookRepository;
    private final GoCatRepository goCatRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void syncRoomUnlocksForUser(Long userId) {
        if (userId == null || userId <= 0) {
            return;
        }
        GoCat cat = goCatRepository.findFirstByUserIdOrderByGoCatIdAsc(userId).orElse(null);
        if (cat == null) {
            org.slf4j.LoggerFactory.getLogger(GoCatRoomUnlockService.class).warn(
                    "[GoCatRoomUnlock] skip — no GoCat for userId={} (create CatTower first)",
                    userId
            );
            return;
        }

        long eventCount = Math.max(
                activityLogRepository.countEventParticipations(userId),
                Math.max(
                        eventParticipationRepository.countByUser_Id(userId),
                        groupParticipantRepository.countByUser_Id(userId)
                )
        );
        long reviewCount = activityLogRepository.countReviewActivities(userId);
        long guestbookCount = guestbookRepository.countByRoomOwnerUserId(userId);
        long activityCount = activityLogRepository.countByUserId(userId);
        int temperatureTotal = readTemperatureTotal(cat);
        String growthStage = GrowthStageResolver.effectiveGrowthStage(
                activityCount,
                temperatureTotal,
                cat.getAppearanceState()
        );

        Set<String> owned = new LinkedHashSet<>();
        owned.add(ID_BG_BASIC);
        owned.add(ID_PLANT);

        if (eventCount >= 1 || GrowthStageResolver.isAtLeast(growthStage, "TEEN")) {
            owned.add(ID_BG_FOREST);
        }
        if (reviewCount >= 3) {
            owned.add(ID_LAMP);
        }
        if (guestbookCount >= 5) {
            owned.add(ID_SOFA);
        }
        if (GrowthStageResolver.isAtLeast(growthStage, "ADULT")) {
            owned.add(ID_BG_NIGHT);
        }
        if (eventCount >= 3 || GrowthStageResolver.isAtLeast(growthStage, "TEEN")) {
            owned.add(ID_STAR);
        }
        if (reviewCount >= 1) {
            owned.add(ID_SPEECH);
        }

        Map<String, Object> state = cat.getAppearanceState() != null
                ? new java.util.HashMap<>(cat.getAppearanceState())
                : new java.util.HashMap<>();
        state.put("roomOwnedItemIds", new ArrayList<>(owned));
        state.put("growthStage", growthStage);
        state.put("temperatureTotal", temperatureTotal);
        state.put("level", MiniHomeService.calcLevel(temperatureTotal));
        cat.setAppearanceState(state);
        cat.setCharacterType(growthStage);
        goCatRepository.save(cat);

        org.slf4j.LoggerFactory.getLogger(GoCatRoomUnlockService.class).info(
                "[GoCatRoomUnlock] userId={} eventCount={} reviewCount={} guestbookCount={} activityCount={} growthStage={} owned={}",
                userId,
                eventCount,
                reviewCount,
                guestbookCount,
                activityCount,
                growthStage,
                owned
        );
    }

    public static boolean isCatalogItemId(String itemId) {
        if (itemId == null || itemId.isBlank()) {
            return false;
        }
        String id = itemId.trim().toLowerCase(Locale.ROOT);
        return Set.of(
                ID_BG_BASIC, ID_BG_FOREST, ID_BG_NIGHT,
                ID_PLANT, ID_LAMP, ID_SOFA, ID_STAR, ID_SPEECH
        ).contains(id);
    }

    private static int readTemperatureTotal(GoCat cat) {
        if (cat == null || cat.getAppearanceState() == null) {
            return 0;
        }
        Object v = cat.getAppearanceState().get("temperatureTotal");
        if (v instanceof Number n) {
            return n.intValue();
        }
        return 0;
    }

    @SuppressWarnings("unchecked")
    public static Set<String> readOwnedIds(GoCat cat) {
        if (cat == null || cat.getAppearanceState() == null) {
            return Set.of(ID_BG_BASIC, ID_PLANT);
        }
        Object raw = cat.getAppearanceState().get("roomOwnedItemIds");
        if (!(raw instanceof List<?> list)) {
            return Set.of(ID_BG_BASIC, ID_PLANT);
        }
        Set<String> out = new LinkedHashSet<>();
        for (Object o : list) {
            if (o != null) {
                out.add(String.valueOf(o).trim().toLowerCase(Locale.ROOT));
            }
        }
        if (out.isEmpty()) {
            out.add(ID_BG_BASIC);
            out.add(ID_PLANT);
        }
        return out;
    }
}
