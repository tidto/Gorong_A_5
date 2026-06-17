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
import org.springframework.dao.DataIntegrityViolationException;
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

    // ── 혼자 참여 신청 ────────────────────────────────────────────────
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

    // ── 그룹 참여 신청 ────────────────────────────────────────────────
    // ✅ @Transactional 제거: 중복 INSERT 시 DataIntegrityViolationException을
    //    이 메서드 안에서 catch해서 200으로 처리한다.
    //    @Transactional이 걸려있으면 예외가 트랜잭션 롤백을 유발하고
    //    catch 이후에도 커밋이 안 되기 때문에 의도적으로 분리했다.
    public EventParticipationResponseDto applyGroup(Long userId, String eventContentId,
                                                    String eventTitle, Long groupPostId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "유저를 찾을 수 없습니다."));

        GroupPost groupPost = groupRepository.findById(groupPostId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "그룹을 찾을 수 없습니다."));

        // 이미 존재하면 INSERT 없이 바로 반환
        return participationRepository
                .findByUserIdAndGroupPostId(userId, groupPostId)
                .map(EventParticipationResponseDto::new)
                .orElseGet(() -> insertGroup(user, groupPost, eventContentId, eventTitle));
    }

    // ── 실제 INSERT (새 트랜잭션으로 분리) ───────────────────────────
    // 동시 요청 등 race condition으로 중복 INSERT가 발생해도
    // DataIntegrityViolationException을 여기서 잡아 200으로 처리한다.
    @Transactional
    protected EventParticipationResponseDto insertGroup(User user, GroupPost groupPost,
                                                        String eventContentId, String eventTitle) {
        String resolvedTitle = (eventTitle != null && !eventTitle.isBlank())
                ? eventTitle : groupPost.getEvent();

        String resolvedContentId = (eventContentId != null && !eventContentId.isBlank()
                && eventContentId.matches("\\d+"))
                ? eventContentId
                : (groupPost.getEventContentId() != null && !groupPost.getEventContentId().isBlank()
                ? groupPost.getEventContentId()
                : eventContentId);

        LocalDate visitDate = parseMeetingDate(groupPost.getMeetingDate());

        EventParticipation participation = EventParticipation.builder()
                .user(user)
                .eventContentId(resolvedContentId)
                .eventTitle(resolvedTitle)
                .groupPost(groupPost)
                .participationType(ParticipationType.GROUP)
                .visitDate(visitDate)
                .build();

        try {
            return new EventParticipationResponseDto(participationRepository.save(participation));
        } catch (DataIntegrityViolationException e) {
            // race condition으로 동시에 INSERT된 경우 → 기존 레코드 반환
            return participationRepository
                    .findByUserIdAndGroupPostId(user.getId(), groupPost.getId())
                    .map(EventParticipationResponseDto::new)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.INTERNAL_SERVER_ERROR, "참여 이력 저장에 실패했습니다."));
        }
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

    // ── 그룹 참여 이력 취소 ───────────────────────────────────────────
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

    /**
     * visitDate가 지난 SOLO 참여를 CLOSED로 일괄 전환
     * GroupScheduler에서 매일 자정에 호출됩니다.
     * @return 처리된 건수
     */
    @Transactional
    public int closeExpiredSoloParticipations() {
        List<EventParticipation> expired =
                participationRepository.findExpiredSoloParticipations(LocalDate.now());
        expired.forEach(EventParticipation::close);
        return expired.size();
    }

    // ── meetingDate 문자열 파싱 헬퍼 ─────────────────────────────────
    private LocalDate parseMeetingDate(String meetingDate) {
        if (meetingDate == null || meetingDate.isBlank()) return null;
        try {
            return LocalDate.parse(meetingDate.trim());
        } catch (DateTimeParseException e) {
            return null;
        }
    }
}