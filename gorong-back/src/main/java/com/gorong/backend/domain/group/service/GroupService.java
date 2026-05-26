package com.gorong.backend.domain.group.service;

import com.gorong.backend.domain.group.entity.GroupParticipant;
import com.gorong.backend.domain.group.entity.GroupPost;
import com.gorong.backend.domain.group.repository.GroupParticipantRepository;
import com.gorong.backend.domain.group.repository.GroupRepository;
import com.gorong.backend.domain.user.entity.User;
import com.gorong.backend.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupService {
    private final GroupRepository groupPostRepository;
    private final GroupParticipantRepository participantRepository;
    private final UserRepository userRepository;

    @Transactional
    public void joinGroup(Long groupId, Long userId) {
        GroupPost post = groupPostRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("글을 찾을 수 없습니다."));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));

        if (participantRepository.existsByUserAndGroupPost(user, post)) {
            throw new RuntimeException("이미 참여 중인 방입니다.");
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
    }

    // 📌 컨트롤러에서 빨간 줄 뜨던 메서드 (참여 목록 가져오기)
    @Transactional(readOnly = true)
    public List<Long> getJoinedGroupIdsByUserId(Long userId) {
        return participantRepository.findByUserId(userId).stream()
                .map(p -> p.getGroupPost().getId())
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteGroupSafely(Long groupId) {
        // 1. 자식 데이터(참여자) 먼저 싹 지우기
        participantRepository.deleteAllByGroupPostId(groupId);

        // 2. 부모 데이터(모임글) 지우기
        groupPostRepository.deleteById(groupId);


    }
}
