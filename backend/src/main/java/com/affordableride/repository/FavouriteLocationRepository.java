package com.affordableride.repository;

import com.affordableride.entity.FavouriteLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FavouriteLocationRepository extends JpaRepository<FavouriteLocation, Long> {

    List<FavouriteLocation> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<FavouriteLocation> findByIdAndUserId(Long id, Long userId);
}
