package com.affordableride.repository;

import com.affordableride.entity.RideProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RideProviderRepository extends JpaRepository<RideProvider, Long> {
    Optional<RideProvider> findByProviderNameIgnoreCase(String providerName);
    List<RideProvider> findByActiveTrue();
}
