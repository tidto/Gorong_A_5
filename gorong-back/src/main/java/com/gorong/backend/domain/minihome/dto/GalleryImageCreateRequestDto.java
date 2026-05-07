package com.gorong.backend.domain.minihome.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
public class GalleryImageCreateRequestDto {
    @NotBlank(message = "imageUrl은 필수입니다.")
    private String imageUrl;
    private String locationName;
    private OffsetDateTime takenAt;
}
