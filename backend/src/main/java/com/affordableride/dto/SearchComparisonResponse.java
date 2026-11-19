package com.affordableride.dto;

/**
 * Response DTO returned when fetching a saved search comparison record.
 * The frontend uses comparisonJson to reconstruct the full analytics record.
 */
public class SearchComparisonResponse {

    private Long id;
    private Long rideSearchId;
    private String pickupName;
    private String destName;
    private Double distanceKm;
    private Double totalPotentialSavings;
    private Integer validCategoryCount;
    private String comparisonJson;
    private String createdAt; // ISO-8601 string

    public SearchComparisonResponse() {}

    public SearchComparisonResponse(Long id, Long rideSearchId, String pickupName, String destName,
                                    Double distanceKm, Double totalPotentialSavings,
                                    Integer validCategoryCount, String comparisonJson, String createdAt) {
        this.id = id;
        this.rideSearchId = rideSearchId;
        this.pickupName = pickupName;
        this.destName = destName;
        this.distanceKm = distanceKm;
        this.totalPotentialSavings = totalPotentialSavings;
        this.validCategoryCount = validCategoryCount;
        this.comparisonJson = comparisonJson;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

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

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
