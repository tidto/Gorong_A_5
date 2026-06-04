package com.gorong.backend.domain.group.dto;

import com.gorong.backend.domain.group.entity.EventParticipation;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
public class EventParticipationResponseDto {

    private final Long id;
    private final String eventContentId;
    private final String eventTitle;
    private final Long groupPostId;
    private final String groupPostTitle;
    private final String participationType;
    private final LocalDate visitDate;
    private final LocalDateTime appliedAt;

    public EventParticipationResponseDto(EventParticipation ep) {
        this.id                = ep.getId();
        this.eventContentId    = ep.getEventContentId();
        this.eventTitle        = ep.getEventTitle();
        this.groupPostId       = ep.getGroupPost() != null ? ep.getGroupPost().getId() : null;
        this.groupPostTitle    = ep.getGroupPost() != null ? ep.getGroupPost().getTitle() : null;
        this.participationType = ep.getParticipationType().name();
        this.visitDate         = ep.getVisitDate();
        this.appliedAt         = ep.getAppliedAt();
    }
}