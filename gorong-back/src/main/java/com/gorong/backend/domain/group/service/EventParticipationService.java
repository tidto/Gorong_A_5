package com.gorong.backend.domain.group.service;

import com.gorong.backend.domain.group.dto.EventParticipationResponseDto;
import com.gorong.backend.domain.group.entity.EventParticipation;
import com.gorong.backend.domain.group.entity.EventParticipation.ParticipationType;
import com.gorong.backend.domain.group.entity.GroupPost;
import com.gorong.backend.domain.group.repository.EventParticipationRepository;
import com.gorong.backend.domain.group.repository.GroupRepository;
import com.gorong.backend.domain.user.entity.User;
import com.gorong.backend.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EventParticipationService {

    private final EventParticipationRepository participationRepository;
    private final UserRepository userRepository;
    private final GroupRepository groupRepository;

    // ── 혼자 참여 신청 (사용자가 선택한 visitDate 저장) ──────────────
    @Transactional
    public EventParticipationResponseDto applySolo(Long userId, String eventContentId,
                                                   String eventTitle, LocalDate visitDate) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "유저를 찾을 수 없습니다."));

        if (participationRepository.existsByUserIdAndEventContentIdAndParticipationType(
                userId, eventContentId, ParticipationType.SOLO)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 혼자 참여 신청한 행사입니다.");
        }

        EventParticipation participation = EventParticipation.builder()
                .user(user)
                .eventContentId(eventContentId)
                .eventTitle(eventTitle)
                .groupPost(null)
                .participationType(ParticipationType.SOLO)
                .visitDate(visitDate)
                .build();

        return new EventParticipationResponseDto(participationRepository.save(participation));
    }

    // ── 그룹 참여 신청 (GroupPost.meetingDate 를 visitDate 로 저장) ──
    @Transactional
    public EventParticipationResponseDto applyGroup(Long userId, String eventContentId,
                                                    String eventTitle, Long groupPostId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "유저를 찾을 수 없습니다."));

        GroupPost groupPost = groupRepository.findById(groupPostId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "그룹을 찾을 수 없습니다."));

        if (participationRepository.existsByUserIdAndEventContentIdAndGroupPostId(
                userId, eventContentId, groupPostId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 해당 그룹으로 참여 신청한 행사입니다.");
        }

        String resolvedTitle = (eventTitle != null && !eventTitle.isBlank())
                ? eventTitle
                : groupPost.getEvent();

        // GroupPost.meetingDate (String "yyyy-MM-dd") → LocalDate 변환
        LocalDate visitDate = parseMeetingDate(groupPost.getMeetingDate());

        EventParticipation participation = EventParticipation.builder()
                .user(user)
                .eventContentId(eventContentId)
                .eventTitle(resolvedTitle)
                .groupPost(groupPost)
                .participationType(ParticipationType.GROUP)
                .visitDate(visitDate)
                .build();

        return new EventParticipationResponseDto(participationRepository.save(participation));
    }

    // ── 내 참여 이력 조회 ─────────────────────────────────────────────
    @Transactional(readOnly = true)
    public List<EventParticipationResponseDto> getMyParticipations(Long userId) {
        return participationRepository.findByUserIdOrderByAppliedAtDesc(userId)
                .stream()
                .map(EventParticipationResponseDto::new)
                .collect(Collectors.toList());
    }

    // ── 혼자 참여 취소 ────────────────────────────────────────────────
    @Transactional
    public void cancelSolo(Long userId, String eventContentId) {
        if (!participationRepository.existsByUserIdAndEventContentIdAndParticipationType(
                userId, eventContentId, ParticipationType.SOLO)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "혼자 참여 신청 내역이 없습니다.");
        }
        participationRepository.deleteByUserIdAndEventContentIdAndParticipationType(
                userId, eventContentId, ParticipationType.SOLO);
    }

    // ── 그룹 참여 이력 취소 (그룹 탈퇴 시 함께 호출) ──────────────────
    @Transactional
    public void cancelGroup(Long userId, String eventContentId, Long groupPostId) {
        participationRepository.deleteByUserIdAndEventContentIdAndGroupPostId(
                userId, eventContentId, groupPostId);
    }

    // ── 혼자 참여 여부 확인 ───────────────────────────────────────────
    @Transactional(readOnly = true)
    public boolean isSoloApplied(Long userId, String eventContentId) {
        return participationRepository.existsByUserIdAndEventContentIdAndParticipationType(
                userId, eventContentId, ParticipationType.SOLO);
    }

    // ── meetingDate 문자열 파싱 헬퍼 ─────────────────────────────────
    private LocalDate parseMeetingDate(String meetingDate) {
        if (meetingDate == null || meetingDate.isBlank()) return null;
        try {
            return LocalDate.parse(meetingDate.trim());  // yyyy-MM-dd 형식 기대
        } catch (DateTimeParseException e) {
            return null;  // 파싱 실패 시 null 저장 (참여 자체는 막지 않음)
        }
    }
}