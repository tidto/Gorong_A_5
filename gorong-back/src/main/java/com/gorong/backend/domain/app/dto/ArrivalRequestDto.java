package com.gorong.backend.domain.app.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ArrivalRequestDto {
    private String venueId;
    private double lat;   // 앱에서 보낸 현재 위치
    private double lng;
}