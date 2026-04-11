package com.gorong.backend.domain.user.repository;

import com.gorong.backend.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

    // 이 메서드 이름만 적어두면 Spring이 알아서
    // SELECT COUNT(*) FROM users WHERE firebase_uid = ? 쿼리를 실행해 줍니다! (가입 중복 방지용)
    boolean existsByFirebaseUid(String firebaseUid);

}