package com.affordableride.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "recommendations")
public class Recommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "search_id", nullable = false)
    private RideSearch search;

    @Column(name = "recommended_provider", nullable = false)
    private String recommendedProvider;

    @Column(name = "ride_type", nullable = false)
    private String rideType;

    @Column(name = "estimated_fare", nullable = false)
    private Double estimatedFare;

    @Column(name = "savings_amount", nullable = false)
    private Double savingsAmount;

    @Column(name = "score", nullable = false)
    private Double score;

    @Column(name = "reason", nullable = false, length = 500)
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Recommendation() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public RideSearch getSearch() { return search; }
    public void setSearch(RideSearch search) { this.search = search; }

    public String getRecommendedProvider() { return recommendedProvider; }
    public void setRecommendedProvider(String recommendedProvider) { this.recommendedProvider = recommendedProvider; }

    public String getRideType() { return rideType; }
    public void setRideType(String rideType) { this.rideType = rideType; }

    public Double getEstimatedFare() { return estimatedFare; }
    public void setEstimatedFare(Double estimatedFare) { this.estimatedFare = estimatedFare; }

    public Double getSavingsAmount() { return savingsAmount; }
    public void setSavingsAmount(Double savingsAmount) { this.savingsAmount = savingsAmount; }

    public Double getScore() { return score; }
    public void setScore(Double score) { this.score = score; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
