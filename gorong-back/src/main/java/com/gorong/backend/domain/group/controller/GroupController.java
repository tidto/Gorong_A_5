package com.gorong.backend.domain.group.controller;

import com.gorong.backend.domain.group.entity.GroupPost;
import com.gorong.backend.domain.group.repository.GroupRepository;
import com.gorong.backend.domain.group.service.GroupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class GroupController {

    private final GroupRepository groupRepository;

    @Autowired
    private GroupService groupService;

    // 생성자 주입
    public GroupController(GroupRepository groupRepository) {
        this.groupRepository = groupRepository;
    }

    // 1. 전체 목록 조회
    @GetMapping
    public List<GroupPost> getAllGroups() {
        return groupRepository.findAll();
    }

    // 2. 상세 조회
    @GetMapping("/{id}")
    public ResponseEntity<GroupPost> getGroup(@PathVariable Long id) {
        return groupRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // 3. 게시글 작성
    @PostMapping
    public GroupPost createGroup(@RequestBody GroupPost groupPost) {
        // 리액트에서 location 값이 비어있을 경우 event 값으로 대체해주는 방어 코드
        if (groupPost.getLocation() == null || groupPost.getLocation().isEmpty()) {
            groupPost.setLocation(groupPost.getEvent());
        }
        return groupRepository.save(groupPost);
    }

    // 4. 모임 참여하기 (인원 수 증가)
    @PutMapping("/{id}/join")
    public ResponseEntity<GroupPost> joinGroup(@PathVariable Long id) {
        return groupRepository.findById(id).map(group -> {
            if (group.getCurrentCapacity() < group.getMaxCapacity()) {
                group.setCurrentCapacity(group.getCurrentCapacity() + 1);
                return ResponseEntity.ok(groupRepository.save(group));
            } else {
                // 정원 초과 시 400 Bad Request
                return ResponseEntity.badRequest().<GroupPost>build();
            }
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // 5. 게시글 수정
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

    // 6. 게시글 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable Long id) {
        if (groupRepository.existsById(id)) {
            groupRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    // 7. 사용자가 참여한 그룹 ID 리스트 조회
    @GetMapping("/joined-ids")
    public ResponseEntity<List<Long>> getJoinedGroupIds() {
        Long userId = 1L; // 테스트용 임시 사용자 ID
        List<Long> joinedIds = groupService.getJoinedGroupIdsByUserId(userId);
        return ResponseEntity.ok(joinedIds);
    }
}