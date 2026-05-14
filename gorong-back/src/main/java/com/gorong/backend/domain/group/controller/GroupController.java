// 경로: domain/group/controller/GroupController.java
package com.gorong.backend.domain.group.controller;

import com.google.firebase.auth.FirebaseToken;
import com.gorong.backend.domain.group.entity.GroupPost;
import com.gorong.backend.domain.group.repository.GroupRepository;
import com.gorong.backend.domain.group.service.GroupService;
import com.gorong.backend.domain.user.entity.User;
import com.gorong.backend.domain.user.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/groups")
//@CrossOrigin(origins = "*", allowedHeaders = "*")
public class GroupController {

    private final GroupRepository groupRepository;
    private final UserRepository userRepository;   // ✅ 추가

    @Autowired
    private GroupService groupService;

    public GroupController(GroupRepository groupRepository, UserRepository userRepository) {
        this.groupRepository = groupRepository;
        this.userRepository = userRepository;
    }

    // ✅ Firebase 토큰 → User 엔티티 조회 헬퍼
    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof FirebaseToken)) return null;
        FirebaseToken token = (FirebaseToken) auth.getPrincipal();
        return userRepository.findByFirebaseUid(token.getUid()).orElse(null);
    }

    @GetMapping
    public List<GroupPost> getAllGroups() {
        return groupRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<GroupPost> getGroup(@PathVariable Long id) {
        return groupRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ✅ 글 작성 - 작성자 ID 자동 세팅
    @PostMapping
    public ResponseEntity<GroupPost> createGroup(@RequestBody GroupPost groupPost) {
        if (groupPost.getLocation() == null || groupPost.getLocation().isEmpty()) {
            groupPost.setLocation(groupPost.getEvent());
        }
        User currentUser = getCurrentUser();
        if (currentUser != null) {
            groupPost.setAuthor(currentUser);  // ✅ 여기서 author 세팅
        }
        return ResponseEntity.ok(groupRepository.save(groupPost));
    }

    // ✅ 참여 - GroupParticipant DB 저장
    @PutMapping("/{id}/join")
    public ResponseEntity<GroupPost> joinGroup(@PathVariable Long id) {
        User currentUser = getCurrentUser();

        return groupRepository.findById(id).map(group -> {
            if (group.getCurrentCapacity() >= group.getMaxCapacity()) {
                return ResponseEntity.badRequest().<GroupPost>build();
            }
            if (currentUser != null) {
                try {
                    groupService.joinGroup(id, currentUser.getId()); // ✅ participant 테이블 저장
                } catch (RuntimeException e) {
                    if (e.getMessage().contains("이미 참여")) {
                        return ResponseEntity.ok(group);
                    }
                }
            } else {
                // 비로그인 fallback
                group.setCurrentCapacity(group.getCurrentCapacity() + 1);
                groupRepository.save(group);
            }
            return ResponseEntity.ok(groupRepository.findById(id).orElse(group));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

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


    // ✅ 로그인 사용자 기준으로 참여 목록 조회
    @GetMapping("/joined-ids")
    public ResponseEntity<List<Long>> getJoinedGroupIds() {
        User currentUser = getCurrentUser();
        if (currentUser == null) return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(groupService.getJoinedGroupIdsByUserId(currentUser.getId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable Long id) {
        // ❌ 이렇게 되어 있으면 안 됩니다! (기존 코드)
        // groupRepository.deleteById(id);

        // 🟢 이렇게 수정되어야 합니다! (서비스 호출)
        try {
            groupService.deleteGroupSafely(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
}