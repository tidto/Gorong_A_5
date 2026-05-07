package com.gorong.backend.domain.minihome.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ActivityCreateRequestDto {
    @NotBlank(message = "activityType은 필수입니다.")
    private String activityType;
    private Long referenceId;
    private Integer temperatureChange;
}
