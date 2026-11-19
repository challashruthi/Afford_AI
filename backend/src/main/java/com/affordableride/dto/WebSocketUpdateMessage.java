package com.affordableride.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class WebSocketUpdateMessage {
    private String updateType;
    private String message;
    private String timestamp;
    private Long searchId;
    private List<RideOptionDTO> updatedOptions;
    private RecommendationDTO recommendation;
    private Map<String, Object> demandInfo;
    private Double distanceKm;
    private Integer durationMins;

    private List<FareObservationDTO> observations;

    public WebSocketUpdateMessage() {
        this.timestamp = LocalDateTime.now().toString();
    }

    public WebSocketUpdateMessage(String updateType, String message, List<RideOptionDTO> updatedOptions) {
        this.updateType = updateType;
        this.message = message;
        this.updatedOptions = updatedOptions;
        this.timestamp = LocalDateTime.now().toString();
    }

    public WebSocketUpdateMessage(String updateType, String message, Long searchId,
                                   List<RideOptionDTO> updatedOptions, RecommendationDTO recommendation,
                                   Map<String, Object> demandInfo, Double distanceKm, Integer durationMins,
                                   List<FareObservationDTO> observations) {
        this.updateType = updateType;
        this.message = message;
        this.searchId = searchId;
        this.updatedOptions = updatedOptions;
        this.recommendation = recommendation;
        this.demandInfo = demandInfo;
        this.distanceKm = distanceKm;
        this.durationMins = durationMins;
        this.observations = observations;
        this.timestamp = LocalDateTime.now().toString();
    }

    public String getUpdateType() { return updateType; }
    public void setUpdateType(String updateType) { this.updateType = updateType; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    public Long getSearchId() { return searchId; }
    public void setSearchId(Long searchId) { this.searchId = searchId; }

    public List<RideOptionDTO> getUpdatedOptions() { return updatedOptions; }
    public void setUpdatedOptions(List<RideOptionDTO> updatedOptions) { this.updatedOptions = updatedOptions; }

    public RecommendationDTO getRecommendation() { return recommendation; }
    public void setRecommendation(RecommendationDTO recommendation) { this.recommendation = recommendation; }

    public Map<String, Object> getDemandInfo() { return demandInfo; }
    public void setDemandInfo(Map<String, Object> demandInfo) { this.demandInfo = demandInfo; }

    public Double getDistanceKm() { return distanceKm; }
    public void setDistanceKm(Double distanceKm) { this.distanceKm = distanceKm; }

    public Integer getDurationMins() { return durationMins; }
    public void setDurationMins(Integer durationMins) { this.durationMins = durationMins; }

    public List<FareObservationDTO> getObservations() { return observations; }
    public void setObservations(List<FareObservationDTO> observations) { this.observations = observations; }
}
