package com.gorong.backend.domain.minihome.repository;

import com.gorong.backend.domain.minihome.entity.Item;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ItemRepository extends JpaRepository<Item, Long> {
    Optional<Item> findByItemCode(String itemCode);

    @Query("SELECT i FROM Item i WHERE UPPER(i.itemCode) = UPPER(:itemCode)")
    Optional<Item> findByItemCodeIgnoreCase(@Param("itemCode") String itemCode);

    @Query("SELECT i FROM Item i WHERE UPPER(TRIM(i.itemCode)) = UPPER(TRIM(:itemCode))")
    List<Item> findAllByItemCodeIgnoreCase(@Param("itemCode") String itemCode);
}

