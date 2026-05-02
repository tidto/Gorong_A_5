package com.gorong.backend.domain.interest.repository;

import com.gorong.backend.domain.interest.entity.UserInterests;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserInterestsRepository extends JpaRepository<UserInterests, Long> {
}