package com.gorong.backend.domain.app.controller;

import com.gorong.backend.domain.app.dto.AppGroupCreateRequestDto;
import com.gorong.backend.domain.app.dto.AppGroupResponseDto;
import com.gorong.backend.domain.app.service.AppGroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/app/groups")
@RequiredArgsConstructor
public class AppGroupController {

    private final AppGroupService appGroupService;

    @GetMapping
    public ResponseEntity<List<AppGroupResponseDto>> getGroups(Authentication authentication) {
        return ResponseEntity.ok(appGroupService.getGroups(authentication));
    }

    @PostMapping
    public ResponseEntity<AppGroupResponseDto> createGroup(
            @RequestBody AppGroupCreateRequestDto requestDto,
            Authentication authentication
    ) {
        try {
            return ResponseEntity.ok(appGroupService.createGroup(authentication, requestDto));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    @PostMapping("/{groupId}/join")
    public ResponseEntity<AppGroupResponseDto> joinGroup(
            @PathVariable Long groupId,
            Authentication authentication
    ) {
        try {
            return ResponseEntity.ok(appGroupService.joinGroup(authentication, groupId));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{groupId}/gather")
    public ResponseEntity<AppGroupResponseDto> gatherGroup(
            @PathVariable Long groupId,
            Authentication authentication
    ) {
        try {
            return ResponseEntity.ok(appGroupService.gatherGroup(authentication, groupId));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
