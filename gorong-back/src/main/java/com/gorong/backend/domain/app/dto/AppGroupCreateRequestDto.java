package com.gorong.backend.domain.app.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class AppGroupCreateRequestDto {
    private String venueId;
    private Integer maxMembers;
    private String title;
    private String event;
    private String eventContentId;
    private String location;
    private String content;
    private String meetingDate;
    private String meetingTime;
    private String condition;
}
