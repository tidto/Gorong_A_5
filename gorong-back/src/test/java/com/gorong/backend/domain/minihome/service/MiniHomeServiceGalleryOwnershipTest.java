package com.gorong.backend.domain.minihome.service;

import com.gorong.backend.domain.event.repository.EventRepository;
import com.gorong.backend.domain.file.service.S3StorageService;
import com.gorong.backend.domain.group.repository.GroupParticipantRepository;
import com.gorong.backend.domain.group.repository.GroupRepository;
import com.gorong.backend.domain.minihome.dto.GalleryImageCreateRequestDto;
import com.gorong.backend.domain.minihome.dto.MiniHomePageResponseDto;
import com.gorong.backend.domain.minihome.entity.ActivityLog;
import com.gorong.backend.domain.minihome.entity.GalleryImage;
import com.gorong.backend.domain.minihome.entity.MiniHome;
import com.gorong.backend.domain.minihome.entity.MiniHomeGallery;
import com.gorong.backend.domain.minihome.exception.GalleryNotFoundException;
import com.gorong.backend.domain.minihome.exception.MiniHomeForbiddenException;
import com.gorong.backend.domain.minihome.repository.ActivityLogRepository;
import com.gorong.backend.domain.minihome.repository.CatEquipRepository;
import com.gorong.backend.domain.minihome.repository.GalleryImageRepository;
import com.gorong.backend.domain.minihome.repository.GoCatRepository;
import com.gorong.backend.domain.minihome.repository.ItemRepository;
import com.gorong.backend.domain.minihome.repository.MiniHomeGalleryRepository;
import com.gorong.backend.domain.minihome.repository.MiniHomeRepository;
import com.gorong.backend.domain.minihome.repository.UserItemRepository;
import com.gorong.backend.domain.review.repository.ReviewImageRepository;
import com.gorong.backend.domain.review.repository.ReviewRepository;
import com.gorong.backend.domain.review.service.ReviewService;
import com.gorong.backend.domain.user.repository.UserProfileRepository;
import com.gorong.backend.domain.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 갤러리 이미지 등록/삭제/조회의 소유권·정합성 검증.
 */
@ExtendWith(MockitoExtension.class)
class MiniHomeServiceGalleryOwnershipTest {

    private static final Long OWNER_ID = 1L;
    private static final Long OTHER_USER_ID = 2L;
    private static final Long MINI_HOME_ID = 10L;
    private static final Long OTHER_MINI_HOME_ID = 20L;
    private static final Long GALLERY_ID = 100L;
    private static final Long OTHER_GALLERY_ID = 200L;
    private static final String OWN_IMAGE_URL = "https://bucket/users/1/trail_art/20260101/mine.jpg";
    private static final String OTHER_IMAGE_URL = "https://bucket/users/2/trail_art/20260101/other.jpg";

    @Mock private MiniHomeRepository miniHomeRepository;
    @Mock private GoCatRepository goCatRepository;
    @Mock private S3StorageService s3StorageService;
    @Mock private ActivityLogRepository activityLogRepository;
    @Mock private MiniHomeGalleryRepository miniHomeGalleryRepository;
    @Mock private GalleryImageRepository galleryImageRepository;
    @Mock private CatEquipRepository catEquipRepository;
    @Mock private ItemRepository itemRepository;
    @Mock private UserItemRepository userItemRepository;
    @Mock private ReviewImageRepository reviewImageRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserProfileRepository userProfileRepository;
    @Mock private EventCategoryItemRewardService eventCategoryItemRewardService;
    @Mock private GoCatItemUnlockService goCatItemUnlockService;
    @Mock private GroupRepository groupRepository;
    @Mock private GroupParticipantRepository groupParticipantRepository;
    @Mock private ReviewRepository reviewRepository;
    @Mock private ReviewService reviewService;

    @InjectMocks
    private MiniHomeService miniHomeService;

    private static GalleryImageCreateRequestDto imageRequest(String imageUrl) {
        GalleryImageCreateRequestDto req = new GalleryImageCreateRequestDto();
        req.setImageUrl(imageUrl);
        req.setLocationName("TRAIL_ART");
        return req;
    }

