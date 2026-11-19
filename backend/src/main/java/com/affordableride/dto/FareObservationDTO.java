package com.affordableride.dto;

public class FareObservationDTO {
    private Long id;
    private Long searchId;
    private String provider;
    private String rideType;
    private Double predictedFare;
    private Double distanceKm;
    private Double durationMinutes;
    private Double surgeMultiplier;
    private String predictionMode;
    private Long timestamp;

    public FareObservationDTO() {}

    public FareObservationDTO(Long id, Long searchId, String provider, String rideType,
                              Double predictedFare, Double distanceKm, Double durationMinutes,
                              Double surgeMultiplier, String predictionMode, Long timestamp) {
        this.id = id;
        this.searchId = searchId;
        this.provider = provider;
        this.rideType = rideType;
        this.predictedFare = predictedFare;
        this.distanceKm = distanceKm;
        this.durationMinutes = durationMinutes;
        this.surgeMultiplier = surgeMultiplier;
        this.predictionMode = predictionMode;
        this.timestamp = timestamp;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getSearchId() { return searchId; }
    public void setSearchId(Long searchId) { this.searchId = searchId; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public String getRideType() { return rideType; }
    public void setRideType(String rideType) { this.rideType = rideType; }

    public Double getPredictedFare() { return predictedFare; }
    public void setPredictedFare(Double predictedFare) { this.predictedFare = predictedFare; }

    public Double getDistanceKm() { return distanceKm; }
    public void setDistanceKm(Double distanceKm) { this.distanceKm = distanceKm; }

    public Double getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Double durationMinutes) { this.durationMinutes = durationMinutes; }

    public Double getSurgeMultiplier() { return surgeMultiplier; }
    public void setSurgeMultiplier(Double surgeMultiplier) { this.surgeMultiplier = surgeMultiplier; }

    public String getPredictionMode() { return predictionMode; }
    public void setPredictionMode(String predictionMode) { this.predictionMode = predictionMode; }

    public Long getTimestamp() { return timestamp; }
    public void setTimestamp(Long timestamp) { this.timestamp = timestamp; }
}
