package com.gorong.backend.domain.minihome.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class UserPostHistoryPageDto {

    private List<UserPostHistoryItemDto> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean last;
    private long reviewCount;
    private long recruitmentCount;
}
