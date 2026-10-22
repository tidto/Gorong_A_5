package com.gorong.backend.domain.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AppPushTokenRequest {
    @NotBlank
    @Size(max = 4096)
    private String token;

    @NotBlank
    private String platform;
}
