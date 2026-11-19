package com.affordableride.repository;

import com.affordableride.entity.FareObservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FareObservationRepository extends JpaRepository<FareObservation, Long> {
    List<FareObservation> findBySearchIdOrderByTimestampMsAsc(Long searchId);
    List<FareObservation> findBySearchIdAndProviderNameOrderByTimestampMsAsc(Long searchId, String providerName);
}
