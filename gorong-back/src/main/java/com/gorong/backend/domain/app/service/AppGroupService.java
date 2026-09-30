package com.gorong.backend.domain.app.service;

import com.google.firebase.auth.FirebaseToken;
import com.gorong.backend.domain.app.dto.AppGroupCreateRequestDto;
import com.gorong.backend.domain.app.dto.AppGroupResponseDto;
import com.gorong.backend.domain.group.entity.GroupParticipant;
import com.gorong.backend.domain.group.entity.GroupPost;
import com.gorong.backend.domain.group.repository.GroupParticipantRepository;
import com.gorong.backend.domain.group.repository.GroupRepository;
import com.gorong.backend.domain.group.service.GroupService;
import com.gorong.backend.domain.group.service.EventParticipationService;
import com.gorong.backend.domain.user.entity.User;
import com.gorong.backend.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppGroupService {

    private final GroupRepository groupRepository;
    private final GroupParticipantRepository participantRepository;
    private final GroupService groupService;
    private final UserRepository userRepository;
    private final com.gorong.backend.domain.group.repository.EventParticipationRepository eventParticipationRepository;
    private final EventParticipationService eventParticipationService;

    @Transactional(readOnly = true)
    public List<AppGroupResponseDto> getGroups(Authentication authentication) {
        User currentUser = resolveCurrentUser(authentication);

        // 현재 사용자 기준 참가한 그룹 ID를 미리 조회해 joined 플래그를 계산한다.
        Set<Long> joinedGroupIds = currentUser == null
                ? Set.of()
                : participantRepository.findByUserId(currentUser.getId()).stream()
                .map(GroupParticipant::getGroupPost)
                .map(GroupPost::getId)
                .collect(Collectors.toSet());

        return groupRepository.findAll().stream()
                .sorted(Comparator.comparing(GroupPost::getId).reversed())
                .map(group -> toDto(group, joinedGroupIds.contains(group.getId()), currentUser))
                .toList();
    }

    @Transactional
    public AppGroupResponseDto createGroup(Authentication authentication, AppGroupCreateRequestDto requestDto) {
        User currentUser = requireCurrentUser(authentication);

        GroupPost groupPost = new GroupPost();
        groupPost.setAuthor(currentUser);

        // 기본 즉석 모임 생성과 모집 게시글 생성을 함께 지원한다.
        if (requestDto.getTitle() != null && !requestDto.getTitle().isBlank()) {
            groupPost.setTitle(requestDto.getTitle().trim());
            groupPost.setEvent(requestDto.getEvent());
            groupPost.setEventContentId(requestDto.getEventContentId());
            groupPost.setLocation(requestDto.getLocation());
            groupPost.setContent(requestDto.getContent());
            groupPost.setCondition(requestDto.getCondition());
            groupPost.setMeetingDate(requestDto.getMeetingDate());
            groupPost.setMeetingTime(requestDto.getMeetingTime());
            groupPost.setMaxCapacity(requestDto.getMaxMembers() == null ? 4 : requestDto.getMaxMembers());
            GroupPost savedPost = groupRepository.save(groupPost);
            groupService.joinGroup(savedPost.getId(), currentUser.getId(), false);
            String participationContentId = (savedPost.getEventContentId() != null && !savedPost.getEventContentId().isBlank())
                    ? savedPost.getEventContentId() : savedPost.getEvent();
            if (participationContentId != null && !participationContentId.isBlank()) {
                try { eventParticipationService.applyGroup(currentUser.getId(), participationContentId, savedPost.getEvent(), savedPost.getId()); }
                catch (Exception ignored) { }
            }
            return toDto(groupRepository.findById(savedPost.getId()).orElse(savedPost), true, currentUser);
        }
        // 앱 즉석 모임은 최소 필드로 생성하고, venueId를 event/location에 남겨 추적 가능하게 둔다.
        String venueId = (requestDto.getVenueId() == null || requestDto.getVenueId().isBlank())
                ? "UNKNOWN_VENUE"
                : requestDto.getVenueId().trim();
        groupPost.setTitle("[앱] 즉석 모임");
        groupPost.setEvent(venueId);
        groupPost.setLocation(venueId);
        groupPost.setContent("앱에서 생성된 즉석 모임입니다.");
        groupPost.setCondition("#앱모임");
        groupPost.setMeetingDate("");
        groupPost.setMeetingTime("");
        groupPost.setMaxCapacity(requestDto.getMaxMembers() == null ? 4 : requestDto.getMaxMembers());

        GroupPost saved = groupRepository.save(groupPost);
        groupService.joinGroup(saved.getId(), currentUser.getId(), false);
        GroupPost latest = groupRepository.findById(saved.getId()).orElse(saved);
        return toDto(latest, true, currentUser);
    }

    @Transactional
    public AppGroupResponseDto joinGroup(Authentication authentication, Long groupId) {
        User currentUser = requireCurrentUser(authentication);
        groupService.joinGroup(groupId, currentUser.getId());

        GroupPost group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 그룹입니다."));
        return toDto(group, true, currentUser);
    }

    @Transactional
    public AppGroupResponseDto gatherGroup(Authentication authentication, Long groupId) {
        User currentUser = requireCurrentUser(authentication);
        GroupPost group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 그룹입니다."));

        boolean joined = participantRepository.existsByUserAndGroupPost(currentUser, group);
        if (!joined) {
            throw new IllegalStateException("참가한 그룹만 모였다 인증이 가능합니다.");
        }

        // 인원 충족된 그룹만 '모였다' 상태로 전환한다.
        if (group.getCurrentCapacity() < group.getMaxCapacity()) {
            throw new IllegalStateException("아직 그룹 인원이 모두 모이지 않았습니다.");
        }

        group.setStatus("FINISHED");
        GroupPost updated = groupRepository.save(group);
        return toDto(updated, true, currentUser);
    }

    @Transactional
    public void deleteGroup(Authentication authentication, Long groupId) {
        User currentUser = requireCurrentUser(authentication);
        GroupPost group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 모임입니다."));
        if (group.getAuthor() == null || !group.getAuthor().getId().equals(currentUser.getId())) {
            throw new SecurityException("작성자만 모임을 삭제할 수 있습니다.");
        }
        eventParticipationRepository.deleteByGroupPostId(groupId);
        participantRepository.deleteByGroupPostId(groupId);
        groupRepository.delete(group);
    }

    @Transactional
    public AppGroupResponseDto updateGroup(Authentication authentication, Long groupId, AppGroupCreateRequestDto requestDto) {
        User currentUser = requireCurrentUser(authentication);
        GroupPost group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 모임입니다."));
        if (group.getAuthor() == null || !group.getAuthor().getId().equals(currentUser.getId())) {
            throw new SecurityException("작성자만 모임을 수정할 수 있습니다.");
        }
        if (requestDto.getTitle() == null || requestDto.getTitle().isBlank()
                || requestDto.getEvent() == null || requestDto.getEvent().isBlank()
                || requestDto.getLocation() == null || requestDto.getLocation().isBlank()) {
            throw new IllegalArgumentException("모임명, 행사, 장소는 필수입니다.");
        }
        if (requestDto.getMaxMembers() == null || requestDto.getMaxMembers() < 2 || requestDto.getMaxMembers() > 100) {
            throw new IllegalArgumentException("모집 인원은 2명 이상 100명 이하여야 합니다.");
        }
        group.setTitle(requestDto.getTitle().trim());
        group.setEvent(requestDto.getEvent().trim());
        group.setEventContentId(requestDto.getEventContentId());
        group.setLocation(requestDto.getLocation().trim());
        group.setContent(requestDto.getContent());
        group.setCondition(requestDto.getCondition());
        group.setMeetingDate(requestDto.getMeetingDate());
        group.setMeetingTime(requestDto.getMeetingTime());
        group.setMaxCapacity(requestDto.getMaxMembers());
        return toDto(groupRepository.save(group), true, currentUser);
    }

    private AppGroupResponseDto toDto(GroupPost group, boolean joined) {
        return toDto(group, joined, null);
    }

    private AppGroupResponseDto toDto(GroupPost group, boolean joined, User currentUser) {
        boolean gathered = "FINISHED".equalsIgnoreCase(group.getStatus());
        return AppGroupResponseDto.builder()
                .id(group.getId())
                .title(group.getTitle())
                .event(group.getEvent())
                .eventContentId(group.getEventContentId())
                .location(group.getLocation())
                .content(group.getContent())
                .condition(group.getCondition())
                .meetingDate(group.getMeetingDate())
                .meetingTime(group.getMeetingTime())
                .maxMembers(group.getMaxCapacity())
                .currentMembers(group.getCurrentCapacity())
                .joined(joined)
                .gathered(gathered)
                .status(group.getStatus())
                .ownedByMe(currentUser != null && group.getAuthor() != null && group.getAuthor().getId().equals(currentUser.getId()))
                .build();
    }

    private User requireCurrentUser(Authentication authentication) {
        User user = resolveCurrentUser(authentication);
        if (user == null) {
            throw new IllegalStateException("앱 그룹 기능은 회원 연동 계정으로 로그인해야 사용할 수 있습니다.");
        }
        return user;
    }

    private User resolveCurrentUser(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof FirebaseToken token)) {
            return null;
        }
        return userRepository.findByFirebaseUid(token.getUid()).orElse(null);
    }
}
