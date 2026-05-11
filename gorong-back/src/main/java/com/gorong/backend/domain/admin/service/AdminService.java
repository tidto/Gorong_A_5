package com.gorong.backend.domain.admin.service;

import com.gorong.backend.domain.admin.entity.UserBan;
import com.gorong.backend.domain.admin.repository.UserBanRepository;
import com.gorong.backend.domain.user.entity.User;
import com.gorong.backend.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final UserBanRepository userBanRepository;

    // ==========================================
    // 유저 밴 처리 (소프트 딜리트 → user_ban 이동)
    // ==========================================
    @Transactional
    public void banUser(Long userId, Long reportId, String banReason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));

        if (userBanRepository.existsByUserId(userId)) {
            throw new IllegalStateException("이미 밴 처리된 유저입니다.");
        }

        // 1. user_ban 테이블에 기록
        UserBan ban = UserBan.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .firebaseUid(user.getFirebaseUid())
                .banReason(banReason)
                .permanentDeleteAt(OffsetDateTime.now().plusDays(7))
                .build();
        userBanRepository.save(ban);

        // 2. users 테이블에서 삭제
        userRepository.delete(user);
        log.info("유저 밴 처리 완료: userId={}, reason={}", userId, banReason);
    }

    // ==========================================
    // 매일 새벽 2시 - 7일 경과한 밴 기록 영구삭제
    // ==========================================
    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void permanentDeleteExpiredBans() {
        List<UserBan> expired = userBanRepository
                .findByPermanentDeleteAtBefore(OffsetDateTime.now());
        userBanRepository.deleteAll(expired);
        log.info("만료된 밴 기록 영구삭제 완료: {}건", expired.size());
    }

    // ==========================================
    // 밴 목록 조회
    // ==========================================
    @Transactional(readOnly = true)
    public List<UserBan> getBanList() {
        return userBanRepository.findAll();
    }
}