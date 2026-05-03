package com.gorong.backend.domain.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class SignUpRequestDto {

    @NotBlank(message = "Firebase UID는 필수입니다.")
    private String firebaseUid;

    @NotBlank
    @Email(message = "올바른 이메일 형식이 아닙니다.")
    private String email;

    @NotBlank(message = "닉네임은 필수입니다.")
    private String nickname;

    private String gorongHz;

    // 주소
    private String baseAddress;

    // 배리어프리 타입 (기본 NONE)
    private String barrierFreeType;

    // 외국인 여부
    private Boolean isForeigner;

    // 관심사 ID 목록 (interests 테이블의 interest_id)
    private List<Long> interestIds;

    // 주소 api 경도/위도
    private Double latitude;
    private Double longitude;
}