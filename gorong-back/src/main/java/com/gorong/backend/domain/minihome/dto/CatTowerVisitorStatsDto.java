package com.gorong.backend.domain.minihome.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CatTowerVisitorStatsDto {

    private long todayCount;
    private long totalCount;
}
