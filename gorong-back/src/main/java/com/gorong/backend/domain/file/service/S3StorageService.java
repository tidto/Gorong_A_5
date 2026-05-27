package com.gorong.backend.domain.file.service;

import com.gorong.backend.domain.file.dto.FileUploadResponseDto;
import com.gorong.backend.domain.file.model.UploadSourceType;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class S3StorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp"
    );
    private static final long MAX_FILE_SIZE = 10L * 1024L * 1024L;

    private final S3Client s3Client;

    @Value("${aws.s3.bucket}")
    private String bucket;

    @Value("${aws.s3.base-url}")
    private String baseUrl;

    public FileUploadResponseDto upload(MultipartFile file, Long userId, UploadSourceType sourceType) {
        validate(file);

        String extension = resolveExtension(file.getOriginalFilename(), file.getContentType());
        String date = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        String key = "users/" + userId + "/" + sourceType.name().toLowerCase() + "/" + date + "/" + UUID.randomUUID() + extension;

        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromBytes(file.getBytes()));
        } catch (IOException e) {
            throw new IllegalStateException("파일 업로드에 실패했습니다.", e);
        }

        return FileUploadResponseDto.builder()
                .fileUrl(baseUrl + "/" + key)
                .key(key)
                .contentType(file.getContentType())
                .size(file.getSize())
                .gallerySaved(false)
                .build();
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
