package com.gorong.backend.domain.minihome.dto;

import com.gorong.backend.domain.minihome.entity.ActivityLog;
import com.gorong.backend.domain.minihome.entity.CatEquip;
import com.gorong.backend.domain.minihome.entity.GalleryImage;
import com.gorong.backend.domain.minihome.entity.Item;
import com.gorong.backend.domain.minihome.entity.MiniHomeGallery;
import lombok.Builder;
import lombok.Getter;

import java.time.OffsetDateTime;
import java.util.List;

@Getter
@Builder
public class MiniHomePageResponseDto {

    private MiniHomeResponseDto miniHome;
    private StatsDto stats;
    private List<ActivityDto> activities;
    private List<GalleryDto> galleries;
    private List<EquipDto> activeEquips;

    @Getter
    @Builder
    public static class StatsDto {
        private long activityCount;
        private int temperatureTotal;
        private int level;
    }

    @Getter
    @Builder
    public static class ActivityDto {
        private Long activityId;
        private String activityType;
        private Long referenceId;
        private Integer temperatureChange;
        private OffsetDateTime createAt;

        public static ActivityDto from(ActivityLog a) {
            return ActivityDto.builder()
                    .activityId(a.getActivityId())
                    .activityType(a.getActivityType())
                    .referenceId(a.getReferenceId())
                    .temperatureChange(a.getTemperatureChange())
                    .createAt(a.getCreateAt())
                    .build();
        }
    }

    @Getter
    @Builder
    public static class GalleryDto {
        private Long galleryId;
        private String title;
        private String description;
        private OffsetDateTime createAt;
        private List<GalleryImageDto> images;

        public static GalleryDto from(MiniHomeGallery g, List<GalleryImage> images) {
            return GalleryDto.builder()
                    .galleryId(g.getGalleryId())
                    .title(g.getTitle())
                    .description(g.getDescription())
                    .createAt(g.getCreateAt())
                    .images(images.stream().map(GalleryImageDto::from).toList())
                    .build();
        }
    }

    @Getter
    @Builder
    public static class GalleryImageDto {
        private Long galleryImageId;
        private String imageUrl;
        private String locationName;
        private OffsetDateTime takenAt;
        private OffsetDateTime createAt;

        public static GalleryImageDto from(GalleryImage i) {
            return GalleryImageDto.builder()
                    .galleryImageId(i.getGalleryImageId())
                    .imageUrl(i.getImageUrl())
                    .locationName(i.getLocationName())
                    .takenAt(i.getTakenAt())
                    .createAt(i.getCreateAt())
                    .build();
        }
    }

    @Getter
    @Builder
    public static class EquipDto {
        private Long catEquipId;
        private String slotType;
        private OffsetDateTime equippedAt;
        private Long itemId;
        private String itemCode;
        private String itemName;
        private String itemType;
        private String imageUrl;

        public static EquipDto from(CatEquip e, Item item) {
            return EquipDto.builder()
                    .catEquipId(e.getCatEquipId())
                    .slotType(e.getSlotType())
                    .equippedAt(e.getEquippedAt())
                    .itemId(e.getItemId())
                    .itemCode(item != null ? item.getItemCode() : null)
                    .itemName(item != null ? item.getItemName() : null)
                    .itemType(item != null ? item.getItemType() : null)
                    .imageUrl(item != null ? item.getImageUrl() : null)
                    .build();
        }
    }
}

