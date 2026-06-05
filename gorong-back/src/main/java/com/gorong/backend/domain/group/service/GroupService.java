package com.gorong.backend.domain.group.service;

import com.gorong.backend.domain.group.entity.GroupParticipant;
import com.gorong.backend.domain.group.entity.GroupPost;
import com.gorong.backend.domain.group.repository.GroupParticipantRepository;
import com.gorong.backend.domain.group.repository.GroupRepository;
import com.gorong.backend.domain.minihome.repository.ActivityLogRepository;
import com.gorong.backend.domain.minihome.service.MiniHomeService;
import com.gorong.backend.domain.user.entity.User;
import com.gorong.backend.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupService {
    private final GroupRepository groupPostRepository;
    private final GroupParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final MiniHomeService miniHomeService;
    private final ActivityLogRepository activityLogRepository;

    @Transactional
    public void joinGroup(Long groupId, Long userId) {
        joinGroup(groupId, userId, true);
    }

    @Transactional
    public void joinGroup(Long groupId, Long userId, boolean recordActivity) {
        GroupPost post = groupPostRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("글을 찾을 수 없습니다."));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));

        if (participantRepository.existsByUserAndGroupPost(user, post)) {
            miniHomeService.syncGoCatItemUnlocksForUser(userId);
            return;
        }

        // 📌 builder 패턴을 완성하고 .save()를 호출해야 DB에 저장됩니다.
        GroupParticipant participant = GroupParticipant.builder()
                .user(user)
                .groupPost(post)
                .joinedAt(LocalDateTime.now())
                .build();

        participantRepository.save(participant);

        // 정원 증가
        post.setCurrentCapacity(post.getCurrentCapacity() + 1);

        // 정원이 꽉 차면 RECRUITING → IN_PROGRESS (채팅 유지, 모집만 마감)
        if (post.getMaxCapacity() != null
                && post.getCurrentCapacity() >= post.getMaxCapacity()
                && "RECRUITING".equals(post.getStatus())) {
            post.setStatus("IN_PROGRESS");
        }

        if (recordActivity) {
            boolean alreadyLogged = activityLogRepository.existsByUserIdAndActivityTypeAndReferenceId(
                    userId,
                    "EVENT_PARTICIPATION",
                    groupId
            );
            if (!alreadyLogged) {
                String eventTitle = post.getEvent() != null && !post.getEvent().isBlank()
                        ? post.getEvent().trim()
                        : post.getTitle();
                miniHomeService.recordEventParticipationActivity(userId, groupId, eventTitle);
            }
        }
        miniHomeService.syncGoCatItemUnlocksForUser(userId);
    }

    // 📌 컨트롤러에서 빨간 줄 뜨던 메서드 (참여 목록 가져오기)
    @Transactional(readOnly = true)
    public List<Long> getJoinedGroupIdsByUserId(Long userId) {
        return participantRepository.findByUser_Id(userId).stream()
                .map(p -> p.getGroupPost().getId())
                .collect(Collectors.toList());
    }

    @Transactional
    public void leaveGroup(Long groupId, Long userId) {
        GroupPost post = groupPostRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("글을 찾을 수 없습니다."));

        if (!participantRepository.existsByUserAndGroupPost(
                userRepository.findById(userId).orElseThrow(), post)) {
            throw new RuntimeException("참여 중인 그룹이 아닙니다.");
        }

        participantRepository.deleteByUser_IdAndGroupPost_Id(userId, groupId);

        // 정원 감소 (0 아래로 내려가지 않도록)
        if (post.getCurrentCapacity() > 0) {
            post.setCurrentCapacity(post.getCurrentCapacity() - 1);
        }
    }

    @Transactional
    public void deleteGroupSafely(Long groupId) {
        // 1. 자식 데이터(참여자) 먼저 싹 지우기
        participantRepository.deleteByGroupPostId(groupId);

        // 2. 부모 데이터(모임글) 지우기
        groupPostRepository.deleteById(groupId);
    }

    /**
     * 모임 시간이 지난 RECRUITING 상태 그룹을 CLOSED 로 일괄 업데이트합니다.
     * GroupScheduler 에서 주기적으로 호출합니다.
     */
    @Transactional
    public int closeExpiredGroups() {
        String now = LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
        return groupPostRepository.closeExpiredGroups(now);
    }
}