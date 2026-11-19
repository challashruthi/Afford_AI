package com.affordableride.repository;

import com.affordableride.entity.SearchComparison;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SearchComparisonRepository extends JpaRepository<SearchComparison, Long> {
    List<SearchComparison> findByUserIdOrderByCreatedAtDesc(Long userId);
}
