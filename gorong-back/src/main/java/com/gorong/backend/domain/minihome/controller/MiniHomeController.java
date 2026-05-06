package com.gorong.backend.domain.minihome.controller;

import com.gorong.backend.domain.minihome.dto.MiniHomeResponseDto;
import com.gorong.backend.domain.minihome.dto.MiniHomeUpdateRequestDto;
import com.gorong.backend.domain.minihome.service.MiniHomeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/minihomes")
@RequiredArgsConstructor
public class MiniHomeController {

    private final MiniHomeService miniHomeService;

    @GetMapping("/{userId}")
    public MiniHomeResponseDto getMiniHome(@PathVariable Long userId) {
        return miniHomeService.getMiniHome(userId);
    }

    @PostMapping("/{userId}")
    public MiniHomeResponseDto createMiniHome(@PathVariable Long userId) {
        return miniHomeService.createMiniHome(userId);
    }

    @PatchMapping("/{userId}")
    public MiniHomeResponseDto updateMiniHome(
            @PathVariable Long userId,
            @RequestBody MiniHomeUpdateRequestDto request
    ) {
        return miniHomeService.updateMiniHome(userId, request);
    }
}
