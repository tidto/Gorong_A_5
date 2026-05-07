package com.gorong.backend.domain.minihome.controller;

import com.gorong.backend.domain.minihome.dto.ActivityCreateRequestDto;
import com.gorong.backend.domain.minihome.dto.GalleryCreateRequestDto;
import com.gorong.backend.domain.minihome.dto.GalleryImageCreateRequestDto;
import com.gorong.backend.domain.minihome.dto.MiniHomeEquipRequestDto;
import com.gorong.backend.domain.minihome.dto.MiniHomeEquipmentDto;
import com.gorong.backend.domain.minihome.dto.MiniHomeItemDto;
import com.gorong.backend.domain.minihome.dto.MiniHomePageResponseDto;
import com.gorong.backend.domain.minihome.dto.MiniHomeResponseDto;
import com.gorong.backend.domain.minihome.dto.MiniHomeUpdateRequestDto;
import com.gorong.backend.domain.minihome.service.MiniHomeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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
    public MiniHomeResponseDto updateMiniHome(@PathVariable Long userId, @RequestBody MiniHomeUpdateRequestDto req) {
        return miniHomeService.updateMiniHome(userId, req);
    }

    @GetMapping("/{userId}/page")
    public MiniHomePageResponseDto getMiniHomePage(@PathVariable Long userId) {
        return miniHomeService.getMiniHomePage(userId);
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

    // Go냥이 꾸미기
    @GetMapping("/{userId}/items")
    public List<MiniHomeItemDto> getUserItems(@PathVariable Long userId) {
        return miniHomeService.getUserItems(userId);
    }

    @GetMapping("/{userId}/equipments")
    public List<MiniHomeEquipmentDto> getEquipments(@PathVariable Long userId) {
        return miniHomeService.getEquipments(userId);
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
}

