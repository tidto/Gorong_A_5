// 경로: domain/group/controller/GroupController.java
package com.gorong.backend.domain.group.controller;

import com.google.firebase.auth.FirebaseToken;
import com.gorong.backend.domain.group.entity.GroupPost;
import com.gorong.backend.domain.group.repository.GroupRepository;
import com.gorong.backend.domain.group.service.GroupService;
import com.gorong.backend.domain.user.entity.User;
import com.gorong.backend.domain.user.entity.UserProfile;
import com.gorong.backend.domain.user.repository.UserProfileRepository;
import com.gorong.backend.domain.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class GroupController {

    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository; // ✅ 추가

    @Autowired
    private GroupService groupService;

    public GroupController(GroupRepository groupRepository,
                           UserRepository userRepository,
                           UserProfileRepository userProfileRepository) { // ✅ 추가
        this.groupRepository = groupRepository;
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
    }

    // Firebase 토큰 → User 엔티티
    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
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

    // ── 2. 상세 조회 ─────────────────────────────────────────────────
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
    public ResponseEntity<GroupPost> createGroup(@RequestBody GroupPost groupPost) {
        if (groupPost.getLocation() == null || groupPost.getLocation().isEmpty()) {
            groupPost.setLocation(groupPost.getEvent());
        }
        User currentUser = getCurrentUser();
        if (currentUser != null) {
            groupPost.setAuthor(currentUser);
        }
        return ResponseEntity.ok(groupRepository.save(groupPost));
    }

    // ── 4. 참여 ──────────────────────────────────────────────────────
    @PutMapping("/{id}/join")
    public ResponseEntity<GroupPost> joinGroup(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        return groupRepository.findById(id).map(group -> {
            if (group.getCurrentCapacity() >= group.getMaxCapacity()) {
                return ResponseEntity.badRequest().<GroupPost>build();
            }
            if (currentUser != null) {
                try {
                    groupService.joinGroup(id, currentUser.getId());
                } catch (RuntimeException e) {
                    if (e.getMessage().contains("이미 참여")) {
                        return ResponseEntity.ok(group);
                    }
                }
            } else {
                group.setCurrentCapacity(group.getCurrentCapacity() + 1);
                groupRepository.save(group);
            }
            return ResponseEntity.ok(groupRepository.findById(id).orElse(group));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // ── 5. 수정 ──────────────────────────────────────────────────────
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
        if (groupRepository.existsById(id)) {
            groupRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    // ── 7. 참여 목록 조회 ─────────────────────────────────────────────
    @GetMapping("/joined-ids")
    public ResponseEntity<List<Long>> getJoinedGroupIds() {
        User currentUser = getCurrentUser();
        if (currentUser == null) return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(groupService.getJoinedGroupIdsByUserId(currentUser.getId()));
    }
}