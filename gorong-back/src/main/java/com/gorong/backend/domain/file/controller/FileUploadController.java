package com.gorong.backend.domain.file.controller;

import com.gorong.backend.domain.file.dto.FileUploadResponseDto;
import com.gorong.backend.domain.file.model.UploadSourceType;
import com.gorong.backend.domain.file.service.GalleryAutoSaveService;
import com.gorong.backend.domain.file.service.S3StorageService;
import com.gorong.backend.domain.minihome.service.MiniHomeUserResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
public class FileUploadController {

    private final S3StorageService s3StorageService;
    private final GalleryAutoSaveService galleryAutoSaveService;
    private final MiniHomeUserResolver miniHomeUserResolver;

    @PostMapping("/upload")
    public ResponseEntity<FileUploadResponseDto> upload(
            @RequestPart("file") MultipartFile file,
            @RequestParam(defaultValue = "APP_PHOTO") UploadSourceType sourceType,
            @RequestParam(defaultValue = "true") boolean autoSaveToGallery,
            Authentication authentication
    ) {
        Long userId = miniHomeUserResolver.resolveUserId(authentication);

        FileUploadResponseDto uploaded = s3StorageService.upload(file, userId, sourceType);

        boolean saved = false;
        if (autoSaveToGallery) {
            galleryAutoSaveService.append(userId, uploaded.getFileUrl(), sourceType);
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
