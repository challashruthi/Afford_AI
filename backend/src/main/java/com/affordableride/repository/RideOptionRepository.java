package com.affordableride.repository;

import com.affordableride.entity.RideOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RideOptionRepository extends JpaRepository<RideOption, Long> {
    List<RideOption> findByProviderId(Long providerId);
    List<RideOption> findByProviderActiveTrue();
}
