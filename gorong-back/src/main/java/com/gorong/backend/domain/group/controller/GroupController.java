// 경로: domain/group/controller/GroupController.java
package com.gorong.backend.domain.group.controller;

import com.google.firebase.auth.FirebaseToken;
import com.gorong.backend.domain.group.entity.GroupPost;
import com.gorong.backend.domain.group.repository.GroupParticipantRepository;
import com.gorong.backend.domain.group.repository.GroupRepository;
import com.gorong.backend.domain.group.service.GroupService;
import com.gorong.backend.domain.group.service.EventParticipationService;
import com.gorong.backend.domain.user.entity.User;
import com.gorong.backend.domain.user.entity.UserProfile;
import com.gorong.backend.domain.user.repository.UserProfileRepository;
import com.gorong.backend.domain.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class GroupController {

    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository; // ✅ 추가
    private final GroupParticipantRepository participantRepository;

    @Autowired
    private GroupService groupService;

    @Autowired
    private EventParticipationService eventParticipationService;

    public GroupController(GroupRepository groupRepository,
                           UserRepository userRepository,
                           UserProfileRepository userProfileRepository, // ✅ 추가
                           GroupParticipantRepository participantRepository) {
        this.groupRepository = groupRepository;
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
        this.participantRepository = participantRepository;
    }

    // Firebase 토큰 → User 엔티티
    private User getCurrentUser(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof FirebaseToken)) return null;
        FirebaseToken token = (FirebaseToken) auth.getPrincipal();
        return userRepository.findByFirebaseUid(token.getUid()).orElse(null);
    }

    // ✅ 유저 ID → 닉네임 조회 헬퍼
    private String getNickname(Long userId) {
        if (userId == null) return null;
        return userProfileRepository.findByUserId(userId)
                .map(UserProfile::getNickname)
                .orElse(null);
    }

    // ── 1. 전체 목록 조회 - authorNickname 세팅 ──────────────────────
    @GetMapping
    public List<GroupPost> getAllGroups() {
        List<GroupPost> posts = groupRepository.findAll();
        posts.forEach(post -> {
            if (post.getAuthor() != null) {
                post.setAuthorNickname(getNickname(post.getAuthor().getId())); // ✅ 닉네임 주입
            }
        });
        return posts;
    }

    // ── 2. 참여 목록 조회 (/{id}보다 먼저 등록 — joined-recruiting 등 경로 충돌 방지) ──
    @GetMapping("/joined-ids")
    public ResponseEntity<List<Long>> getJoinedGroupIds(Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        if (currentUser == null) return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(groupService.getJoinedGroupIdsByUserId(currentUser.getId()));
    }

    @GetMapping("/joined-recruiting")
    public ResponseEntity<List<GroupPost>> getJoinedRecruitingGroups(Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        if (currentUser == null) return ResponseEntity.ok(List.of());
        List<GroupPost> posts = groupService.getJoinedRecruitingGroupsByUserId(currentUser.getId());
        posts.forEach(post -> {
            if (post.getAuthor() != null) {
                post.setAuthorNickname(getNickname(post.getAuthor().getId()));
            }
        });
        return ResponseEntity.ok(posts);
    }

    // ── 3. 상세 조회 ─────────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<GroupPost> getGroup(@PathVariable Long id) {
        return groupRepository.findById(id)
                .map(post -> {
                    if (post.getAuthor() != null) {
                        post.setAuthorNickname(getNickname(post.getAuthor().getId())); // ✅
                    }
                    return ResponseEntity.ok(post);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ── 3. 글 작성 ───────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<GroupPost> createGroup(
            @RequestBody GroupPost groupPost,
            Authentication authentication
    ) {
        if (groupPost.getLocation() == null || groupPost.getLocation().isEmpty()) {
            groupPost.setLocation(groupPost.getEvent());
        }

        User currentUser = getCurrentUser(authentication);
        if (currentUser != null) {
            groupPost.setAuthor(currentUser);
        }

        GroupPost saved = groupRepository.save(groupPost);

        // ✅ 작성자를 자동으로 참여자로 등록 (채팅방 입장 가능하게)
        if (currentUser != null) {
            try {
                groupService.joinGroup(saved.getId(), currentUser.getId(), false);
            } catch (RuntimeException e) {
                // 이미 참여 중이면 무시
            }

            // ✅ 주최자도 event_participation에 그룹 참여로 기록
            try {
                // eventContentId(TourAPI contentId) 우선, 없으면 event 텍스트로 fallback
                String participationContentId = (saved.getEventContentId() != null && !saved.getEventContentId().isBlank())
                        ? saved.getEventContentId()
                        : saved.getEvent();
                if (participationContentId != null && !participationContentId.isBlank()) {
                    eventParticipationService.applyGroup(
                            currentUser.getId(),
                            participationContentId,
                            saved.getEvent(),
                            saved.getId()
                    );
                }
            } catch (Exception e) {
                // 이력 저장 실패는 그룹 생성 자체를 막지 않음
            }
        }

        return ResponseEntity.ok(saved);
    }

    // ── 4. 참여 ──────────────────────────────────────────────────────
    @PutMapping("/{id}/join")
    public ResponseEntity<GroupPost> joinGroup(@PathVariable Long id, Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return groupRepository.findById(id).map(group -> {
            if (group.getCurrentCapacity() >= group.getMaxCapacity()) {
                return ResponseEntity.badRequest().<GroupPost>build();
            }
            try {
                groupService.joinGroup(id, currentUser.getId());
            } catch (RuntimeException e) {
                if (e.getMessage().contains("이미 참여")) {
                    return ResponseEntity.ok(group);
                }
                throw new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "참여 신청 처리 중 오류가 발생했습니다.",
                        e
                );
            }
            return ResponseEntity.ok(groupRepository.findById(id).orElse(group));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // ── 5. 참여 취소 ─────────────────────────────────────────────────
    @DeleteMapping("/{id}/leave")
    public ResponseEntity<Void> leaveGroup(@PathVariable Long id, Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        if (currentUser == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        try {
            groupService.leaveGroup(id, currentUser.getId());
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // ── 6. 수정 ──────────────────────────────────────────────────────
    @PutMapping("/{id}")
    public ResponseEntity<GroupPost> updateGroup(@PathVariable Long id, @RequestBody GroupPost updatedPost) {
        return groupRepository.findById(id)
                .map(post -> {
                    post.setTitle(updatedPost.getTitle());
                    post.setContent(updatedPost.getContent());
                    post.setLocation(updatedPost.getLocation());
                    post.setMaxCapacity(updatedPost.getMaxCapacity());
                    post.setEvent(updatedPost.getEvent());
                    post.setCondition(updatedPost.getCondition());
                    post.setMeetingDate(updatedPost.getMeetingDate());
                    post.setMeetingTime(updatedPost.getMeetingTime());
                    return ResponseEntity.ok(groupRepository.save(post));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ── 6. 삭제 ──────────────────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable Long id) {
        if (!groupRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        // ✅ FK 제약 해소: 참여자 먼저 삭제
        participantRepository.deleteByGroupPostId(id);
        groupRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

}