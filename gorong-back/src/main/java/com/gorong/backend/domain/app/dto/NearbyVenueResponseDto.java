package com.gorong.backend.domain.app.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NearbyVenueResponseDto {
    private String id;
    private String name;
    private double lat;
    private double lng;
    private int radius;       // 지오펜스 반경 (기본 150m)
    private String address;
    private String category;
    private String imageUrl;
    private String barrierFreeInfo;
}