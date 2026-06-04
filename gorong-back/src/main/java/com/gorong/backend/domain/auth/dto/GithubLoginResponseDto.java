package com.gorong.backend.domain.auth.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class GithubLoginResponseDto {
    private final String customToken;
    private final boolean isRegistered;
    private final String email;
    private final String firebaseUid;
    private final String nickname;
    private final String message;
}
