// 경로: domain/group/repository/ChatMessageRepository.java
package com.gorong.backend.domain.group.repository;

import com.gorong.backend.domain.group.entity.ChatMessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessageEntity, Long> {
    List<ChatMessageEntity> findByGroupIdOrderBySentAtAsc(Long groupId);
}