package com.gorong.backend.domain.admin.repository;

import com.gorong.backend.domain.admin.entity.UserBan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.OffsetDateTime;
import java.util.List;

public interface UserBanRepository extends JpaRepository<UserBan, Long> {
    List<UserBan> findByPermanentDeleteAtBefore(OffsetDateTime now);
    boolean existsByFirebaseUid(String firebaseUid);  // 재가입 방지
    boolean existsByUserId(Long userId);              // 이미 밴된 유저 체크
}