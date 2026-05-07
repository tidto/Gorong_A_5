package com.gorong.backend.domain.minihome.repository;

import com.gorong.backend.domain.minihome.entity.CatEquip;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CatEquipRepository extends JpaRepository<CatEquip, Long> {
    List<CatEquip> findByGoCatIdAndIsActiveOrderByEquippedAtDesc(Long goCatId, Boolean isActive);

    List<CatEquip> findByGoCatIdAndIsActiveAndSlotTypeOrderByEquippedAtDesc(Long goCatId, Boolean isActive, String slotType);

    Optional<CatEquip> findFirstByGoCatIdAndIsActiveAndSlotTypeOrderByEquippedAtDesc(Long goCatId, Boolean isActive, String slotType);
}

