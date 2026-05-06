package com.gorong.backend.domain.minihome.service;

import com.gorong.backend.domain.minihome.dto.MiniHomeResponseDto;
import com.gorong.backend.domain.minihome.dto.MiniHomeUpdateRequestDto;
import com.gorong.backend.domain.minihome.entity.GoCat;
import com.gorong.backend.domain.minihome.entity.MiniHome;
import com.gorong.backend.domain.minihome.repository.GoCatRepository;
import com.gorong.backend.domain.minihome.repository.MiniHomeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MiniHomeService {

    private final MiniHomeRepository miniHomeRepository;
    private final GoCatRepository goCatRepository;

    public MiniHomeResponseDto getMiniHome(Long userId) {
        MiniHome miniHome = miniHomeRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("미니홈이 없습니다. userId=" + userId));

        GoCat goCat = goCatRepository.findByMiniHomeId(miniHome.getMiniHomeId())
                .orElse(null);

        return MiniHomeResponseDto.from(miniHome, goCat);
    }

    @Transactional
    public MiniHomeResponseDto createMiniHome(Long userId) {
        MiniHome miniHome = miniHomeRepository.findByUserId(userId)
                .orElseGet(() -> miniHomeRepository.save(
                        MiniHome.builder()
                                .userId(userId)
                                .description("안녕하세요! GO냥이의 미니홈입니다.")
                                .themeCode("BASIC")
                                .isPublic(true)
                                .build()
                ));

        GoCat goCat = goCatRepository.findByMiniHomeId(miniHome.getMiniHomeId())
                .orElseGet(() -> goCatRepository.save(
                        GoCat.builder()
                                .userId(userId)
                                .miniHomeId(miniHome.getMiniHomeId())
                                .catName("GO냥이")
                                .characterType("BASIC")
                                .appearanceState("{}")
                                .build()
                ));

        return MiniHomeResponseDto.from(miniHome, goCat);
    }

    @Transactional
    public MiniHomeResponseDto updateMiniHome(Long userId, MiniHomeUpdateRequestDto request) {
        MiniHome miniHome = miniHomeRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("미니홈이 없습니다. userId=" + userId));

        if (request.getDescription() != null) {
            miniHome.setDescription(request.getDescription());
        }

        if (request.getThemeCode() != null) {
            miniHome.setThemeCode(request.getThemeCode());
        }

        if (request.getIsPublic() != null) {
            miniHome.setIsPublic(request.getIsPublic());
        }

        // 꾸미기 기능 필드 추가
        if (request.getFurnitureItems() != null) {
            miniHome.setFurnitureItems(request.getFurnitureItems());
        }

        if (request.getBackgroundColor() != null) {
            miniHome.setBackgroundColor(request.getBackgroundColor());
        }

        if (request.getCharacterColor() != null) {
            miniHome.setCharacterColor(request.getCharacterColor());
        }

        if (request.getCharacterPattern() != null) {
            miniHome.setCharacterPattern(request.getCharacterPattern());
        }

        miniHomeRepository.save(miniHome);

        GoCat goCat = goCatRepository.findByMiniHomeId(miniHome.getMiniHomeId())
                .orElse(null);

        return MiniHomeResponseDto.from(miniHome, goCat);
    }
}
