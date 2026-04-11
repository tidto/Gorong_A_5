package com.gorong.backend.domain.user.repository;

import com.gorong.backend.domain.user.entity.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {
    // 나중에 닉네임 중복 검사나 랭킹 쿼리 등을 여기에 추가하게 됩니다.
}