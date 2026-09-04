package com.gorong.backend.domain.minihome.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ItemRewardRequestDto {

    @NotBlank
    private String eventTitle;

    private String description;
}
