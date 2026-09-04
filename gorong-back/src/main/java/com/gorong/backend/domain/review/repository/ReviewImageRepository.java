package com.gorong.backend.domain.review.repository;

import com.gorong.backend.domain.review.entity.ReviewImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewImageRepository extends JpaRepository<ReviewImage, Long> {

    // ─── 리뷰별 이미지 조회 ───
    List<ReviewImage> findByReviewId(Long reviewId);

    // ─── 리뷰 삭제 시 관련 이미지 자동 삭제 (CascadeType.ALL로 처리됨) ───
}