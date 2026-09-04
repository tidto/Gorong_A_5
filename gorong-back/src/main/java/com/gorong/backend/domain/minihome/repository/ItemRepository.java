package com.gorong.backend.domain.minihome.repository;

import com.gorong.backend.domain.minihome.entity.Item;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ItemRepository extends JpaRepository<Item, Long> {
    Optional<Item> findByItemCode(String itemCode);
}

