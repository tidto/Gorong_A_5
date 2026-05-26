package com.gorong.backend.domain.minihome.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MiniHomeEquipRequestDto {
    @NotNull(message = "itemId는 필수입니다.")
    private Long itemId;

    @NotBlank(message = "slotType은 필수입니다.")
    private String slotType;
}

