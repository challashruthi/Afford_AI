package com.affordableride.dto;

public class RecommendationDTO {
    private String providerName;
    private String rideType;
    private Double estimatedFare;
    private Double score;
    private Double expectedSavings;
    private String reason;

    public RecommendationDTO() {}

    public RecommendationDTO(String providerName, String rideType, Double estimatedFare, Double score, Double expectedSavings, String reason) {
        this.providerName = providerName;
        this.rideType = rideType;
        this.estimatedFare = Math.round(estimatedFare * 100.0) / 100.0;
        this.score = Math.round(score * 100.0) / 100.0;
        this.expectedSavings = Math.round(expectedSavings * 100.0) / 100.0;
        this.reason = reason;
    }

    public String getProviderName() { return providerName; }
    public void setProviderName(String providerName) { this.providerName = providerName; }

    public String getRideType() { return rideType; }
    public void setRideType(String rideType) { this.rideType = rideType; }

    public Double getEstimatedFare() { return estimatedFare; }
    public void setEstimatedFare(Double estimatedFare) { this.estimatedFare = estimatedFare; }

    public Double getScore() { return score; }
    public void setScore(Double score) { this.score = score; }

    public Double getExpectedSavings() { return expectedSavings; }
    public void setExpectedSavings(Double expectedSavings) { this.expectedSavings = expectedSavings; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
