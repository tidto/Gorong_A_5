package com.gorong.backend.domain.admin.repository;

import com.gorong.backend.domain.admin.entity.UserBan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface UserBanRepository extends JpaRepository<UserBan, Long>, JpaSpecificationExecutor<UserBan> {
    List<UserBan> findByPermanentDeleteAtBefore(OffsetDateTime now);
    boolean existsByFirebaseUid(String firebaseUid);  // 재가입 방지
    boolean existsByFirebaseUidOrEmail(String firebaseUid, String email);
    Optional<UserBan> findTopByEmailOrderByBannedAtDesc(String email);
    boolean existsByUserIdAndBanStatus(Long userId, UserBan.BanStatus banStatus);
    Optional<UserBan> findTopByUserIdAndBanStatusOrderByBannedAtDesc(Long userId, UserBan.BanStatus banStatus);
    Optional<UserBan> findTopByFirebaseUidOrderByBannedAtDesc(String firebaseUid);
    Optional<UserBan> findTopByFirebaseUidAndBanStatusOrderByBannedAtDesc(String firebaseUid, UserBan.BanStatus banStatus);
    List<UserBan> findByBanStatusAndBanEndsAtBefore(UserBan.BanStatus banStatus, OffsetDateTime now);
    List<UserBan> findByBanStatusAndPermanentDeleteAtBefore(UserBan.BanStatus banStatus, OffsetDateTime now);
}
