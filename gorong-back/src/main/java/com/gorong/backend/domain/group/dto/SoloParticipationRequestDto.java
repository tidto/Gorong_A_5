package com.gorong.backend.domain.group.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Getter
@NoArgsConstructor
public class SoloParticipationRequestDto {

    /** TourAPI contentId */
    private String eventContentId;

    /** 행사 제목 */
    private String eventTitle;

    /**
     * 방문 예정일 (혼자 참여: 사용자가 팝업에서 선택, 그룹 참여: meetingDate)
     * 형식: yyyy-MM-dd
     */
    private LocalDate visitDate;
}