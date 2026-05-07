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
        private Integer temperatureTotal;
        private Integer level;

        public static GoCatDto from(GoCat c) {
            if (c == null) return null;

            int temp = 0;
            Object t = c.getAppearanceState() != null ? c.getAppearanceState().get("temperatureTotal") : null;
            if (t instanceof Number) temp = ((Number) t).intValue();

            return GoCatDto.builder()
                    .goCatId(c.getGoCatId())
                    .miniHomeId(c.getMiniHomeId())
                    .userId(c.getUserId())
                    .catName(c.getCatName())
                    .characterType(c.getCharacterType())
                    .appearanceState(c.getAppearanceState())
                    .temperatureTotal(temp)
                    .level(calcLevel(temp))
                    .build();
        }

        private static int calcLevel(int temperatureTotal) {
            // 간단 레벨 규칙: 0~99 => 레벨 1, 100~199 => 레벨 2 ...
            return Math.max(1, (temperatureTotal / 100) + 1);
        }
    }
}

