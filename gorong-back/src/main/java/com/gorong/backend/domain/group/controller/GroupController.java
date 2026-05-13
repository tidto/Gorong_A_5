package com.gorong.backend.domain.group.controller;

import com.gorong.backend.domain.group.dto.GroupDto;
import com.gorong.backend.domain.group.entity.GroupPost;
import com.gorong.backend.domain.group.repository.GroupRepository;
import com.gorong.backend.domain.group.service.GroupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
@CrossOrigin(origins = "*") // 리액트 포트 허용
public class GroupController {

    @Autowired
    private GroupService groupService; // 📌 이 줄이 있어야 빨간 줄이 사라집니다!

    private final GroupRepository groupRepository;

    public GroupController(GroupRepository groupRepository) {
        this.groupRepository = groupRepository;
    }

    // 목록 조회
    @GetMapping
    public List<GroupPost> getAllGroups() {
        return groupRepository.findAll();
    }

    // 상세 조회
    @GetMapping("/{id}")
    public ResponseEntity<GroupPost> getGroup(@PathVariable Long id) {
        return groupRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // 글 작성
    @PostMapping
    public GroupPost createGroup(@RequestBody GroupPost groupPost) {
        return groupRepository.save(groupPost);
    }
    @PutMapping("/{id}/join")
    public ResponseEntity<GroupPost> joinGroup(@PathVariable Long id) {
        return groupRepository.findById(id).map(group -> {
            // 현재 인원이 최대 인원보다 적을 때만 증가
            if (group.getCurrentCapacity() < group.getMaxCapacity()) {
                group.setCurrentCapacity(group.getCurrentCapacity() + 1);
                GroupPost updatedGroup = groupRepository.save(group);
                return ResponseEntity.ok(updatedGroup);
            } else {
                // 정원이 찼다면 400 Bad Request 반환
                return ResponseEntity.badRequest().<GroupPost>build();
            }
        }).orElseGet(() -> ResponseEntity.notFound().build());
        // 🔥 orElse 대신 orElseGet을 사용하고 명확하게 ResponseEntity를 반환합니다.
    }

    @PutMapping("/{id}/wait")
    public ResponseEntity<GroupPost> waitGroup(@PathVariable Long id) {
        return groupRepository.findById(id).map(group -> {
            group.setWaitingCount(group.getWaitingCount() + 1);
            GroupPost updatedGroup = groupRepository.save(group);
            return ResponseEntity.ok(updatedGroup);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
    // 1. 글 삭제 API
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable Long id) {
        groupRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }


    // 수정 처리 (PUT)
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
    @GetMapping("/joined-ids")
    public ResponseEntity<List<Long>> getJoinedGroupIds() {
        Long userId = 1L; // 임시 테스트용 ID
        List<Long> joinedIds = groupService.getJoinedGroupIdsByUserId(userId);
        return ResponseEntity.ok(joinedIds);
    }

    @PostMapping("/api/groups")
    public ResponseEntity<GroupPost> createGroup(@RequestBody GroupDto dto) {
        GroupPost post = new GroupPost();
        post.setTitle(dto.getTitle());
        post.setContent(dto.getContent());
        post.setEvent(dto.getEvent());
        // 만약 location이 비어있다면 event 값으로 채워줌
        post.setLocation(dto.getEvent());
        post.setMaxCapacity(dto.getMaxCapacity());
        post.setMeetingDate(dto.getMeetingDate());
        post.setMeetingTime(dto.getMeetingTime());
        post.setCondition(dto.getCondition());

        return ResponseEntity.ok(groupRepository.save(post));
    }


}

