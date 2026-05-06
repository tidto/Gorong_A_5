package com.gorong.backend.domain.minihome.dto;

import com.gorong.backend.domain.minihome.entity.GoCat;
import com.gorong.backend.domain.minihome.entity.MiniHome;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class MiniHomeResponseDto {

    private Long miniHomeId;
    private Long userId;
    private String description;
    private String themeCode;
    private Boolean isPublic;
    private GoCatDto cat;

    public static MiniHomeResponseDto from(MiniHome miniHome, GoCat goCat) {
        return MiniHomeResponseDto.builder()
                .miniHomeId(miniHome.getMiniHomeId())
                .userId(miniHome.getUserId())
                .description(miniHome.getDescription())
                .themeCode(miniHome.getThemeCode())
                .isPublic(miniHome.getIsPublic())
                .cat(GoCatDto.from(goCat))
                .build();
    }

    @Getter
    @Builder
    public static class GoCatDto {
        private Long goCatId;
        private String catName;
        private String characterType;
        private String appearanceState;

        public static GoCatDto from(GoCat goCat) {
            if (goCat == null) return null;

            return GoCatDto.builder()
                    .goCatId(goCat.getGoCatId())
                    .catName(goCat.getCatName())
                    .characterType(goCat.getCharacterType())
                    .appearanceState(goCat.getAppearanceState())
                    .build();
        }
    }
}
