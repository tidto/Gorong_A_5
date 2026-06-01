package com.gorong.backend.domain.admin.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class BanUserRequestDto {

    private Long reportId;

    @NotBlank
    private String banReason;

    @Min(0)
    @Max(30)
    private Integer banDays;
}
