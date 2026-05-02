package com.gorong.backend.domain.user.repository;

import com.gorong.backend.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    boolean existsByFirebaseUid(String firebaseUid);
    Optional<User> findByFirebaseUid(String firebaseUid);
}