    private static MiniHomeGallery gallery(Long galleryId, Long miniHomeId, String referenceId) {
        return MiniHomeGallery.builder()
                .galleryId(galleryId)
                .miniHomeId(miniHomeId)
                .referenceId(referenceId)
                .build();
    }

    private static MiniHome miniHome(Long miniHomeId, Long userId) {
        return MiniHome.builder().miniHomeId(miniHomeId).userId(userId).userId2(userId).build();
    }

    private void givenSavedImage() {
        when(galleryImageRepository.save(any(GalleryImage.class)))
                .thenAnswer(inv -> GalleryImage.builder()
                        .galleryImageId(999L)
                        .galleryId(inv.getArgument(0, GalleryImage.class).getGalleryId())
                        .imageUrl(inv.getArgument(0, GalleryImage.class).getImageUrl())
                        .build());
        when(activityLogRepository.save(any(ActivityLog.class)))
                .thenReturn(ActivityLog.builder().activityId(1L).userId(OWNER_ID).build());
    }

    // ── 정상 ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[정상] 본인 갤러리에 본인 이미지를 등록하면 저장된다")
    void addGalleryImage_ownerAddsOwnImage_isSaved() {
        when(miniHomeGalleryRepository.findById(GALLERY_ID))
                .thenReturn(Optional.of(gallery(GALLERY_ID, MINI_HOME_ID, "1118418")));
        when(miniHomeRepository.findById(MINI_HOME_ID)).thenReturn(Optional.of(miniHome(MINI_HOME_ID, OWNER_ID)));
        when(galleryImageRepository.existsByGalleryIdAndImageUrl(GALLERY_ID, OWN_IMAGE_URL)).thenReturn(false);
        givenSavedImage();

        var dto = miniHomeService.addGalleryImage(GALLERY_ID, imageRequest(OWN_IMAGE_URL), OWNER_ID);

        assertThat(dto).isNotNull();
        assertThat(dto.getImageUrl()).isEqualTo(OWN_IMAGE_URL);
        verify(galleryImageRepository).save(any(GalleryImage.class));
    }

    // ── 비정상: 소유권 ───────────────────────────────────────────────────

    @Test
    @DisplayName("[비정상] 다른 사용자의 갤러리에는 이미지를 등록할 수 없다")
    void addGalleryImage_otherUsersGallery_isForbidden() {
        when(miniHomeGalleryRepository.findById(OTHER_GALLERY_ID))
                .thenReturn(Optional.of(gallery(OTHER_GALLERY_ID, OTHER_MINI_HOME_ID, "9999")));
        when(miniHomeRepository.findById(OTHER_MINI_HOME_ID))
                .thenReturn(Optional.of(miniHome(OTHER_MINI_HOME_ID, OTHER_USER_ID)));

        assertThatThrownBy(() ->
                miniHomeService.addGalleryImage(OTHER_GALLERY_ID, imageRequest(OWN_IMAGE_URL), OWNER_ID))
                .isInstanceOf(MiniHomeForbiddenException.class);

        verify(galleryImageRepository, never()).save(any());
    }

    @Test
    @DisplayName("[비정상] 남의 S3 이미지를 내 갤러리에 등록할 수 없다")
    void addGalleryImage_otherUsersImageUrl_isForbidden() {
        when(miniHomeGalleryRepository.findById(GALLERY_ID))
                .thenReturn(Optional.of(gallery(GALLERY_ID, MINI_HOME_ID, "1118418")));
        when(miniHomeRepository.findById(MINI_HOME_ID)).thenReturn(Optional.of(miniHome(MINI_HOME_ID, OWNER_ID)));

        assertThatThrownBy(() ->
                miniHomeService.addGalleryImage(GALLERY_ID, imageRequest(OTHER_IMAGE_URL), OWNER_ID))
                .isInstanceOf(MiniHomeForbiddenException.class);

        verify(galleryImageRepository, never()).save(any());
    }

    @Test
    @DisplayName("[비정상] 존재하지 않는 galleryId 는 404 예외가 난다")
    void addGalleryImage_unknownGalleryId_throwsNotFound() {
        when(miniHomeGalleryRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                miniHomeService.addGalleryImage(GALLERY_ID, imageRequest(OWN_IMAGE_URL), OWNER_ID))
                .isInstanceOf(GalleryNotFoundException.class);

        verify(galleryImageRepository, never()).save(any());
    }

