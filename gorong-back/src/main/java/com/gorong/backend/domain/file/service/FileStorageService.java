package com.gorong.backend.domain.file.service;

import com.gorong.backend.domain.file.dto.FileUploadResponseDto;
import com.gorong.backend.domain.file.model.UploadSourceType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Set;
import java.util.UUID;

/**
 * 업로드 이미지를 로컬 폴더에 저장합니다. (기존 S3StorageService 대체)
 * 저장 규칙은 기존과 동일합니다: users/{userId}/{sourceType}/{yyyyMMdd}/{uuid}.{ext}
 * 저장된 파일은 {base-url}/uploads/{key} 주소로 제공됩니다.
 */
@Slf4j
@Service
public class FileStorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );
    private static final long MAX_FILE_SIZE = 10L * 1024L * 1024L;

    private final Path rootDir;
    private final String baseUrl;

    public FileStorageService(
            @Value("${app.storage.local-dir:./uploads}") String localDir,
            @Value("${app.storage.base-url:http://localhost:8080}") String baseUrl
    ) {
        this.rootDir = Paths.get(localDir).toAbsolutePath().normalize();
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }

    public FileUploadResponseDto upload(MultipartFile file, Long userId, UploadSourceType sourceType) {
        validate(file);

        String extension = resolveExtension(file.getOriginalFilename(), file.getContentType());
        String date = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        String key = "users/" + userId + "/" + sourceType.name().toLowerCase() + "/" + date + "/" + UUID.randomUUID() + extension;

        try {
            Path target = rootDir.resolve(key).normalize();
            if (!target.startsWith(rootDir)) {
                throw new IllegalArgumentException("잘못된 저장 경로입니다.");
            }
            Files.createDirectories(target.getParent());
            Files.write(target, file.getBytes());
        } catch (IOException e) {
            throw new IllegalStateException("파일 업로드에 실패했습니다.", e);
        }

        return FileUploadResponseDto.builder()
                .fileUrl(baseUrl + "/uploads/" + key)
                .key(key)
                .contentType(file.getContentType())
                .size(file.getSize())
                .gallerySaved(false)
                .build();
    }

    /**
     * key(users/...) 또는 전체 URL 모두 받을 수 있습니다.
     * 파일이 이미 없거나 삭제에 실패해도 예외를 던지지 않습니다. (DB 처리 결과를 깨지 않기 위함)
     */
    public void delete(String keyOrUrl) {
        if (keyOrUrl == null || keyOrUrl.isBlank()) {
            return;
        }
        int idx = keyOrUrl.indexOf("users/");
        if (idx < 0) {
            log.warn("삭제 대상 경로를 해석할 수 없습니다: {}", keyOrUrl);
            return;
        }
        String key = keyOrUrl.substring(idx);
        int query = key.indexOf('?');
        if (query >= 0) {
            key = key.substring(0, query);
        }

        try {
            Path target = rootDir.resolve(key).normalize();
            if (!target.startsWith(rootDir)) {
                log.warn("허용되지 않은 삭제 경로입니다: {}", key);
                return;
            }
            Files.deleteIfExists(target);
        } catch (IOException e) {
            log.warn("파일 삭제에 실패했습니다: {}", key, e);
        }
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("업로드 파일이 비어 있습니다.");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("파일 용량은 10MB 이하여야 합니다.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("지원하지 않는 이미지 형식입니다. jpeg/png/webp만 허용됩니다.");
        }
    }

    private String resolveExtension(String originalFilename, String contentType) {
        if (originalFilename != null && originalFilename.contains(".")) {
            return originalFilename.substring(originalFilename.lastIndexOf('.')).toLowerCase();
        }
        if ("image/png".equalsIgnoreCase(contentType)) return ".png";
        if ("image/webp".equalsIgnoreCase(contentType)) return ".webp";
        return ".jpg";
    }
}
