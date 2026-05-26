package com.gorong.backend.domain.minihome.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MiniHomeUpdateRequestDto {
    private String description;
    private String themeCode;
    private Boolean isPublic;
}

