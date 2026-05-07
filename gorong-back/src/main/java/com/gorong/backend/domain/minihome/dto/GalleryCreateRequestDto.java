package com.gorong.backend.domain.minihome.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GalleryCreateRequestDto {
    @NotBlank(message = "title은 필수입니다.")
    @Size(max = 100, message = "title은 100자 이하여야 합니다.")
    private String title;
    private String description;
}