    @Test
    @DisplayName("[비정상] 로그인 사용자 없이 요청하면 거부된다")
    void addGalleryImage_withoutRequester_isRejected() {
        assertThatThrownBy(() ->
                miniHomeService.addGalleryImage(GALLERY_ID, imageRequest(OWN_IMAGE_URL), null))
                .isInstanceOf(IllegalArgumentException.class);

        verify(galleryImageRepository, never()).save(any());
    }

    // ── 중복 ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("[중복] 같은 갤러리에 동일 이미지를 중복 등록할 수 없다")
    void addGalleryImage_duplicateImage_isRejected() {
        when(miniHomeGalleryRepository.findById(GALLERY_ID))
                .thenReturn(Optional.of(gallery(GALLERY_ID, MINI_HOME_ID, "1118418")));
        when(miniHomeRepository.findById(MINI_HOME_ID)).thenReturn(Optional.of(miniHome(MINI_HOME_ID, OWNER_ID)));
        when(galleryImageRepository.existsByGalleryIdAndImageUrl(GALLERY_ID, OWN_IMAGE_URL)).thenReturn(true);

        assertThatThrownBy(() ->
                miniHomeService.addGalleryImage(GALLERY_ID, imageRequest(OWN_IMAGE_URL), OWNER_ID))
                .isInstanceOf(IllegalArgumentException.class);

        verify(galleryImageRepository, never()).save(any());
    }

    // ── 삭제 정합성 ──────────────────────────────────────────────────────

    @Test
    @DisplayName("[정합성] 삭제 시 DB 삭제를 먼저 확정하고 나서 S3 객체를 지운다")
    void deleteGalleryImage_deletesDbBeforeS3() {
        when(galleryImageRepository.findById(999L))
                .thenReturn(Optional.of(GalleryImage.builder()
                        .galleryImageId(999L).galleryId(GALLERY_ID).imageUrl(OWN_IMAGE_URL).build()));
        when(miniHomeGalleryRepository.findByGalleryId(GALLERY_ID))
                .thenReturn(Optional.of(gallery(GALLERY_ID, MINI_HOME_ID, "1118418")));
        when(miniHomeRepository.findById(MINI_HOME_ID)).thenReturn(Optional.of(miniHome(MINI_HOME_ID, OWNER_ID)));
        when(reviewImageRepository.existsByImageUrl(OWN_IMAGE_URL)).thenReturn(false);

        miniHomeService.deleteGalleryImage(999L, OWNER_ID);

        InOrder inOrder = Mockito.inOrder(galleryImageRepository, s3StorageService);
        inOrder.verify(galleryImageRepository).delete(any(GalleryImage.class));
        inOrder.verify(galleryImageRepository).flush();
        inOrder.verify(s3StorageService).delete(anyString());
    }

    @Test
    @DisplayName("[보안] 타인 갤러리 이미지는 S3 객체까지 건드리지 못한다")
    void deleteGalleryImage_otherUsersImage_doesNotTouchS3() {
        when(galleryImageRepository.findById(999L))
                .thenReturn(Optional.of(GalleryImage.builder()
                        .galleryImageId(999L).galleryId(OTHER_GALLERY_ID).imageUrl(OTHER_IMAGE_URL).build()));
        when(miniHomeGalleryRepository.findByGalleryId(OTHER_GALLERY_ID))
                .thenReturn(Optional.of(gallery(OTHER_GALLERY_ID, OTHER_MINI_HOME_ID, "9999")));
        when(miniHomeRepository.findById(OTHER_MINI_HOME_ID))
                .thenReturn(Optional.of(miniHome(OTHER_MINI_HOME_ID, OTHER_USER_ID)));

        assertThatThrownBy(() -> miniHomeService.deleteGalleryImage(999L, OWNER_ID))
                .isInstanceOf(MiniHomeForbiddenException.class);

        verify(s3StorageService, never()).delete(anyString());
        verify(galleryImageRepository, never()).delete(any());
    }

    // ── 조회 정합성 (P5): 트레일아트는 트레일 기록이 있어야 노출된다 ──────

