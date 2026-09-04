package com.gorong.backend.domain.minihome.dto;

import com.gorong.backend.domain.minihome.entity.GoCat;
import com.gorong.backend.domain.minihome.entity.MiniHome;
import lombok.Builder;
import lombok.Getter;

import java.util.Map;

@Getter
@Builder
public class MiniHomeResponseDto {

    private Long miniHomeId;
    private Long userId;
    private Long userId2;
    private String description;
    private String themeCode;
    private Boolean isPublic;
    private GoCatDto cat;

    public static MiniHomeResponseDto from(MiniHome m, GoCat cat) {
        return MiniHomeResponseDto.builder()
                .miniHomeId(m.getMiniHomeId())
                .userId(m.getUserId())
                .userId2(m.getUserId2())
                .description(m.getDescription())
                .themeCode(m.getThemeCode())
                .isPublic(m.getIsPublic())
                .cat(GoCatDto.from(cat))
                .build();
    }

    @Getter
    @Builder
    public static class GoCatDto {
        private Long goCatId;
        private Long miniHomeId;
        private Long userId;
        private String catName;
        private String characterType;
        private Map<String, Object> appearanceState;
        private Boolean appearanceConfigured;
        private Integer temperatureTotal;
        private Integer level;

        public static GoCatDto from(GoCat c) {
            if (c == null) return null;

            Map<String, Object> state = c.getAppearanceState();
            int temp = 0;
            Object t = state != null ? state.get("temperatureTotal") : null;
            if (t instanceof Number) temp = ((Number) t).intValue();

            String growthStage = growthStageFromExp(temp);

            return GoCatDto.builder()
                    .goCatId(c.getGoCatId())
                    .miniHomeId(c.getMiniHomeId())
                    .userId(c.getUserId())
                    .catName(c.getCatName())
                    .characterType(growthStage)
                    .appearanceState(state)
                    .appearanceConfigured(readAppearanceConfigured(state))
                    .temperatureTotal(temp)
                    .level(calcLevel(temp))
                    .build();
        }

        static Boolean readAppearanceConfigured(Map<String, Object> state) {
            if (state == null) return false;
            Object v = state.get("appearanceConfigured");
            if (Boolean.TRUE.equals(v)) return true;
            if ("true".equalsIgnoreCase(String.valueOf(v))) return true;
            if (Boolean.FALSE.equals(v)) return false;
            if ("false".equalsIgnoreCase(String.valueOf(v))) return false;
            return false;
        }

        private static int calcLevel(int temperatureTotal) {
            return Math.max(1, (temperatureTotal / 100) + 1);
        }

        static String growthStageFromExp(int exp) {
            if (exp >= 600) return "MASTER";
            if (exp >= 300) return "ADULT";
            if (exp >= 100) return "TEEN";
            return "BASIC";
        }
    }
}

