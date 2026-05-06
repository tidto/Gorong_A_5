package com.gorong.backend.domain.group.controller;

import com.gorong.backend.domain.group.entity.GroupPost;
import com.gorong.backend.domain.group.repository.GroupRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
@CrossOrigin(origins = "http://localhost:5173") // 리액트 포트 허용
public class GroupController {

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
}

