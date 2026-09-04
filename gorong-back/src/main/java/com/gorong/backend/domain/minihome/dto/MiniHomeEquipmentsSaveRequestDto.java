package com.gorong.backend.domain.minihome.dto;

import jakarta.validation.Valid;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class MiniHomeEquipmentsSaveRequestDto {

    private Long headItemId;
    private Long faceItemId;
    private Long neckItemId;
    /** @deprecated 장식(BADGE) 슬롯 퇴역 */
    private Long badgeItemId;

    /** @deprecated 레거시 슬롯 */
    private Long bodyItemId;
    private Long accessoryItemId;

    @Valid
    private List<SlotEquipDto> equipments;

    public List<SlotEquipDto> resolveSlotEquips() {
        if (equipments != null && !equipments.isEmpty()) {
            return equipments;
        }
        List<SlotEquipDto> list = new ArrayList<>(3);
        list.add(slot("HEAD", headItemId));
        list.add(slot("FACE", faceItemId));
        list.add(slot("NECK", neckItemId));
        return list;
    }

    private static SlotEquipDto slot(String slotType, Long itemId) {
        SlotEquipDto dto = new SlotEquipDto();
        dto.setSlotType(slotType);
        dto.setItemId(itemId);
        return dto;
    }

    @Getter
    @Setter
    public static class SlotEquipDto {
        private String slotType;
        private Long itemId;
    }
}
