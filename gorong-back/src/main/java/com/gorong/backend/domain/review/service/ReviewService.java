package com.gorong.backend.domain.review.service;

import com.gorong.backend.domain.review.entity.Review;
import com.gorong.backend.domain.review.entity.ReviewImage;
import com.gorong.backend.domain.review.repository.ReviewRepository;
import com.gorong.backend.domain.review.repository.ReviewImageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ReviewImageRepository reviewImageRepository;

    // ─── CREATE: 리뷰 생성 ───
    public Review createReview(Long userId, Long eventId, Integer rating, String title, String content, String authorName) {
        // 검증
        validateRating(rating);
        validateTitle(title);
        validateAuthorName(authorName);

        Review review = Review.builder()
                .rating(rating)
                .title(title)
                .content(content)
                .authorName(authorName)
                .reviewDate(OffsetDateTime.now())
                .userId(userId)
                .eventId(eventId)
                .build();

        return reviewRepository.save(review);
    }

    // ─── CREATE: 리뷰에 이미지 추가 ───
    public ReviewImage addImageToReview(Long reviewId, String imageUrl) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("리뷰를 찾을 수 없습니다. ID: " + reviewId));

        ReviewImage reviewImage = ReviewImage.builder()
                .review(review)
                .imageUrl(imageUrl)
                .build();

        review.addReviewImage(reviewImage);
        return reviewImageRepository.save(reviewImage);
    }

    // ─── READ: 행사별 리뷰 목록 (최신순) ───
    @Transactional(readOnly = true)
    public List<Review> getReviewsByEventId(Long eventId) {
        return reviewRepository.findByEventIdOrderByLatest(eventId);
    }

    // ─── READ: 행사별 리뷰 목록 (별점 높은순) ───
    @Transactional(readOnly = true)
    public List<Review> getReviewsByEventIdHighRating(Long eventId) {
        return reviewRepository.findByEventIdOrderByRatingDesc(eventId);
    }

    // ─── READ: 행사별 리뷰 목록 (별점 낮은순) ───
    @Transactional(readOnly = true)
    public List<Review> getReviewsByEventIdLowRating(Long eventId) {
        return reviewRepository.findByEventIdOrderByRatingAsc(eventId);
    }

    // ─── READ: 사용자별 리뷰 목록 ───
    @Transactional(readOnly = true)
    public List<Review> getReviewsByUserId(Long userId) {
        return reviewRepository.findByUserId(userId);
    }

    // ─── READ: 특정 리뷰 조회 ───
    @Transactional(readOnly = true)
    public Review getReviewById(Long reviewId) {
        return reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("리뷰를 찾을 수 없습니다. ID: " + reviewId));
    }

    // ─── READ: 리뷰 이미지 목록 ───
    @Transactional(readOnly = true)
    public List<ReviewImage> getImagesByReviewId(Long reviewId) {
        return reviewImageRepository.findByReviewId(reviewId);
    }

    // ─── READ: 행사별 리뷰 개수 ───
    @Transactional(readOnly = true)
    public Long getReviewCountByEventId(Long eventId) {
        return reviewRepository.countByEventId(eventId);
    }

    // ─── READ: 행사별 평균 별점 ───
    @Transactional(readOnly = true)
    public Double getAverageRatingByEventId(Long eventId) {
        return reviewRepository.findAverageRatingByEventId(eventId)
                .orElse(0.0);
    }

    // ─── UPDATE: 리뷰 수정 (권한 체크) ───
    public Review updateReview(Long reviewId, Long currentUserId, Integer rating, String title, String content) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("리뷰를 찾을 수 없습니다. ID: " + reviewId));

        // 💡 권한 체크: 본인의 리뷰만 수정 가능
        if (!review.getUserId().equals(currentUserId)) {
            throw new IllegalArgumentException("본인의 리뷰만 수정할 수 있습니다.");
        }

        // 검증
        if (rating != null) {
            validateRating(rating);
            review = Review.builder()
                    .id(review.getId())
                    .rating(rating)
                    .title(title != null ? title : review.getTitle())
                    .content(content != null ? content : review.getContent())
                    .authorName(review.getAuthorName())
                    .reviewDate(review.getReviewDate())
                    .userId(review.getUserId())
                    .eventId(review.getEventId())
                    .createdAt(review.getCreatedAt())
                    .reviewImages(review.getReviewImages())
                    .build();
        }

        return reviewRepository.save(review);
    }

    // ─── DELETE: 리뷰 삭제 (권한 체크) ───
    public void deleteReview(Long reviewId, Long currentUserId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("리뷰를 찾을 수 없습니다. ID: " + reviewId));

        // 💡 권한 체크: 본인의 리뷰만 삭제 가능
        if (!review.getUserId().equals(currentUserId)) {
            throw new IllegalArgumentException("본인의 리뷰만 삭제할 수 있습니다.");
        }

        reviewRepository.deleteById(reviewId);
    }

    // ─── DELETE: 리뷰 이미지 삭제 ───
    public void deleteImage(Long imageId, Long reviewId, Long currentUserId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("리뷰를 찾을 수 없습니다. ID: " + reviewId));

        // 💡 권한 체크: 본인의 리뷰의 이미지만 삭제 가능
        if (!review.getUserId().equals(currentUserId)) {
            throw new IllegalArgumentException("본인의 리뷰의 이미지만 삭제할 수 있습니다.");
        }

        ReviewImage image = reviewImageRepository.findById(imageId)
                .orElseThrow(() -> new IllegalArgumentException("이미지를 찾을 수 없습니다. ID: " + imageId));

        review.removeReviewImage(image);
        reviewImageRepository.deleteById(imageId);
    }

    // ─── 검증 메서드 ───
    private void validateRating(Integer rating) {
        if (rating == null || rating < 1 || rating > 5) {
            throw new IllegalArgumentException("별점은 1~5 사이여야 합니다.");
        }
    }

    private void validateTitle(String title) {
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("제목은 필수입니다.");
        }
    }

    private void validateAuthorName(String authorName) {
        if (authorName == null || authorName.trim().isEmpty()) {
            throw new IllegalArgumentException("작성자명은 필수입니다.");
        }
    }
}