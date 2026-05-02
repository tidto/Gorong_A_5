package com.gorong.backend.domain.interest.repository;

import com.gorong.backend.domain.interest.entity.Interests;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InterestsRepository extends JpaRepository<Interests, Long> {
    List<Interests> findAllByIdIn(List<Long> ids);
}