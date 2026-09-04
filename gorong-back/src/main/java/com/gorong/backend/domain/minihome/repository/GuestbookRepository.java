package com.gorong.backend.domain.minihome.repository;

import com.gorong.backend.domain.minihome.entity.Guestbook;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GuestbookRepository extends JpaRepository<Guestbook, Long> {

    /** 최상위 방명록 — 최신순 (답글 기능 확장 시 parentGuestbookId IS NULL 유지) */
    List<Guestbook> findByRoomOwnerUserIdAndParentGuestbookIdIsNullOrderByCreateAtDesc(Long roomOwnerUserId);

    long countByRoomOwnerUserId(Long roomOwnerUserId);
}
