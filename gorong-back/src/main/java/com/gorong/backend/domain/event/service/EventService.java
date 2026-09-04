package com.gorong.backend.domain.event.service;

import com.gorong.backend.domain.event.dto.TourItemDto;
import com.gorong.backend.domain.event.entity.Event;
import com.gorong.backend.domain.event.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class EventService {
    private final EventRepository eventRepository;

    @Transactional
    public void saveEventFromApi(TourItemDto dto) {
        if (dto == null || dto.getContentid() == null) return;

        String area = dto.getAreacode();
        if (!"4".equals(area) && !"35".equals(area)) return;

        try {
            Long contentId = Long.parseLong(dto.getContentid());
            Event event = eventRepository.findById(contentId)
                    .orElseGet(() -> Event.builder().id(contentId).build());

            event.updateFromDto(dto);
            eventRepository.save(event);
        } catch (NumberFormatException e) {
            log.error("잘못된 ContentID 형식: {}", dto.getContentid());
        } catch (Exception e) {
            log.error("이벤트 저장 중 오류 발생: {}", e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<Event> getRecommendedEvents(List<String> userInterests) {
        // 관심사가 비어있을 경우 대구/경북 전체 이벤트를 반환하는 전용 메서드 권장
        if (userInterests == null || userInterests.isEmpty()) {
            return eventRepository.findAll().stream()
                    .filter(e -> "4".equals(e.getAreaCode()) || "35".equals(e.getAreaCode()))
                    .toList();
        }
        return eventRepository.findRecommendedEvents(userInterests);
    }
}