package com.affordableride.dto;

public class RideOptionDTO {
    private String providerName;
    private String rideType;
    private Double estimatedFare;
    private Double distanceKm;
    private Integer durationMins;
    private Double surgeFactor;
    private Boolean available;
    private Integer capacity;
    private String pricingNote = "Estimated Fare – Demo Mode";
    private Double originalEstimatedFare;
    private Double platformDiscount = 0.0;
    private Double finalEstimatedCost;
    private Boolean hasWelcomeOffer = false;
    private String offerTitle;
    private Double comparableFare;

    public RideOptionDTO() {}

    public RideOptionDTO(String providerName, String rideType, Double estimatedFare, Double distanceKm, Integer durationMins, Double surgeFactor, Boolean available, Integer capacity) {
        this.providerName = providerName;
        this.rideType = rideType;
        this.estimatedFare = Math.round(estimatedFare * 100.0) / 100.0;
        this.originalEstimatedFare = this.estimatedFare;
        this.finalEstimatedCost = this.estimatedFare;
        this.comparableFare = this.estimatedFare;
        this.distanceKm = Math.round(distanceKm * 10.0) / 10.0;
        this.durationMins = durationMins;
        this.surgeFactor = Math.round(surgeFactor * 10.0) / 10.0;
        this.available = available;
        this.capacity = capacity;
    }

    public String getProviderName() { return providerName; }
    public void setProviderName(String providerName) { this.providerName = providerName; }

    public String getRideType() { return rideType; }
    public void setRideType(String rideType) { this.rideType = rideType; }

    public Double getEstimatedFare() { return estimatedFare; }
    public Double getFare() { return estimatedFare; }
    public void setEstimatedFare(Double estimatedFare) { this.estimatedFare = estimatedFare; }

    public Double getDistanceKm() { return distanceKm; }
    public void setDistanceKm(Double distanceKm) { this.distanceKm = distanceKm; }

    public Integer getDurationMins() { return durationMins; }
    public void setDurationMins(Integer durationMins) { this.durationMins = durationMins; }

    public Double getSurgeFactor() { return surgeFactor; }
    public Double getSurgeMultiplier() { return surgeFactor; }
    public void setSurgeFactor(Double surgeFactor) { this.surgeFactor = surgeFactor; }

    public Boolean getAvailable() { return available; }
    public void setAvailable(Boolean available) { this.available = available; }

    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }

    public String getPricingNote() { return pricingNote; }
    public String getPredictionMode() { return pricingNote != null ? pricingNote : "ML_PREDICTED"; }
    public void setPricingNote(String pricingNote) { this.pricingNote = pricingNote; }

    public Double getOriginalEstimatedFare() { return originalEstimatedFare != null ? originalEstimatedFare : estimatedFare; }
    public void setOriginalEstimatedFare(Double originalEstimatedFare) { this.originalEstimatedFare = originalEstimatedFare; }

    public Double getPlatformDiscount() { return platformDiscount != null ? platformDiscount : 0.0; }
    public void setPlatformDiscount(Double platformDiscount) { this.platformDiscount = platformDiscount; }

    public Double getFinalEstimatedCost() { return finalEstimatedCost != null ? finalEstimatedCost : estimatedFare; }
    public void setFinalEstimatedCost(Double finalEstimatedCost) { this.finalEstimatedCost = finalEstimatedCost; }

    public Boolean getHasWelcomeOffer() { return hasWelcomeOffer != null ? hasWelcomeOffer : false; }
    public void setHasWelcomeOffer(Boolean hasWelcomeOffer) { this.hasWelcomeOffer = hasWelcomeOffer; }

    public String getOfferTitle() { return offerTitle; }
    public void setOfferTitle(String offerTitle) { this.offerTitle = offerTitle; }

    public Double getComparableFare() { return comparableFare != null ? comparableFare : (finalEstimatedCost != null ? finalEstimatedCost : estimatedFare); }
    public void setComparableFare(Double comparableFare) { this.comparableFare = comparableFare; }
}
