package com.gorong.backend.domain.app.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class AppGroupCreateRequestDto {
    private String venueId;
    private Integer maxMembers;
}
