package com.gorong.backend.domain.review.service;

import com.gorong.backend.domain.app.repository.VenueArrivalRecordRepository;
import com.gorong.backend.domain.event.repository.EventRepository;
import com.gorong.backend.domain.group.repository.EventParticipationRepository;
import com.gorong.backend.domain.minihome.repository.GalleryImageRepository;
import com.gorong.backend.domain.review.entity.Review;
import com.gorong.backend.domain.review.entity.ReviewImage;
import com.gorong.backend.domain.review.repository.ReviewImageRepository;
import com.gorong.backend.domain.review.repository.ReviewRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReviewServiceQuickReviewTest {

    private static final Long USER_ID = 1L;
    private static final Long EVENT_ID = 10L;
    private static final String AUTHOR_NAME = "홍길동";

    @Mock
    private ReviewRepository reviewRepository;
    @Mock
    private ReviewImageRepository reviewImageRepository;
    @Mock
    private GalleryImageRepository galleryImageRepository;
    @Mock
    private EventParticipationRepository eventParticipationRepository;
    @Mock
    private EventRepository eventRepository;
    @Mock
    private VenueArrivalRecordRepository venueArrivalRecordRepository;

    private ReviewService reviewService() {
        return new ReviewService(
                reviewRepository,
                reviewImageRepository,
                galleryImageRepository,
                eventParticipationRepository,
                eventRepository,
                venueArrivalRecordRepository
        );
    }

    private Review givenExistingReview(Review.PostStatus status, OffsetDateTime createdAt) {
        Review review = Review.builder()
                .id(1L)
                .rating(3)
                .title("임시 포스팅")
                .reviewText("기존 한 줄 리뷰")
                .content("기존 본문")
                .authorName(AUTHOR_NAME)
                .reviewDate(createdAt)
                .userId(USER_ID)
                .eventId(EVENT_ID)
                .status(status)
                .createdAt(createdAt)
                .build();
        review.addReviewImage(ReviewImage.builder()
                .id(1L)
                .imageUrl("https://image/original.jpg")
                .originalImgName("original.jpg")
                .saveImgName("save.jpg")
                .displayOrder(0)
                .build());
        return review;
    }

    private void givenPublishedPosting(Review review) {
        review.updateContent("정식 포스팅 제목", "정식 포스팅 본문");
    }

    private List<ReviewService.ImagePayload> images(String url) {
        return List.of(new ReviewService.ImagePayload(url, "original.jpg", "save.jpg"));
    }

    private void givenFoundReview(Review review) {
        when(reviewRepository.findTopByUserIdAndEventIdOrderByCreatedAtDesc(USER_ID, EVENT_ID))
                .thenReturn(Optional.of(review));
    }

    private void givenSavedEcho() {
        when(reviewRepository.save(any(Review.class))).thenAnswer(call -> call.getArgument(0));
    }

    @Test
    @DisplayName("REVIEW_ONLY 리뷰에 간편 리뷰를 저장하면 rating/reviewText/content/이미지가 모두 갱신된다")
    void reviewOnlyUpdatesEverything() {
        Review review = givenExistingReview(Review.PostStatus.REVIEW_ONLY, OffsetDateTime.now().minusDays(1));
        givenFoundReview(review);
        givenSavedEcho();

        reviewService().upsertQuickReview(
                USER_ID, EVENT_ID, 5, "새 한 줄 리뷰", AUTHOR_NAME, images("https://image/new.jpg"));

        assertThat(review.getRating()).isEqualTo(5);
        assertThat(review.getReviewText()).isEqualTo("새 한 줄 리뷰");
        assertThat(review.getContent()).isEqualTo("새 한 줄 리뷰");
        assertThat(review.getReviewImages()).hasSize(1);
        assertThat(review.getReviewImages().get(0).getImageUrl()).isEqualTo("https://image/new.jpg");
    }

    @Test
    @DisplayName("PUBLISHED 리뷰에 7일 이내 간편 리뷰를 저장하면 rating/reviewText만 갱신되고 content/이미지는 유지된다")
    void publishedWithinSevenDaysKeepsContentAndImages() {
        Review review = givenExistingReview(Review.PostStatus.PUBLISHED, OffsetDateTime.now().minusDays(1));
        givenPublishedPosting(review);
        givenFoundReview(review);
        givenSavedEcho();

        reviewService().upsertQuickReview(
                USER_ID, EVENT_ID, 5, "새 한 줄 리뷰", AUTHOR_NAME, images("https://image/new.jpg"));

        assertThat(review.getStatus()).isEqualTo(Review.PostStatus.PUBLISHED);
        assertThat(review.getRating()).isEqualTo(5);
        assertThat(review.getReviewText()).isEqualTo("새 한 줄 리뷰");
        assertThat(review.getTitle()).isEqualTo("정식 포스팅 제목");
        assertThat(review.getContent()).isEqualTo("정식 포스팅 본문");
        assertThat(review.getReviewImages()).hasSize(1);
        assertThat(review.getReviewImages().get(0).getImageUrl()).isEqualTo("https://image/original.jpg");
    }

    @Test
    @DisplayName("PUBLISHED 리뷰라도 7일이 초과되면 rating/reviewText 수정이 거부되고 content/이미지는 그대로다")
    void publishedAfterSevenDaysIsRejected() {
        Review review = givenExistingReview(Review.PostStatus.PUBLISHED, OffsetDateTime.now().minusDays(8));
        givenPublishedPosting(review);
        givenFoundReview(review);

        assertThatThrownBy(() -> reviewService().upsertQuickReview(
                USER_ID, EVENT_ID, 5, "새 한 줄 리뷰", AUTHOR_NAME, images("https://image/new.jpg")))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(review.getRating()).isEqualTo(3);
        assertThat(review.getReviewText()).isEqualTo("기존 한 줄 리뷰");
        assertThat(review.getContent()).isEqualTo("정식 포스팅 본문");
        assertThat(review.getReviewImages()).hasSize(1);
        assertThat(review.getReviewImages().get(0).getImageUrl()).isEqualTo("https://image/original.jpg");
    }

    @Test
    @DisplayName("리뷰가 없으면 REVIEW_ONLY 상태의 새 행을 만들고 content가 채워진다")
    void createsNewReviewOnly() {
        when(reviewRepository.findTopByUserIdAndEventIdOrderByCreatedAtDesc(USER_ID, EVENT_ID))
                .thenReturn(Optional.empty());
        givenSavedEcho();

        Review saved = reviewService().upsertQuickReview(
                USER_ID, EVENT_ID, 4, "첫 한 줄 리뷰", AUTHOR_NAME, images("https://image/new.jpg"));

        assertThat(saved.getId()).isNull();
        assertThat(saved.getStatus()).isEqualTo(Review.PostStatus.REVIEW_ONLY);
        assertThat(saved.getTitle()).isEqualTo("임시 포스팅");
        assertThat(saved.getContent()).isEqualTo("첫 한 줄 리뷰");
        assertThat(saved.getReviewImages()).hasSize(1);
        assertThat(saved.getReviewImages().get(0).getImageUrl()).isEqualTo("https://image/new.jpg");
    }
}
