package com.gorong.backend.domain.auth.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class GithubLoginRequestDto {
    private String code;
    private String redirectUri;
    private String codeVerifier;
}
