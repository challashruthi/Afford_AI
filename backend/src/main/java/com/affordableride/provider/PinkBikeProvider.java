package com.affordableride.provider;

import com.affordableride.dto.RideOptionDTO;
import com.affordableride.service.ProviderAvailabilityService;
import com.affordableride.service.SurgeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Component
public class PinkBikeProvider implements RideProviderInterface {

    @Autowired
    private SurgeService surgeService;

    @Autowired
    private ProviderAvailabilityService providerAvailabilityService;

    @Override
    public String getProviderName() {
        return "Pink Bike";
    }

    @Override
    public List<RideOptionDTO> getRideOptions(Double distanceKm, Integer durationMins) {
        return getRideOptions(distanceKm, durationMins, 0.0, 0.0, null);
    }

    @Override
    public List<RideOptionDTO> getRideOptions(Double distanceKm, Integer durationMins, Double pickupLat, Double pickupLng, String pickupName) {
        List<RideOptionDTO> options = new ArrayList<>();

        // Pink Bike is ONLY available within Hyderabad Service Area via ProviderAvailabilityService
        if (!providerAvailabilityService.isProviderAvailable("Pink Bike", pickupLat, pickupLng, pickupName)) {
            System.out.println("[PROVIDER AVAILABILITY] Pickup location (" + pickupName + ", lat: " + pickupLat + ", lng: " + pickupLng + ") is OUTSIDE Hyderabad service area. Pink Bike is NOT available.");
            return options;
        }

        System.out.println("[PROVIDER AVAILABILITY] Pickup location (" + pickupName + ", lat: " + pickupLat + ", lng: " + pickupLng + ") is INSIDE Hyderabad service area. Pink Bike is AVAILABLE.");

        LocalTime now = LocalTime.now();
        double surgeBike = surgeService.calculateSurge(now, "Pink Bike", "Women Captain", distanceKm);
        
        // Pink Bike (Capacity 1 - Women Captain Bike Ride)
        options.add(calculateOption("Pink Bike", "Women Captain", 22.0, 7.2, 0.85, 30.0, surgeBike, distanceKm, durationMins, 1));

        return options;
    }

    @Override
    public Double getFareEstimate(Double distanceKm, Integer durationMins, String rideType) {
        double surge = surgeService.calculateSurge(LocalTime.now(), "Pink Bike", rideType, distanceKm);
        return Math.max(30.0, (22.0 + (distanceKm * 7.2) + (durationMins * 0.85)) * surge);
    }

    @Override
    public Boolean getAvailability(String rideType) {
        return true;
    }

    private RideOptionDTO calculateOption(String provider, String type, double baseFare, double perKm, double perMin, double minFare, double surge, double dist, int dur, int capacity) {
        double estimatedFare = baseFare + (dist * perKm) + (dur * perMin);
        double finalFare = Math.max(minFare, Math.round(estimatedFare * surge));
        RideOptionDTO dto = new RideOptionDTO(provider, type, finalFare, dist, dur, surge, true, capacity);
        dto.setPricingNote("Estimated Fare – Demo Mode");
        return dto;
    }
}
