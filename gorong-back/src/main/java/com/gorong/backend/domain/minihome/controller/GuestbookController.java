package com.gorong.backend.domain.minihome.controller;

import com.gorong.backend.domain.minihome.dto.GuestbookCreateRequestDto;
import com.gorong.backend.domain.minihome.dto.GuestbookResponseDto;
import com.gorong.backend.domain.minihome.service.GuestbookService;
import com.gorong.backend.domain.minihome.service.MiniHomeUserResolver;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/guestbook")
@RequiredArgsConstructor
public class GuestbookController {

    private final GuestbookService guestbookService;
    private final MiniHomeUserResolver miniHomeUserResolver;

    /** 방명록 목록 — 최신순 */
    @GetMapping("/{roomOwnerId}")
    public List<GuestbookResponseDto> list(
            @PathVariable Long roomOwnerId,
            Authentication authentication
    ) {
        Long viewerUserId = miniHomeUserResolver.resolveUserIdOptional(authentication);
        return guestbookService.listByRoomOwner(roomOwnerId, viewerUserId);
    }

    /** 방명록 작성 — 로그인 필수, 타인 캣타워만 */
    @PostMapping
    public ResponseEntity<GuestbookResponseDto> create(
            Authentication authentication,
            @Valid @RequestBody GuestbookCreateRequestDto request
    ) {
        Long authorUserId = miniHomeUserResolver.resolveUserId(authentication);
        GuestbookResponseDto created = guestbookService.create(authorUserId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /** 방명록 삭제 — 작성자 또는 방 주인 */
    @DeleteMapping("/{guestbookId}")
    public ResponseEntity<Void> delete(
            Authentication authentication,
            @PathVariable Long guestbookId
    ) {
        Long requesterUserId = miniHomeUserResolver.resolveUserId(authentication);
        guestbookService.delete(guestbookId, requesterUserId);
        return ResponseEntity.noContent().build();
    }
}
