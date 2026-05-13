package com.gorong.backend.domain.event.repository;

import com.gorong.backend.domain.event.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {
    @Query("SELECT e FROM Event e WHERE e.tourCategoryCode IN :codes " +
            "AND (e.areaCode = '4' OR e.areaCode = '35')")
    List<Event> findRecommendedEvents(@Param("codes") List<String> codes);
}