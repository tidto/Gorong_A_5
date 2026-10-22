package com.gorong.backend.domain.app.service;

import com.gorong.backend.domain.app.dto.TrailSaveRequestDto;
import com.gorong.backend.domain.file.model.UploadSourceType;
import com.gorong.backend.domain.minihome.dto.ActivityCreateRequestDto;
import com.gorong.backend.domain.minihome.repository.GalleryImageRepository;
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
    private final GalleryImageRepository galleryImageRepository;

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

    /**
     * 트레일 기록 삭제 시 생성된 러닝아트(TRAIL_ART) 이미지를 미니홈 갤러리에서 연동 삭제합니다.
     *
     * 트레일 데이터는 앱 로컬에만 있고 서버에는 좌표나 트레일 ID가 저장되지 않으므로
     * (ACTIVITY_LOG 의 description 도 컬럼이 존재하지 않아 사라짐),
     * 트레일 이력이 들고 있는 trailArtUrl 을 식별자로 사용합니다.
     *
     * 이미 삭제되었거나 존재하지 않는 URL 은 아무 것도 하지 않습니다(멱등).
     * 실제 삭제는 MiniHomeService.deleteGalleryImage 에 위임해 소유권 검증과
     * "DB 삭제 확정 후 S3 삭제" 순서를 그대로 재사용합니다.
     */
    @Transactional
    public void deleteTrailArt(Authentication authentication, String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return;
        }

        Long userId = miniHomeUserResolver.resolveUserId(authentication);

        galleryImageRepository.findByImageUrlAndOwnerUserIdAndLocationName(
                        imageUrl.trim(),
                        userId,
                        UploadSourceType.TRAIL_ART.name()
                )
                .ifPresent(image -> miniHomeService.deleteGalleryImage(image.getGalleryImageId(), userId));
    }
}