    @Test
    @DisplayName("[조회] 트레일 기록 없는 gallery 의 트레일아트는 제외하고 APP_PHOTO/POST_PHOTO 는 유지한다")
    void getMiniHomePage_trailArtWithoutTrailRecord_isExcluded() {
        String trailArtUrl = "https://bucket/users/1/trail_art/20260101/a.jpg";
        String appPhotoUrl = "https://bucket/users/1/app_photo/20260101/b.jpg";
        String postPhotoUrl = "https://bucket/users/1/post_photo/20260101/c.jpg";
        String linkedTrailArtUrl = "https://bucket/users/1/trail_art/20260101/d.jpg";

        GalleryImage trailArt = GalleryImage.builder().galleryImageId(1L).galleryId(GALLERY_ID)
                .imageUrl(trailArtUrl).locationName("TRAIL_ART").build();
        GalleryImage appPhoto = GalleryImage.builder().galleryImageId(2L).galleryId(GALLERY_ID)
                .imageUrl(appPhotoUrl).locationName("APP_PHOTO").build();
        GalleryImage postPhoto = GalleryImage.builder().galleryImageId(3L).galleryId(OTHER_GALLERY_ID)
                .imageUrl(postPhotoUrl).locationName("POST_PHOTO").build();
        GalleryImage linkedTrailArt = GalleryImage.builder().galleryImageId(4L).galleryId(OTHER_GALLERY_ID)
                .imageUrl(linkedTrailArtUrl).locationName("TRAIL_ART").build();

        givenMiniHomePage(
                List.of(gallery(GALLERY_ID, MINI_HOME_ID, null), gallery(OTHER_GALLERY_ID, MINI_HOME_ID, "1118418")),
                GALLERY_ID, List.of(trailArt, appPhoto),
                OTHER_GALLERY_ID, List.of(postPhoto, linkedTrailArt)
        );

        var page = miniHomeService.getMiniHomePage(OWNER_ID);

        // 갤러리는 그대로 노출되고 (APP_PHOTO 자동 저장 흐름 회귀 방지),
        // 트레일아트만 걸러진다.
        assertThat(page.getGalleries()).hasSize(2);

        var unlinked = page.getGalleries().stream()
                .filter(g -> GALLERY_ID.equals(g.getGalleryId()))
                .findFirst().orElseThrow();
        assertThat(unlinked.getImages()).extracting(MiniHomePageResponseDto.GalleryImageDto::getImageUrl)
                .containsExactly(appPhotoUrl);

        var linked = page.getGalleries().stream()
                .filter(g -> OTHER_GALLERY_ID.equals(g.getGalleryId()))
                .findFirst().orElseThrow();
        assertThat(linked.getImages()).extracting(MiniHomePageResponseDto.GalleryImageDto::getImageUrl)
                .containsExactlyInAnyOrder(postPhotoUrl, linkedTrailArtUrl);
    }

    private void givenMiniHomePage(
            List<MiniHomeGallery> galleries,
            Long firstGalleryId, List<GalleryImage> firstImages,
            Long secondGalleryId, List<GalleryImage> secondImages
    ) {
        when(miniHomeRepository.findFirstByUserIdOrderByMiniHomeIdAsc(OWNER_ID))
                .thenReturn(Optional.of(miniHome(MINI_HOME_ID, OWNER_ID)));
        when(goCatRepository.findByMiniHomeId(MINI_HOME_ID)).thenReturn(Optional.empty());
        when(activityLogRepository.findByUserIdOrderByCreateAtDesc(eq(OWNER_ID), any()))
                .thenReturn(List.of());
        when(activityLogRepository.countByUserId(OWNER_ID)).thenReturn(0L);
        when(userProfileRepository.findByUserId(OWNER_ID)).thenReturn(Optional.empty());
        when(miniHomeGalleryRepository.findByMiniHomeIdOrderByCreateAtDesc(MINI_HOME_ID)).thenReturn(galleries);
        when(galleryImageRepository.findByGalleryIdOrderByCreateAtDesc(firstGalleryId)).thenReturn(firstImages);
        when(galleryImageRepository.findByGalleryIdOrderByCreateAtDesc(secondGalleryId)).thenReturn(secondImages);
    }
}
