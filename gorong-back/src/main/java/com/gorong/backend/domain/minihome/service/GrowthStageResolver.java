package com.gorong.backend.domain.minihome.service;

import java.util.Locale;
import java.util.Map;

/** 활동 횟수·온도(경험치)·appearance_state 중 가장 높은 성장 단계 */
public final class GrowthStageResolver {

    private static final String[] ORDER = {"BASIC", "TEEN", "ADULT", "MASTER"};

    private GrowthStageResolver() {
    }

    public static String effectiveGrowthStage(long activityCount, int temperatureTotal, Map<String, Object> appearanceState) {
        String best = "BASIC";
        best = maxStage(best, MiniHomeService.growthStageFromActivityCount(activityCount));
        best = maxStage(best, MiniHomeService.growthStageFromExp(temperatureTotal));
        if (appearanceState != null) {
            Object raw = appearanceState.get("growthStage");
            if (raw != null) {
                best = maxStage(best, normalizeStage(String.valueOf(raw)));
            }
        }
        return best;
    }

    public static boolean isAtLeast(String stage, String minimum) {
        return indexOf(normalizeStage(stage)) >= indexOf(normalizeStage(minimum));
    }

    private static String maxStage(String a, String b) {
        return indexOf(normalizeStage(a)) >= indexOf(normalizeStage(b)) ? normalizeStage(a) : normalizeStage(b);
    }

    private static String normalizeStage(String raw) {
        if (raw == null || raw.isBlank()) {
            return "BASIC";
        }
        String key = raw.trim().toUpperCase(Locale.ROOT);
        return switch (key) {
            case "TEEN", "BRONZE" -> "TEEN";
            case "ADULT", "SILVER", "GOLD" -> "ADULT";
            case "MASTER", "LEGEND" -> "MASTER";
            default -> "BASIC";
        };
    }

    private static int indexOf(String stage) {
        for (int i = 0; i < ORDER.length; i++) {
            if (ORDER[i].equals(stage)) {
                return i;
            }
        }
        return 0;
    }
}
