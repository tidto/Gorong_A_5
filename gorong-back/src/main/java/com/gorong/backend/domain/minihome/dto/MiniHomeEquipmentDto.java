package com.gorong.backend.domain.minihome.dto;

import com.gorong.backend.domain.minihome.entity.CatEquip;
import com.gorong.backend.domain.minihome.entity.Item;
import lombok.Builder;
import lombok.Getter;

import java.time.OffsetDateTime;

@Getter
@Builder
public class MiniHomeEquipmentDto {
    private Long catEquipId;
    private Long goCatId;
    private String slotType;
    private Long itemId;
    private String itemCode;
    private String itemName;
    private String itemType;
    private String imageUrl;
    private Boolean isActive;
    private OffsetDateTime equippedAt;

    public static MiniHomeEquipmentDto from(CatEquip e, Item item) {
        return MiniHomeEquipmentDto.builder()
                .catEquipId(e.getCatEquipId())
                .goCatId(e.getGoCatId())
                .slotType(e.getSlotType())
                .itemId(e.getItemId())
                .itemCode(item != null ? item.getItemCode() : null)
                .itemName(item != null ? item.getItemName() : null)
                .itemType(item != null ? item.getItemType() : null)
                .imageUrl(item != null ? item.getImageUrl() : null)
                .isActive(e.getIsActive())
                .equippedAt(e.getEquippedAt())
                .build();
    }
}

