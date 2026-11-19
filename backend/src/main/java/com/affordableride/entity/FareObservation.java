package com.affordableride.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "fare_snapshots",
    indexes = {
        @Index(name = "idx_search_id", columnList = "search_id"),
        @Index(name = "idx_provider", columnList = "provider_name"),
        @Index(name = "idx_timestamp", columnList = "timestamp_ms")
    }
)
public class FareObservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "search_id", nullable = false)
    private Long searchId;

    @Column(name = "provider_name", nullable = false)
    private String providerName;

    @Column(name = "ride_type", nullable = false)
    private String rideType;

    @Column(name = "predicted_fare", nullable = false)
    private Double predictedFare;

    @Column(name = "distance_km", nullable = false)
    private Double distanceKm;

    @Column(name = "duration_mins", nullable = false)
    private Double durationMins;

    @Column(name = "surge_factor")
    private Double surgeFactor;

    @Column(name = "prediction_mode")
    private String predictionMode = "ML_PREDICTED";

    @Column(name = "observed_at", nullable = false)
    private LocalDateTime observedAt = LocalDateTime.now();

    @Column(name = "timestamp_ms", nullable = false)
    private Long timestampMs;

    public FareObservation() {}

    public FareObservation(Long searchId, String providerName, String rideType, Double predictedFare,
                           Double distanceKm, Double durationMins, Double surgeFactor, String predictionMode) {
        this.searchId = searchId;
        this.providerName = providerName;
        this.rideType = rideType;
        this.predictedFare = Math.round(predictedFare * 100.0) / 100.0;
        this.distanceKm = distanceKm;
        this.durationMins = durationMins;
        this.surgeFactor = surgeFactor != null ? surgeFactor : 1.0;
        this.predictionMode = predictionMode != null ? predictionMode : "ML_PREDICTED";
        this.observedAt = LocalDateTime.now();
        this.timestampMs = System.currentTimeMillis();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getSearchId() { return searchId; }
    public void setSearchId(Long searchId) { this.searchId = searchId; }

    public String getProviderName() { return providerName; }
    public void setProviderName(String providerName) { this.providerName = providerName; }

    public String getRideType() { return rideType; }
    public void setRideType(String rideType) { this.rideType = rideType; }

    public Double getPredictedFare() { return predictedFare; }
    public void setPredictedFare(Double predictedFare) { this.predictedFare = predictedFare; }

    public Double getDistanceKm() { return distanceKm; }
    public void setDistanceKm(Double distanceKm) { this.distanceKm = distanceKm; }

    public Double getDurationMins() { return durationMins; }
    public void setDurationMins(Double durationMins) { this.durationMins = durationMins; }

    public Double getSurgeFactor() { return surgeFactor; }
    public void setSurgeFactor(Double surgeFactor) { this.surgeFactor = surgeFactor; }

    public String getPredictionMode() { return predictionMode; }
    public void setPredictionMode(String predictionMode) { this.predictionMode = predictionMode; }

    public LocalDateTime getObservedAt() { return observedAt; }
    public void setObservedAt(LocalDateTime observedAt) { this.observedAt = observedAt; }

    public Long getTimestampMs() { return timestampMs; }
    public void setTimestampMs(Long timestampMs) { this.timestampMs = timestampMs; }
}
