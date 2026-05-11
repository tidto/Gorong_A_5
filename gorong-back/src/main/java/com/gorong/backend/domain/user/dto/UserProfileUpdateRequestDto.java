package com.gorong.backend.domain.user.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import java.util.List;

@Getter
@NoArgsConstructor
public class UserProfileUpdateRequestDto {
    private String nickname;
    private String baseAddress;
    private String barrierFreeType;
    private Boolean isForeigner;
    private List<String> interestCodes;

    private Double latitude;
    private Double longitude;
}