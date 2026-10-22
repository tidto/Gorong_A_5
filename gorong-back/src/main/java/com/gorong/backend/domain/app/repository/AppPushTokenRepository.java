package com.gorong.backend.domain.app.repository;

import com.gorong.backend.domain.app.entity.AppPushToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AppPushTokenRepository extends JpaRepository<AppPushToken, Long> {
    Optional<AppPushToken> findByToken(String token);
    Optional<AppPushToken> findByTokenAndUserId(String token, Long userId);
    List<AppPushToken> findByUserIdIn(Collection<Long> userIds);
}
