package com.gorong.backend.domain.group.service;

import com.gorong.backend.domain.group.entity.GroupPost;
import com.gorong.backend.domain.group.repository.GroupRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class GroupService {

    @Autowired
    private GroupRepository groupRepository; // 리포지토리 연결

    // 특정 유저가 참여한 그룹 ID 리스트를 가져오는 로직
    public List<Long> getJoinedGroupIdsByUserId(Long userId) {
        List<GroupPost> posts = groupRepository.findByAuthorId(userId);

        return posts.stream()
                .map(GroupPost::getId) // GroupPost 객체에서 ID만 추출
                .collect(Collectors.toList());
    }
}