package com.gorong.backend.domain.app.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ArrivalRequestDto {
    @JsonProperty("venueId")
    private String venueId;
    @JsonProperty("lat")
    private double lat;
    @JsonProperty("lng")
    private double lng;
}