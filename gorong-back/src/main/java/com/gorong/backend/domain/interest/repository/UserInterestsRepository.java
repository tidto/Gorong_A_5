package com.gorong.backend.domain.interest.repository;

import com.gorong.backend.domain.interest.entity.UserInterests;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UserInterestsRepository extends JpaRepository<UserInterests, Long> {
    List<UserInterests> findByUserId(Long userId);
    void deleteByUserId(Long userId); // 관심사 업데이트 시 기존 데이터 초기화용
}