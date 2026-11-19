package com.affordableride.repository;

import com.affordableride.entity.RideSearch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RideSearchRepository extends JpaRepository<RideSearch, Long> {
    List<RideSearch> findByUserIdOrderByCreatedAtDesc(Long userId);
}
