package com.gorong.backend.domain.user.dto;

import lombok.Builder;
import lombok.Getter;
import java.util.List;

@Getter
@Builder
public class MyPageResponseDto {
    private String nickname;
    private String email;
    private String baseAddress;
    private Double purrTemperature;
    private String gorongHz;
    private String barrierFreeType; // NONE, PHYSICAL, VISUAL, AUDITORY
    private Boolean isForeigner;
    private List<String> interestCodes; // "A01", "A02" 등의 형태
}