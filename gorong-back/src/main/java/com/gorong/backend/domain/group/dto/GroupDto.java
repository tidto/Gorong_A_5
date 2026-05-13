package com.gorong.backend.domain.group.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GroupDto {
    private String title;
    private String content;
    private String event;       // 행사명
    private String location;    // 상세 장소 (프론트에서 event와 동일하게 보낼 예정)
    private Integer maxCapacity;
    private String meetingDate;
    private String meetingTime;
    private String condition;
}
