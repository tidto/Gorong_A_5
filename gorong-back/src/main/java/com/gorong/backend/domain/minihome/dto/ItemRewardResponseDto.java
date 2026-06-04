package com.gorong.backend.domain.minihome.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ItemRewardResponseDto {
    private final boolean granted;
    private final String itemCode;
    private final String itemName;
    private final String message;
}
