package com.gorong.backend.global.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * 운영 DB에 남아있는 기존 reports.status 체크 제약을 현재 enum 값으로 동기화합니다.
 * 기존 값(PROCESSED, REJECTED)도 현재 값(ACTIONED, DISMISSED)으로 정리합니다.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class ReportStatusConstraintInitializer {

    private final JdbcTemplate jdbcTemplate;

    @Bean
    public ApplicationRunner reportStatusConstraintRunner() {
        return args -> {
            jdbcTemplate.execute("ALTER TABLE gorong_schema.reports DROP CONSTRAINT IF EXISTS reports_status_check");
            jdbcTemplate.update("UPDATE gorong_schema.reports SET status = 'ACTIONED' WHERE status = 'PROCESSED'");
            jdbcTemplate.update("UPDATE gorong_schema.reports SET status = 'DISMISSED' WHERE status = 'REJECTED'");
            jdbcTemplate.execute("""
                    ALTER TABLE gorong_schema.reports
                    ADD CONSTRAINT reports_status_check
                    CHECK (status IN ('PENDING', 'REVIEWING', 'ACTIONED', 'DISMISSED'))
                    """);
            log.info("reports.status 체크 제약 동기화 완료");
        };
    }
}
