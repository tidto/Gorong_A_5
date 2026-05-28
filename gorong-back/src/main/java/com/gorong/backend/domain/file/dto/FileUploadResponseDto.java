package com.gorong.backend.domain.file.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FileUploadResponseDto {
    private String fileUrl;
    private String key;
    private String contentType;
    private long size;
    private boolean gallerySaved;
}
