package com.gorong.backend.domain.event.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

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

    private String overview;
    private String parking;
    private String elevator;
    private String restroom;
    private String route;

    private String areacode;
    private String cat1;

    private String eventStartDate;
    private String eventEndDate;

    private String tel;

    // 무장애 추가 필드
    private String wheelchair;
    private String exit;
    private String publicTransport;
    private String braileBlock;
    private String audioGuide;
    private String helpDog;
    private String signGuide;
    private String videoGuide;
    private String stroller;

    // 관광사진 추가 이미지 (쉼표 구분)
    private String galleryImages;
}