package com.gorong.backend.domain.admin.repository;

import com.gorong.backend.domain.admin.entity.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReportRepository extends JpaRepository<Report, Long> {
    List<Report> findByReportedUserIdAndStatus(Long userId, Report.ReportStatus status);

    long countByReportedUserIdAndStatus(Long userId, Report.ReportStatus status);

    // userId로 해당 유저에 대한 모든 신고 조회
    List<Report> findByReportedUserId(Long userId); //

}