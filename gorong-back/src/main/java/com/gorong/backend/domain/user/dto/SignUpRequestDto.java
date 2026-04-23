package com.gorong.backend.domain.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SignUpRequestDto {
    // 프론트가 Firebase 가입 후 응답받은 고유 식별자
    @NotBlank(message = "Firebase UID는 필수입니다.")
    private String firebaseUid;

    @NotBlank
    @Email(message = "올바른 이메일 형식이 아닙니다.")
    private String email;

    @NotBlank(message = "닉네임은 필수입니다.")
    private String nickname;

    // 고롱 주파수 (프론트에서 온보딩 테스트 완료 후 같이 넘겨준다고 가정)
    private String gorongHz;
}