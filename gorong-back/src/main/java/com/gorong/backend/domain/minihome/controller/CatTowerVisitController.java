package com.gorong.backend.domain.minihome.controller;

import com.gorong.backend.domain.minihome.dto.CatTowerVisitorStatsDto;
import com.gorong.backend.domain.minihome.service.CatTowerVisitService;
import com.gorong.backend.domain.minihome.service.MiniHomeUserResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cattower/{roomOwnerId}/visitors")
@RequiredArgsConstructor
public class CatTowerVisitController {

    private final CatTowerVisitService catTowerVisitService;
    private final MiniHomeUserResolver miniHomeUserResolver;

    @GetMapping("/stats")
    public CatTowerVisitorStatsDto stats(@PathVariable Long roomOwnerId) {
        return catTowerVisitService.getStats(roomOwnerId);
    }

    @PostMapping
    public ResponseEntity<CatTowerVisitorStatsDto> record(
            Authentication authentication,
            @PathVariable Long roomOwnerId
    ) {
        Long visitorUserId = miniHomeUserResolver.resolveUserId(authentication);
        CatTowerVisitorStatsDto stats = catTowerVisitService.recordVisit(roomOwnerId, visitorUserId);
        return ResponseEntity.status(HttpStatus.CREATED).body(stats);
    }
}
