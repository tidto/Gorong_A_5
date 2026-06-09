package com.gorong.backend.domain.minihome.controller;

import com.gorong.backend.domain.minihome.dto.ActivityCreateRequestDto;
import com.gorong.backend.domain.minihome.dto.GoCatAppearanceUpdateRequestDto;
import com.gorong.backend.domain.minihome.dto.GoCatCreateRequestDto;
import com.gorong.backend.domain.minihome.dto.GalleryCreateRequestDto;
import com.gorong.backend.domain.minihome.dto.GalleryImageCreateRequestDto;
import com.gorong.backend.domain.minihome.dto.ItemRewardRequestDto;
import com.gorong.backend.domain.minihome.dto.ItemRewardResponseDto;
import com.gorong.backend.domain.minihome.dto.MiniHomeEquipRequestDto;
import com.gorong.backend.domain.minihome.dto.MiniHomeEquipmentsSaveRequestDto;
import com.gorong.backend.domain.minihome.dto.MiniHomeEquipmentDto;
import com.gorong.backend.domain.minihome.dto.MiniHomeItemDto;
import com.gorong.backend.domain.minihome.dto.MiniHomePageResponseDto;
import com.gorong.backend.domain.minihome.dto.MiniHomeResponseDto;
import com.gorong.backend.domain.minihome.dto.MiniHomeUpdateRequestDto;
import com.gorong.backend.domain.minihome.exception.MiniHomeForbiddenException;
import com.gorong.backend.domain.minihome.service.EventCategoryItemRewardService;
import com.gorong.backend.domain.minihome.service.MiniHomeService;
import com.gorong.backend.domain.minihome.service.MiniHomeUserResolver;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/minihomes")
@RequiredArgsConstructor
public class MiniHomeController {

    private final MiniHomeService miniHomeService;
    private final MiniHomeUserResolver miniHomeUserResolver;
    private final EventCategoryItemRewardService eventCategoryItemRewardService;

    @GetMapping("/me")
    public MiniHomeResponseDto getMyMiniHome(Authentication authentication) {
        Long userId = resolveUserId(authentication);
        return miniHomeService.getMiniHome(userId, userId);
    }

    @GetMapping("/me/page")
    public MiniHomePageResponseDto getMyMiniHomePage(Authentication authentication) {
        log.info("[MiniHomeController] ENTER GET /api/minihomes/me/page");
        logSecurityContext("before-resolve");
        Long userId = resolveUserId(authentication);
        log.info("[MiniHomeController] resolved userId={}", userId);
        return miniHomeService.getOrCreateMiniHomePage(userId);
    }

    @PostMapping("/me")
    public MiniHomeResponseDto createMyMiniHome(
            Authentication authentication,
            @RequestBody(required = false) @Valid GoCatCreateRequestDto req
    ) {
        log.info("[MiniHomeController] ENTER POST /api/minihomes/me");
        Long userId = resolveUserId(authentication);
        return miniHomeService.createMiniHome(userId, req);
    }

    /** 미니홈 설정 — 공개 여부·소개·테마 */
    @PatchMapping("/me")
    public MiniHomeResponseDto updateMyMiniHome(
            Authentication authentication,
            @RequestBody MiniHomeUpdateRequestDto req
    ) {
        return patchMyMiniHomeSettings(authentication, req);
    }

    /** PATCH 미지원 프록시/구버전 배포 호환 */
    @PutMapping("/me")
    public MiniHomeResponseDto putMyMiniHome(
            Authentication authentication,
            @RequestBody MiniHomeUpdateRequestDto req
    ) {
        return patchMyMiniHomeSettings(authentication, req);
    }

    private MiniHomeResponseDto patchMyMiniHomeSettings(
            Authentication authentication,
            MiniHomeUpdateRequestDto req
    ) {
        Long userId = resolveUserId(authentication);
        log.info("[MiniHomeController] PATCH /me settings userId={} isPublic={}", userId, req.getIsPublic());
        return miniHomeService.updateMiniHome(userId, req);
    }

    @GetMapping("/me/items")
    public List<MiniHomeItemDto> getMyItems(Authentication authentication) {
        Long userId = resolveUserId(authentication);
        return miniHomeService.getUserItems(userId);
    }

    /** 행사 참여 완료 시 보상 아이템 지급 (중복 지급 없음) */
    @PostMapping("/me/items/reward")
    public ItemRewardResponseDto grantEventItemReward(
            Authentication authentication,
            @Valid @RequestBody ItemRewardRequestDto req
    ) {
        Long userId = resolveUserId(authentication);
        return eventCategoryItemRewardService.grantForEventKeywords(
                userId,
                req.getEventTitle(),
                req.getDescription()
        );
    }

    @GetMapping("/me/equipments")
    public List<MiniHomeEquipmentDto> getMyEquipments(Authentication authentication) {
        Long userId = resolveUserId(authentication);
        return miniHomeService.getEquipments(userId);
    }

    @PutMapping("/me/equipments")
    public ResponseEntity<Void> saveMyEquipments(
            Authentication authentication,
            @Valid @RequestBody MiniHomeEquipmentsSaveRequestDto req
    ) {
        Long userId = resolveUserId(authentication);
        miniHomeService.saveEquipments(userId, req.resolveSlotEquips());
        return ResponseEntity.noContent().build();
    }

    /** Go냥이 체형·패턴·색상 — GO_CAT.appearance_state */
    @PatchMapping("/me/cat/appearance")
    public MiniHomeResponseDto.GoCatDto patchMyCatAppearance(
            Authentication authentication,
            @Valid @RequestBody GoCatAppearanceUpdateRequestDto req
    ) {
        return updateMyCatAppearance(authentication, req);
    }

