package com.gorong.backend.domain.review.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "review", schema = "gorong_schema")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "rating", nullable = false)
    private Integer rating; // 1~5, 0.5 단위

    @Column(name = "title", nullable = false, length = 255)
    private String title; // 필수: 한줄평

    @Column(name = "content", columnDefinition = "TEXT")
    private String content; // 선택: 상세 내용

    @Column(name = "author_name", nullable = false, length = 255)
    private String authorName; // 필수: 작성자명

    @Column(name = "review_date", nullable = false)
    private OffsetDateTime reviewDate;

    @Column(name = "user_id", nullable = false)
    private Long userId; // User FK

    @Column(name = "event_id", nullable = false)
    private Long eventId; // Event FK

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @OneToMany(mappedBy = "review", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ReviewImage> reviewImages = new ArrayList<>();

    // ─── 편의 메서드 ───
    public void addReviewImage(ReviewImage reviewImage) {
        reviewImages.add(reviewImage);
        reviewImage.setReview(this);
    }

    public void removeReviewImage(ReviewImage reviewImage) {
        reviewImages.remove(reviewImage);
        reviewImage.setReview(null);
    }
}
