package com.affordableride.dto;

/**
 * Request DTO sent by the frontend when a user clicks "Compare Rides & Find Cheapest".
 * Contains the full JSON record produced by fareHistoryStore.saveSearchComparison.
 */
public class SearchComparisonRequest {

    private Long rideSearchId;
    private String pickupName;
    private String destName;
    private Double distanceKm;
    private Double totalPotentialSavings;
    private Integer validCategoryCount;
    /** Full JSON string of the comparison record (categorySavings, options, winningProviders, etc.) */
    private String comparisonJson;

    public SearchComparisonRequest() {}

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
}
