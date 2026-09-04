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

        if (referenceId != null && !referenceId.isBlank()
                && sourceType == UploadSourceType.APP_PHOTO
                && !appArrivalService.hasVerifiedArrival(authentication, referenceId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "지오펜싱 참여 인증이 완료된 행사만 사진을 올릴 수 있습니다.");
        }

        FileUploadResponseDto uploaded = s3StorageService.upload(file, userId, sourceType);

        boolean saved = false;
        if (autoSaveToGallery) {
            galleryAutoSaveService.append(userId, uploaded.getFileUrl(), sourceType, referenceId);
            saved = true;
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
