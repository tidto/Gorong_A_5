package com.gorong.backend.domain.group.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 모임 마감 시간이 지난 그룹의 status 를 RECRUITING → CLOSED 로 자동 업데이트합니다.
 *
 * ✅ 실행 주기: 매 분 0초  (cron = "0 * * * * *")
 *    - 실시간성이 충분하지만 DB 부하는 거의 없습니다.
 *    - 더 느슨하게 해도 된다면 매 시간 정각: "0 0 * * * *"
 *
 * ✅ @EnableScheduling 은 메인 Application 클래스에 붙이거나
 *    별도 SchedulingConfig 에 추가해야 합니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GroupScheduler {

    private final GroupService groupService;
    private final EventParticipationService eventParticipationService;

    @Scheduled(cron = "0 * * * * *")   // 매 분 0초마다 실행
    public void closeExpiredGroups() {
        int count = groupService.closeExpiredGroups();
        if (count > 0) {
            log.info("[GroupScheduler] 마감 처리된 그룹 수: {}개", count);
        }
    }

    /**
     * 혼자 참여(SOLO) 중 visitDate가 지난 레코드를 매일 자정에 CLOSED로 전환합니다.
     * cron = "0 0 0 * * *" → 매일 00:00:00
     */
    @Scheduled(cron = "0 0 0 * * *")
    public void closeExpiredSoloParticipations() {
        int count = eventParticipationService.closeExpiredSoloParticipations();
        if (count > 0) {
            log.info("[GroupScheduler] 혼자 참여 CLOSED 처리 건수: {}개", count);
        }
    }
}