    /** PATCH 미지원 프록시/구버전 배포 호환 */
    @PutMapping("/me/cat/appearance")
    public MiniHomeResponseDto.GoCatDto putMyCatAppearance(
            Authentication authentication,
            @Valid @RequestBody GoCatAppearanceUpdateRequestDto req
    ) {
        return updateMyCatAppearance(authentication, req);
    }

    @PostMapping("/me/cat/appearance")
    public MiniHomeResponseDto.GoCatDto postMyCatAppearance(
            Authentication authentication,
            @Valid @RequestBody GoCatAppearanceUpdateRequestDto req
    ) {
        return updateMyCatAppearance(authentication, req);
    }

    private MiniHomeResponseDto.GoCatDto updateMyCatAppearance(
            Authentication authentication,
            GoCatAppearanceUpdateRequestDto req
    ) {
        Long userId = resolveUserId(authentication);
        return miniHomeService.updateGoCatAppearance(userId, req);
    }

    @GetMapping("/{userId}")
    public MiniHomeResponseDto getMiniHome(
            @PathVariable Long userId,
            Authentication authentication
    ) {
        Long viewerUserId = miniHomeUserResolver.resolveUserIdOptional(authentication);
        return miniHomeService.getMiniHome(userId, viewerUserId);
    }

    @PostMapping("/{userId}")
    public MiniHomeResponseDto createMiniHome(
            @PathVariable Long userId,
            @RequestBody(required = false) @Valid GoCatCreateRequestDto req
    ) {
        return miniHomeService.createMiniHome(userId, req);
    }

    @PatchMapping("/{userId}")
    public MiniHomeResponseDto updateMiniHome(
            @PathVariable Long userId,
            Authentication authentication,
            @RequestBody MiniHomeUpdateRequestDto req
    ) {
        return patchMiniHomeSettings(userId, authentication, req);
    }

    /** PATCH 미지원 프록시/구버전 배포 호환 */
    @PutMapping("/{userId}")
    public MiniHomeResponseDto putMiniHome(
            @PathVariable Long userId,
            Authentication authentication,
            @RequestBody MiniHomeUpdateRequestDto req
    ) {
        return patchMiniHomeSettings(userId, authentication, req);
    }

    private MiniHomeResponseDto patchMiniHomeSettings(
            Long userId,
            Authentication authentication,
            MiniHomeUpdateRequestDto req
    ) {
        Long callerUserId = miniHomeUserResolver.resolveUserId(authentication);
        if (!callerUserId.equals(userId)) {
            throw new MiniHomeForbiddenException("본인 미니홈만 수정할 수 있어요.");
        }
        log.info("[MiniHomeController] PATCH /{} settings isPublic={}", userId, req.getIsPublic());
        return miniHomeService.updateMiniHome(userId, req);
    }

    @GetMapping("/{userId}/page")
    public MiniHomePageResponseDto getMiniHomePage(
            @PathVariable Long userId,
            Authentication authentication
    ) {
        Long viewerUserId = miniHomeUserResolver.resolveUserIdOptional(authentication);
        return miniHomeService.getMiniHomePage(userId, viewerUserId);
    }

    @PostMapping("/{userId}/activities")
    public MiniHomePageResponseDto.ActivityDto createActivity(@PathVariable Long userId, @Valid @RequestBody ActivityCreateRequestDto req) {
        return miniHomeService.createActivity(userId, req);
    }

    @PostMapping("/{userId}/galleries")
    public MiniHomePageResponseDto.GalleryDto createGallery(@PathVariable Long userId, @Valid @RequestBody GalleryCreateRequestDto req) {
        return miniHomeService.createGallery(userId, req);
    }

    @PostMapping("/galleries/{galleryId}/images")
    public MiniHomePageResponseDto.GalleryImageDto addGalleryImage(@PathVariable Long galleryId, @Valid @RequestBody GalleryImageCreateRequestDto req) {
        return miniHomeService.addGalleryImage(galleryId, req);
    }

    @GetMapping("/{userId}/items")
    public List<MiniHomeItemDto> getUserItems(@PathVariable Long userId) {
        return miniHomeService.getUserItems(userId);
    }

    @GetMapping("/{userId}/equipments")
    public List<MiniHomeEquipmentDto> getEquipments(@PathVariable Long userId) {
        return miniHomeService.getEquipments(userId);
    }

    @PutMapping("/{userId}/equipments")
    public ResponseEntity<Void> saveEquipments(
            @PathVariable Long userId,
            @Valid @RequestBody MiniHomeEquipmentsSaveRequestDto req
    ) {
        miniHomeService.saveEquipments(userId, req.resolveSlotEquips());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{userId}/equip")
    public MiniHomeEquipmentDto equip(@PathVariable Long userId, @Valid @RequestBody MiniHomeEquipRequestDto req) {
        return miniHomeService.equip(userId, req);
    }

    @DeleteMapping("/{userId}/equip/{slotType}")
    public ResponseEntity<Void> unequip(@PathVariable Long userId, @PathVariable String slotType) {
        miniHomeService.unequip(userId, slotType);
        return ResponseEntity.noContent().build();
    }

    private Long resolveUserId(Authentication authentication) {
        return miniHomeUserResolver.resolveUserId(authentication);
    }

    private void logSecurityContext(String phase) {
        Authentication ctx = SecurityContextHolder.getContext().getAuthentication();
        log.info(
                "[MiniHomeController] SecurityContext({}) authenticated={} principalType={}",
                phase,
                ctx != null && ctx.isAuthenticated(),
                ctx != null && ctx.getPrincipal() != null
                        ? ctx.getPrincipal().getClass().getSimpleName()
                        : "null"
        );
    }
}
