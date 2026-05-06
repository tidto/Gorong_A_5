package com.gorong.backend.domain.minihome.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MiniHomeUpdateRequestDto {
    private String description;
    private String themeCode;
    private Boolean isPublic;
    
    // 꾸미기 기능 추가
    private String furnitureItems;      // 배치된 가구 (JSON)
    private String backgroundColor;    // 방 배경색
    private String characterColor;     // 캐릭터 색상
    private String characterPattern;   // 캐릭터 패턴
}
