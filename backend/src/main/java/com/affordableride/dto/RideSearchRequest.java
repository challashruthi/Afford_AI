package com.affordableride.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public class RideSearchRequest {

    @NotNull(message = "Pickup location is required")
    @Valid
    private LocationDTO pickup;

    @NotNull(message = "Destination location is required")
    @Valid
    private LocationDTO destination;

    private Double distanceKm;
    private Integer durationMins;
    private Integer numberOfPassengers; // optional: used for capacity filtering

    public RideSearchRequest() {}

    public LocationDTO getPickup() { return pickup; }
    public void setPickup(LocationDTO pickup) { this.pickup = pickup; }

    public LocationDTO getDestination() { return destination; }
    public void setDestination(LocationDTO destination) { this.destination = destination; }

    public Double getDistanceKm() { return distanceKm; }
    public void setDistanceKm(Double distanceKm) { this.distanceKm = distanceKm; }

    public Integer getDurationMins() { return durationMins; }
    public void setDurationMins(Integer durationMins) { this.durationMins = durationMins; }

    public Integer getNumberOfPassengers() { return numberOfPassengers != null ? numberOfPassengers : 1; }
    public void setNumberOfPassengers(Integer numberOfPassengers) { this.numberOfPassengers = numberOfPassengers; }
}
