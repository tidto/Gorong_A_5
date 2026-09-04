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
@Setter(AccessLevel.PRIVATE)
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "rating", nullable = false)
    private Integer rating;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "review_text", columnDefinition = "TEXT")
    private String reviewText;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "author_name", nullable = false, length = 255)
    private String authorName;

    @Column(name = "review_date", nullable = false)
    private OffsetDateTime reviewDate;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private PostStatus status = PostStatus.REVIEW_ONLY;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @OneToMany(mappedBy = "review", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ReviewImage> reviewImages = new ArrayList<>();

    public void addReviewImage(ReviewImage reviewImage) {
        reviewImages.add(reviewImage);
        reviewImage.setReview(this);
    }

    public void removeReviewImage(ReviewImage reviewImage) {
        reviewImages.remove(reviewImage);
        reviewImage.setReview(null);
    }

    public void updateQuickReview(Integer rating, String reviewText) {
        this.rating = rating;
        this.reviewText = reviewText == null ? null : reviewText.trim();
    }

    public void updateContent(String title, String content) {
        this.title = title;
        this.content = content;
    }

    public void markPublished() {
        this.status = PostStatus.PUBLISHED;
    }

    public boolean isReviewMetaEditable(OffsetDateTime now) {
        if (createdAt == null) {
            return true;
        }
        return !createdAt.plusDays(7).isBefore(now);
    }

    public enum PostStatus {
        REVIEW_ONLY,
        PUBLISHED
    }
}
