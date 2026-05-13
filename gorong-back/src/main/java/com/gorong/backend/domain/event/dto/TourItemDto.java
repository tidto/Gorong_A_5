package com.gorong.backend.domain.event.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TourItemDto {
    private String title;      // 장소 이름
    private String addr1;      // 주소

    // 프론트엔드 전달 시 key값을 소문자로 고정
    @JsonProperty("mapx")
    private String mapx;       // 경도

    @JsonProperty("mapy")
    private String mapy;       // 위도

    private String firstimage; // 대표 이미지
    private String contentid;  // 고유 ID

    // 무장애 정보 및 상세 내용
    private String overview;
    private String parking;
    private String elevator;
    private String restroom;
    private String route;

    // 추가
    private String areacode;    // [필수] getAreacode() 대응 (대구/경북 필터링용)
    private String cat1;        // [필수] getCat1() 대응 (A01 -> NA 매핑용)
}