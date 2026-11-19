package com.affordableride.dto;

import java.util.List;
import java.util.Map;

public class RideSearchResponse {
    private Long searchId;
    private LocationDTO pickup;
    private LocationDTO destination;
    private Double distanceKm;
    private Integer durationMins;
    private List<RideOptionDTO> options;
    private RecommendationDTO recommendation;
    private Map<String, Object> demandInfo;

    public RideSearchResponse() {}

    public RideSearchResponse(Long searchId, LocationDTO pickup, LocationDTO destination, Double distanceKm, Integer durationMins, List<RideOptionDTO> options, RecommendationDTO recommendation, Map<String, Object> demandInfo) {
        this(searchId, pickup, destination, distanceKm, durationMins != null ? durationMins.doubleValue() : null, options, recommendation, demandInfo);
    }

    public RideSearchResponse(Long searchId, LocationDTO pickup, LocationDTO destination, Double distanceKm, Double durationMins, List<RideOptionDTO> options, RecommendationDTO recommendation, Map<String, Object> demandInfo) {
        this.searchId = searchId;
        this.pickup = pickup;
        this.destination = destination;
        this.distanceKm = distanceKm != null ? Math.round(distanceKm * 100.0) / 100.0 : null;
        this.durationMins = durationMins != null ? (int) Math.round(durationMins) : null;
        this.options = options;
        this.recommendation = recommendation;
        this.demandInfo = demandInfo;
    }

    public Long getSearchId() { return searchId; }
    public void setSearchId(Long searchId) { this.searchId = searchId; }

    public LocationDTO getPickup() { return pickup; }
    public void setPickup(LocationDTO pickup) { this.pickup = pickup; }

    public LocationDTO getDestination() { return destination; }
    public void setDestination(LocationDTO destination) { this.destination = destination; }

    public Double getDistanceKm() { return distanceKm; }
    public void setDistanceKm(Double distanceKm) { this.distanceKm = distanceKm; }

    public Integer getDurationMins() { return durationMins; }
    public void setDurationMins(Integer durationMins) { this.durationMins = durationMins; }

    public List<RideOptionDTO> getOptions() { return options; }
    public void setOptions(List<RideOptionDTO> options) { this.options = options; }

    public RecommendationDTO getRecommendation() { return recommendation; }
    public void setRecommendation(RecommendationDTO recommendation) { this.recommendation = recommendation; }

    public Map<String, Object> getDemandInfo() { return demandInfo; }
    public void setDemandInfo(Map<String, Object> demandInfo) { this.demandInfo = demandInfo; }
}
