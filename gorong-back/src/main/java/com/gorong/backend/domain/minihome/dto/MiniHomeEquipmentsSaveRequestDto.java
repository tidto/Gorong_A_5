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
    private Long bodyItemId;
    private Long accessoryItemId;

    @Valid
    private List<SlotEquipDto> equipments;

    /** headItemId 형식 또는 equipments 배열을 슬롯 목록으로 통일합니다. */
    public List<SlotEquipDto> resolveSlotEquips() {
        if (equipments != null && !equipments.isEmpty()) {
            return equipments;
        }
        List<SlotEquipDto> list = new ArrayList<>(3);
        list.add(slot("HEAD", headItemId));
        list.add(slot("BODY", bodyItemId));
        list.add(slot("ACCESSORY", accessoryItemId));
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
