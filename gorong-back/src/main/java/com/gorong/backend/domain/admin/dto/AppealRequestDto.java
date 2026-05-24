package com.gorong.backend.domain.admin.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class AppealRequestDto {

    @NotBlank
    private String appealText;
}
