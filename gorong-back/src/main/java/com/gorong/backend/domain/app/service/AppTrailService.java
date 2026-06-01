package com.gorong.backend.domain.app.service;

import com.gorong.backend.domain.app.dto.TrailSaveRequestDto;
import com.gorong.backend.domain.minihome.dto.ActivityCreateRequestDto;
import com.gorong.backend.domain.minihome.service.MiniHomeService;
import com.gorong.backend.domain.minihome.service.MiniHomeUserResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AppTrailService {

    private final MiniHomeUserResolver miniHomeUserResolver;
    private final MiniHomeService miniHomeService;

    @Transactional
    public String saveTrail(Authentication authentication, TrailSaveRequestDto requestDto) {
        Long userId = miniHomeUserResolver.resolveUserId(authentication);
        int pointCount = requestDto.getTrail() == null ? 0 : requestDto.getTrail().size();

        // 트레일 좌표 원본은 앱에서 보관하고, 서버에는 활동 기록 이벤트를 남긴다.
        ActivityCreateRequestDto activity = new ActivityCreateRequestDto();
        activity.setActivityType("TRAIL_RECORDED");
        activity.setReferenceId(null);
        activity.setTemperatureChange(30);
        activity.setTitle("러닝아트 기록");
        activity.setDescription("venueId=" + safeVenueId(requestDto.getVenueId()) + ", points=" + pointCount);
        miniHomeService.createActivity(userId, activity);

        return "트레일 기록 저장 완료";
    }

    private String safeVenueId(String venueId) {
        return (venueId == null || venueId.isBlank()) ? "UNKNOWN_VENUE" : venueId.trim();
    }
}
