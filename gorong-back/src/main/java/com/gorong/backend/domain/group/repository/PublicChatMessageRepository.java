// 경로: domain/group/repository/PublicChatMessageRepository.java
package com.gorong.backend.domain.group.repository;

import com.gorong.backend.domain.group.entity.PublicChatMessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PublicChatMessageRepository extends JpaRepository<PublicChatMessageEntity, Long> {

    /** 최근 60개 메시지를 오래된 순으로 반환 (채팅 이력 조회용) */
    List<PublicChatMessageEntity> findTop60ByGroupIdOrderBySentAtAsc(Long groupId);
}