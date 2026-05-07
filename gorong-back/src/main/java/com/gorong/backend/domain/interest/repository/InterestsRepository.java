package com.gorong.backend.domain.interest.repository;

import com.gorong.backend.domain.interest.entity.Interests;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InterestsRepository extends JpaRepository<Interests, Long> {

    // 내부 로직 등에서 ID로 찾을 때 사용
    List<Interests> findAllByIdIn(List<Long> ids);

    // 프론트엔드에서 넘어오는 관심사 코드("A01", "A02" 등)로 찾을 때 사용
    List<Interests> findByCodeIn(List<String> codes);
}