package com.gorong.backend.domain.app.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class TrailSaveRequestDto {
    private String venueId;
    private List<TrailPointDto> trail;

    @Getter
    @NoArgsConstructor
    public static class TrailPointDto {
        private double lat;
        private double lng;
        private long timestamp;
    }
}
