package com.gorong.backend.domain.minihome.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GuestbookCreateRequestDto {

    @NotNull(message = "roomOwnerId는 필수입니다.")
    @Positive(message = "roomOwnerId는 양수여야 합니다.")
    private Long roomOwnerId;

    @NotBlank(message = "내용은 필수입니다.")
    @Size(max = 500, message = "내용은 500자 이하여야 합니다.")
    private String content;
}
