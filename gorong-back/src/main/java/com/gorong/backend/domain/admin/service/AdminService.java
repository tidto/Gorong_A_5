package com.gorong.backend.domain.admin.service;

import com.gorong.backend.domain.admin.dto.BanSummaryDto;
import com.gorong.backend.domain.admin.dto.ReportSummaryDto;
import com.gorong.backend.domain.admin.entity.Report;
import com.gorong.backend.domain.admin.entity.UserBan;
import com.gorong.backend.domain.admin.repository.ReportRepository;
import com.gorong.backend.domain.admin.repository.UserBanRepository;
import com.gorong.backend.domain.user.entity.User;
import com.gorong.backend.domain.user.entity.UserProfile;
import com.gorong.backend.domain.user.repository.UserProfileRepository;
import com.gorong.backend.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final UserBanRepository userBanRepository;
    private final ReportRepository reportRepository;

    @Transactional
    public BanSummaryDto banUser(Long userId, Long reportId, String banReason, Integer banDays) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));

        if (userBanRepository.existsByUserIdAndBanStatus(userId, UserBan.BanStatus.ACTIVE)) {
            throw new IllegalStateException("이미 밴 처리된 유저입니다.");
        }

        int normalizedBanDays = (banDays == null) ? 7 : banDays;
        if (normalizedBanDays < 0 || normalizedBanDays > 30) {
            throw new IllegalArgumentException("정지일수는 0~30일만 가능합니다.");
        }

        OffsetDateTime now = OffsetDateTime.now();
        UserBan ban = UserBan.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .firebaseUid(user.getFirebaseUid())
                .banReason(banReason)
                .banDays(normalizedBanDays)
                .banEndsAt(normalizedBanDays == 0 ? null : now.plusDays(normalizedBanDays))
                .permanentDeleteAt(normalizedBanDays == 0 ? now.plusDays(14) : null)
                .banStatus(UserBan.BanStatus.ACTIVE)
                .appealStatus(UserBan.AppealStatus.NONE)
                .build();

        UserBan saved = userBanRepository.save(ban);

        if (reportId != null) {
            Report report = reportRepository.findById(reportId)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 신고입니다."));
            report.actioned(banReason, normalizedBanDays);
        }

        return toBanSummary(saved);
    }

    @Transactional
    public void unbanUser(Long banId, String reviewNote) {
        UserBan ban = userBanRepository.findById(banId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 밴 정보입니다."));

        ban.release();
        ban.resolveAppeal(reviewNote == null ? "관리자에 의해 밴이 해제되었습니다." : reviewNote);
    }

    @Transactional
    public BanSummaryDto submitAppeal(Long userId, String appealText) {
        UserBan ban = userBanRepository.findTopByUserIdAndBanStatusOrderByBannedAtDesc(userId, UserBan.BanStatus.ACTIVE)
                .orElseThrow(() -> new IllegalArgumentException("활성 밴 정보가 없습니다."));

        ban.submitAppeal(appealText);
        return toBanSummary(ban);
    }

    @Transactional
    public BanSummaryDto markAppealReviewing(Long banId) {
        UserBan ban = userBanRepository.findById(banId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 밴 정보입니다."));
        ban.markAppealReviewing();
        return toBanSummary(ban);
    }

    @Transactional
    public BanSummaryDto rejectAppeal(Long banId, String reviewNote) {
        UserBan ban = userBanRepository.findById(banId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 밴 정보입니다."));

        String normalizedNote = (reviewNote == null || reviewNote.isBlank())
                ? "반론이 기각되었습니다."
                : reviewNote.trim();

        ban.rejectAppeal(normalizedNote);
        return toBanSummary(ban);
    }

    @Transactional(readOnly = true)
    public Page<BanSummaryDto> getBanList(UserBan.BanStatus status, UserBan.AppealStatus appealStatus, Pageable pageable) {
        Specification<UserBan> spec = (root, query, cb) -> cb.conjunction();
        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("banStatus"), status));
        }
        if (appealStatus != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("appealStatus"), appealStatus));
        }
        return userBanRepository.findAll(spec, pageable).map(this::toBanSummary);
    }

    @Transactional(readOnly = true)
    public Page<ReportSummaryDto> getReports(
            Report.ReportStatus status,
            Long reporterId,
            Long reportedUserId,
            OffsetDateTime from,
            OffsetDateTime to,
            Pageable pageable
    ) {
        Specification<Report> spec = (root, query, cb) -> cb.conjunction();
        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (reporterId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("reporter").get("id"), reporterId));
        }
        if (reportedUserId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("reportedUser").get("id"), reportedUserId));
        }
        if (from != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), from));
        }
        if (to != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("createdAt"), to));
        }

        return reportRepository.findAll(spec, pageable).map(this::toReportSummary);
    }

    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void expireTemporaryBans() {
        OffsetDateTime now = OffsetDateTime.now();
        var expired = userBanRepository.findByBanStatusAndBanEndsAtBefore(UserBan.BanStatus.ACTIVE, now);
        expired.forEach(UserBan::expire);
        if (!expired.isEmpty()) {
            log.info("기간 만료 밴 처리 완료: {}건", expired.size());
        }
    }

    @Scheduled(cron = "0 10 2 * * *")
    @Transactional
    public void permanentDeleteExpiredUsers() {
        OffsetDateTime now = OffsetDateTime.now();
        var expiredPermanent = userBanRepository.findByBanStatusAndPermanentDeleteAtBefore(UserBan.BanStatus.ACTIVE, now);

        int[] deactivatedCount = {0};
        for (UserBan ban : expiredPermanent) {
            userRepository.findById(ban.getUserId()).ifPresent(user -> {
                if (user.getAccountStatus() != User.AccountStatus.INACTIVE) {
                    user.deactivate();
                    deactivatedCount[0]++;
                }
            });
            ban.expire();
        }

        if (deactivatedCount[0] > 0) {
            log.info("영구정지 유저 14일 경과 비활성화 완료: {}건", deactivatedCount[0]);
        }
    }

    @Transactional(readOnly = true)
    public UserBan getActiveBanByFirebaseUid(String firebaseUid) {
        return userBanRepository.findTopByFirebaseUidAndBanStatusOrderByBannedAtDesc(firebaseUid, UserBan.BanStatus.ACTIVE)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public UserBan getLatestBanByFirebaseUid(String firebaseUid) {
        return userBanRepository.findTopByFirebaseUidOrderByBannedAtDesc(firebaseUid)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public UserBan getLatestBanByEmail(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        return userBanRepository.findTopByEmailOrderByBannedAtDesc(email)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public BanSummaryDto getActiveBanByUserId(Long userId) {
        return userBanRepository.findTopByUserIdAndBanStatusOrderByBannedAtDesc(userId, UserBan.BanStatus.ACTIVE)
                .map(this::toBanSummary)
                .orElse(null);
    }

    private BanSummaryDto toBanSummary(UserBan ban) {
        return BanSummaryDto.builder()
                .banId(ban.getBanId())
                .userId(ban.getUserId())
                .email(ban.getEmail())
                .banReason(ban.getBanReason())
                .banDays(ban.getBanDays())
                .banStatus(ban.getBanStatus())
                .appealStatus(ban.getAppealStatus())
                .appealText(ban.getAppealText())
                .appealReviewNote(ban.getAppealReviewNote())
                .reportCount(reportRepository.countByReportedUserId(ban.getUserId()))
                .bannedAt(ban.getBannedAt())
                .banEndsAt(ban.getBanEndsAt())
                .permanentDeleteAt(ban.getPermanentDeleteAt())
                .build();
    }

    private ReportSummaryDto toReportSummary(Report report) {
        String reporterNickname = resolveNickname(report.getReporter().getId(), report.getReporter().getEmail());
        String reportedNickname = resolveNickname(report.getReportedUser().getId(), report.getReportedUser().getEmail());
        return ReportSummaryDto.builder()
                .reportId(report.getReportId())
                .reporterId(report.getReporter().getId())
                .reporterNickname(reporterNickname)
                .reporterEmail(report.getReporter().getEmail())
                .reportedUserId(report.getReportedUser().getId())
                .reportedUserNickname(reportedNickname)
                .reportedUserEmail(report.getReportedUser().getEmail())
                .reason(report.getReason())
                .status(report.getStatus())
                .adminReason(report.getAdminReason())
                .suspensionDays(report.getSuspensionDays())
                .createdAt(report.getCreatedAt())
                .processedAt(report.getProcessedAt())
                .build();
    }

    private String resolveNickname(Long userId, String fallbackEmail) {
        return userProfileRepository.findByUserId(userId)
                .map(UserProfile::getNickname)
                .filter(nickname -> nickname != null && !nickname.isBlank())
                .orElseGet(() -> {
                    if (fallbackEmail == null || fallbackEmail.isBlank()) return "unknown";
                    return fallbackEmail.split("@")[0];
                });
    }
}
