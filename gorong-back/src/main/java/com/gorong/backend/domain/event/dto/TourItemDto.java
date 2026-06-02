package com.gorong.backend.domain.event.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TourItemDto {
    private String title;
    private String addr1;

    @JsonProperty("mapx")
    private String mapx;

    @JsonProperty("mapy")
    private String mapy;

    private String firstimage;
    private String firstimage2;
    private String contentid;
    private String tel;
    private String eventstartdate;
    private String eventenddate;
    private String modifiedtime;

    private String overview;
    private String parking;
    private String elevator;
    private String restroom;
    private String route;

    private String areacode;
    private String sigungucode;
    private String cat1;
}
