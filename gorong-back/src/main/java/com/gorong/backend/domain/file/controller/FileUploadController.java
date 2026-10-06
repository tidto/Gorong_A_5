package com.gorong.backend.domain.file.controller;

import com.gorong.backend.domain.app.service.AppArrivalService;
import com.gorong.backend.domain.file.dto.FileUploadResponseDto;
import com.gorong.backend.domain.file.model.UploadSourceType;
import com.gorong.backend.domain.file.service.GalleryAutoSaveService;
import com.gorong.backend.domain.file.service.S3StorageService;
import com.gorong.backend.domain.minihome.service.MiniHomeUserResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
public class FileUploadController {

    private final S3StorageService s3StorageService;
    private final GalleryAutoSaveService galleryAutoSaveService;
    private final AppArrivalService appArrivalService;
    private final MiniHomeUserResolver miniHomeUserResolver;

    @PostMapping("/upload")
    public ResponseEntity<FileUploadResponseDto> upload(
            @RequestPart("file") MultipartFile file,
            @RequestParam(defaultValue = "APP_PHOTO") UploadSourceType sourceType,
            @RequestParam(defaultValue = "true") boolean autoSaveToGallery,
            @RequestParam(required = false) String referenceId,
            Authentication authentication
    ) {
        Long userId = miniHomeUserResolver.resolveUserId(authentication);

        String normalizedReferenceId = referenceId == null ? null : referenceId.trim();

        // 트레일 러닝아트는 반드시 트레일 기록(행사장)과 연결돼야 한다.
        // referenceId 없이 올라가면 백엔드가 REFERENCE_ID가 비어 있는 갤러리에 저장해
        // 트레일과 무관한 이미지가 갤러리에 노출된다.
        // S3 호출 전에 막아 잘못된 DB 행과 쓰레기 S3 객체가 함께 생기지 않게 한다.
        if (autoSaveToGallery
                && sourceType == UploadSourceType.TRAIL_ART
                && (normalizedReferenceId == null || normalizedReferenceId.isBlank())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "트레일 러닝아트는 트레일 기록이 있어야 갤러리에 저장할 수 있습니다."
            );
        }

        // POST_PHOTO는 리뷰/포스팅 이미지라 지오펜싱 대상이 아니다.
        if (normalizedReferenceId != null && !normalizedReferenceId.isBlank()
                && sourceType != UploadSourceType.POST_PHOTO
                && !appArrivalService.hasVerifiedArrival(authentication, normalizedReferenceId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "지오펜싱 참여 인증이 완료된 행사만 사진을 올릴 수 있습니다.");
        }

        FileUploadResponseDto uploaded = s3StorageService.upload(file, userId, sourceType);

        boolean saved = false;
        if (autoSaveToGallery) {
            try {
                galleryAutoSaveService.append(userId, uploaded.getFileUrl(), sourceType, normalizedReferenceId);
                saved = true;
            } catch (RuntimeException e) {
                // S3 업로드는 DB 트랜잭션 밖이라 롤백되지 않는다.
                // 갤러리 저장이 실패하면 DB에 아무 흔적도 없으므로 S3 객체도 되돌려 orphan을 남기지 않는다.
                s3StorageService.delete(uploaded.getKey());
                throw e;
            }
        }

        return ResponseEntity.ok(FileUploadResponseDto.builder()
                .fileUrl(uploaded.getFileUrl())
                .key(uploaded.getKey())
                .contentType(uploaded.getContentType())
                .size(uploaded.getSize())
                .gallerySaved(saved)
                .build());
    }
}
