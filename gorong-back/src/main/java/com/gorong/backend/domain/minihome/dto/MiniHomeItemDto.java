package com.gorong.backend.domain.minihome.dto;

import com.gorong.backend.domain.minihome.entity.Item;
import com.gorong.backend.domain.minihome.entity.UserItem;
import lombok.Builder;
import lombok.Getter;

import java.time.OffsetDateTime;

@Getter
@Builder
public class MiniHomeItemDto {
    private Long userItemId;
    private Long itemId;
    private String itemCode;
    private String itemName;
    private String itemType;
    private String imageUrl;
    private OffsetDateTime acquiredAt;

    public static MiniHomeItemDto from(UserItem ui, Item item) {
        return MiniHomeItemDto.builder()
                .userItemId(ui.getUserItemId())
                .itemId(ui.getItemId())
                .itemCode(item != null ? item.getItemCode() : null)
                .itemName(item != null ? item.getItemName() : null)
                .itemType(item != null ? item.getItemType() : null)
                .imageUrl(item != null ? item.getImageUrl() : null)
                .acquiredAt(ui.getAcquiredAt())
                .build();
    }
}

