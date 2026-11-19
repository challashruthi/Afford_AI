package com.affordableride.dto;

import java.util.List;

public class CanonicalRouteResponseDTO {
    private String sourceName;
    private double sourceLatitude;
    private double sourceLongitude;
    private String destinationName;
    private double destinationLatitude;
    private double destinationLongitude;
    private double distanceMeters;
    private double distanceKm; // Full float precision: distanceMeters / 1000.0
    private double durationSeconds;
    private double durationMinutes; // Full float precision: durationSeconds / 60.0
    private List<List<Double>> geometryCoordinates; // Road geometry coordinates [[lng, lat], ...]
    private String routingProvider;

    public CanonicalRouteResponseDTO() {}

    public CanonicalRouteResponseDTO(String sourceName, double sourceLatitude, double sourceLongitude,
                                    String destinationName, double destinationLatitude, double destinationLongitude,
                                    double distanceMeters, double distanceKm, double durationSeconds, double durationMinutes,
                                    List<List<Double>> geometryCoordinates, String routingProvider) {
        this.sourceName = sourceName;
        this.sourceLatitude = sourceLatitude;
        this.sourceLongitude = sourceLongitude;
        this.destinationName = destinationName;
        this.destinationLatitude = destinationLatitude;
        this.destinationLongitude = destinationLongitude;
        this.distanceMeters = distanceMeters;
        this.distanceKm = distanceKm;
        this.durationSeconds = durationSeconds;
        this.durationMinutes = durationMinutes;
        this.geometryCoordinates = geometryCoordinates;
        this.routingProvider = routingProvider;
    }

    public String getSourceName() {
        return sourceName;
    }

    public void setSourceName(String sourceName) {
        this.sourceName = sourceName;
    }

    public double getSourceLatitude() {
        return sourceLatitude;
    }

    public void setSourceLatitude(double sourceLatitude) {
        this.sourceLatitude = sourceLatitude;
    }

    public double getSourceLongitude() {
        return sourceLongitude;
    }

    public void setSourceLongitude(double sourceLongitude) {
        this.sourceLongitude = sourceLongitude;
    }

    public String getDestinationName() {
        return destinationName;
    }

    public void setDestinationName(String destinationName) {
        this.destinationName = destinationName;
    }

    public double getDestinationLatitude() {
        return destinationLatitude;
    }

    public void setDestinationLatitude(double destinationLatitude) {
        this.destinationLatitude = destinationLatitude;
    }

    public double getDestinationLongitude() {
        return destinationLongitude;
    }

    public void setDestinationLongitude(double destinationLongitude) {
        this.destinationLongitude = destinationLongitude;
    }

    public double getDistanceMeters() {
        return distanceMeters;
    }

    public void setDistanceMeters(double distanceMeters) {
        this.distanceMeters = distanceMeters;
    }

    public double getDistanceKm() {
        return distanceKm;
    }

    public void setDistanceKm(double distanceKm) {
        this.distanceKm = distanceKm;
    }

    public double getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(double durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public double getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(double durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public List<List<Double>> getGeometryCoordinates() {
        return geometryCoordinates;
    }

    public void setGeometryCoordinates(List<List<Double>> geometryCoordinates) {
        this.geometryCoordinates = geometryCoordinates;
    }

    public String getRoutingProvider() {
        return routingProvider;
    }

    public void setRoutingProvider(String routingProvider) {
        this.routingProvider = routingProvider;
    }
}
