package com.affordableride.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Persists a fully-calculated fare comparison record for the Fare Analytics dashboard.
 * Stored per user-initiated "Compare Rides & Find Cheapest" action.
 * The complete JSON breakdown is stored in a TEXT column to avoid complex normalization.
 */
@Entity
@Table(
    name = "search_comparisons",
    indexes = {
        @Index(name = "idx_sc_user_id", columnList = "user_id"),
        @Index(name = "idx_sc_created_at", columnList = "created_at")
    }
)
public class SearchComparison {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "ride_search_id")
    private Long rideSearchId;

    @Column(name = "pickup_name", nullable = false, length = 500)
    private String pickupName;

    @Column(name = "dest_name", nullable = false, length = 500)
    private String destName;

    @Column(name = "distance_km")
    private Double distanceKm;

    @Column(name = "total_potential_savings")
    private Double totalPotentialSavings;

    @Column(name = "valid_category_count")
    private Integer validCategoryCount;

    /**
     * Full JSON payload from the frontend's saveSearchComparison record.
     * Contains: categorySavings, winningProviders, options, etc.
     */
    @Column(name = "comparison_json", columnDefinition = "LONGTEXT", nullable = false)
    private String comparisonJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public SearchComparison() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Long getRideSearchId() { return rideSearchId; }
    public void setRideSearchId(Long rideSearchId) { this.rideSearchId = rideSearchId; }

    public String getPickupName() { return pickupName; }
    public void setPickupName(String pickupName) { this.pickupName = pickupName; }

    public String getDestName() { return destName; }
    public void setDestName(String destName) { this.destName = destName; }

    public Double getDistanceKm() { return distanceKm; }
    public void setDistanceKm(Double distanceKm) { this.distanceKm = distanceKm; }

    public Double getTotalPotentialSavings() { return totalPotentialSavings; }
    public void setTotalPotentialSavings(Double totalPotentialSavings) { this.totalPotentialSavings = totalPotentialSavings; }

    public Integer getValidCategoryCount() { return validCategoryCount; }
    public void setValidCategoryCount(Integer validCategoryCount) { this.validCategoryCount = validCategoryCount; }

    public String getComparisonJson() { return comparisonJson; }
    public void setComparisonJson(String comparisonJson) { this.comparisonJson = comparisonJson; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
