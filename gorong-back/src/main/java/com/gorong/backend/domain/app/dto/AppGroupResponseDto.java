package com.gorong.backend.domain.app.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AppGroupResponseDto {
    private Long id;
    private String title;
    private String event;
    private String location;
    private Integer maxMembers;
    private Integer currentMembers;
    private boolean joined;
    private boolean gathered;
    private String status;
}
