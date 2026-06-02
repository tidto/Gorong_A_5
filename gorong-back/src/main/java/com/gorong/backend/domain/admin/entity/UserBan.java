package com.gorong.backend.domain.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.OffsetDateTime;

/**
 * 제재(Ban) 당한 유저의 상태와 이의 제기(Appeal) 과정을 관리하는 엔티티
 * 정지 기간, 영구 정지 여부, 유저의 반론 접수 및 관리자 검토 결과를 모두 추적합니다.
 */
@Entity
@Table(name = "user_ban")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor
public class UserBan {

    // 현재 밴의 유효 상태
    public enum BanStatus {
        ACTIVE,   // 현재 정지 중 (이용 불가)
        RELEASED, // 관리자 직권으로 정지 해제됨 (이의 제기 수용 등)
        EXPIRED   // 정지 기간이 다 되어 자연스럽게 만료됨
    }

    // 유저의 이의 제기(반론) 진행 상태
    public enum AppealStatus {
        NONE,      // 이의 제기 안 함 (초기 상태)
        SUBMITTED, // 유저가 소명문 작성 후 제출함
        REVIEWING, // 관리자가 소명문 읽고 검토 중
        RESOLVED   // 관리자 검토 완료 (수용 or 기각 결정됨)
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ban_id")
    private Long banId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "email", nullable = false, columnDefinition = "TEXT")
    private String email;

    @Column(name = "firebase_uid", nullable = false, columnDefinition = "TEXT")
    private String firebaseUid; // Auth 제어를 위한 UID

    @Column(name = "ban_reason", columnDefinition = "TEXT")
    private String banReason; // 밴을 당한 구체적 사유 (어뷰징, 욕설 등)

    /**
     * 정지 일수 (0 = 영구 정지)
     */
    @Column(name = "ban_days", nullable = false)
    private Integer banDays;

    @CreationTimestamp
    @Column(name = "banned_at", nullable = false, updatable = false)
    private OffsetDateTime bannedAt; // 제재가 시작된 일시

    @Column(name = "ban_ends_at")
    private OffsetDateTime banEndsAt; // 제재가 끝나는 일시 (영구정지일 경우 null이거나 아주 먼 미래)

    @Column(name = "permanent_delete_at")
    private OffsetDateTime permanentDeleteAt; // (옵션) 영구정지 유저의 실제 DB 삭제 예정일

    @Enumerated(EnumType.STRING)
    @Column(name = "ban_status", nullable = false, columnDefinition = "TEXT")
    @Builder.Default
    private BanStatus banStatus = BanStatus.ACTIVE;

    // --- 이의 제기(소명/반론) 관련 필드 ---

    @Column(name = "appeal_text", columnDefinition = "TEXT")
    private String appealText; // 유저가 작성한 억울함 소명 내용

    @Enumerated(EnumType.STRING)
    @Column(name = "appeal_status", nullable = false, columnDefinition = "TEXT")
    @Builder.Default
    private AppealStatus appealStatus = AppealStatus.NONE;

    @Column(name = "appeal_submitted_at")
    private OffsetDateTime appealSubmittedAt; // 이의 제기 제출 일시

    @Column(name = "appeal_review_note", columnDefinition = "TEXT")
    private String appealReviewNote; // 관리자가 반론을 검토하고 남긴 처리 노트

    @Column(name = "appeal_reviewed_at")
    private OffsetDateTime appealReviewedAt; // 반론 처리 완료 일시


    // --- 비즈니스 로직 메서드 ---

    /**
     * 영구 정지 대상자인지 확인합니다. (banDays가 0이면 영구정지)
     */
    public boolean isPermanent() {
        return banDays != null && banDays == 0;
    }

    /**
     * 유저가 정지 처분에 대해 이의 제기(반론)를 신청합니다.
     * 💡 악용 방지를 위해 반론은 1회만 가능하도록 제한합니다.
     */
    public void submitAppeal(String appealText) {
        if (appealStatus != AppealStatus.NONE) {
            throw new IllegalStateException("반론은 1회만 가능합니다.");
        }
        this.appealText = appealText;
        this.appealStatus = AppealStatus.SUBMITTED;
        this.appealSubmittedAt = OffsetDateTime.now();
    }

    /**
     * 관리자가 접수된 유저의 이의 제기를 검토하기 시작합니다.
     */
    public void markAppealReviewing() {
        if (appealStatus != AppealStatus.SUBMITTED) {
            throw new IllegalStateException("접수된 반론이 없습니다.");
        }
        this.appealStatus = AppealStatus.REVIEWING;
    }

    public void rejectAppeal(String note) {
        if (appealStatus != AppealStatus.REVIEWING && appealStatus != AppealStatus.SUBMITTED) {
            throw new IllegalStateException("검토 가능한 반론 상태가 아닙니다.");
        }
        this.appealStatus = AppealStatus.RESOLVED;
        this.appealReviewNote = note;
        this.appealReviewedAt = OffsetDateTime.now();
    }

    /**
     * 관리자가 이의 제기 검토를 마치고 최종 결정을 내립니다. (기각 또는 수용)
     */
    public void resolveAppeal(String note) {
        this.appealStatus = AppealStatus.RESOLVED;
        this.appealReviewNote = note;
        this.appealReviewedAt = OffsetDateTime.now();
    }

    /**
     * 관리자 직권, 또는 이의 제기 수용으로 인해 유저의 밴을 즉시 해제합니다.
     */
    public void release() {
        this.banStatus = BanStatus.RELEASED;
        this.permanentDeleteAt = null; // 영구 삭제 예정 스케줄 취소
    }

    /**
     * 정해진 정지 기간이 모두 지나 밴이 자연스럽게 만료 처리됩니다.
     */
    public void expire() {
        this.banStatus = BanStatus.EXPIRED;
    }
}
