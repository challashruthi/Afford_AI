package com.affordableride.provider;

import com.affordableride.dto.RideOptionDTO;
import com.affordableride.service.SurgeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Component
public class OlaProvider implements RideProviderInterface {

    @Autowired
    private SurgeService surgeService;

    @Override
    public String getProviderName() {
        return "Ola";
    }

    @Override
    public List<RideOptionDTO> getRideOptions(Double distanceKm, Integer durationMins) {
        List<RideOptionDTO> options = new ArrayList<>();
        LocalTime now = LocalTime.now();

        // Ola Bike (Capacity 1)
        double surgeBike = surgeService.calculateSurge(now, "Ola", "Bike", distanceKm);
        options.add(calculateOption("Ola", "Bike", 25.0, 7.5, 0.9, 32.0, surgeBike, distanceKm, durationMins, 1));

        // Ola Auto (Capacity 3)
        double surgeAuto = surgeService.calculateSurge(now, "Ola", "Auto", distanceKm);
        options.add(calculateOption("Ola", "Auto", 40.0, 11.0, 1.1, 50.0, surgeAuto, distanceKm, durationMins, 3));

        // Ola Mini (Capacity 4)
        double surgeMini = surgeService.calculateSurge(now, "Ola", "Mini", distanceKm);
        options.add(calculateOption("Ola", "Mini", 60.0, 14.0, 1.4, 85.0, surgeMini, distanceKm, durationMins, 4));

        return options;
    }

    @Override
    public Double getFareEstimate(Double distanceKm, Integer durationMins, String rideType) {
        double surge = surgeService.calculateSurge(LocalTime.now(), "Ola", rideType, distanceKm);
        return switch (rideType.toLowerCase()) {
            case "bike" -> Math.max(32.0, (25.0 + (distanceKm * 7.5) + (durationMins * 0.9)) * surge);
            case "auto" -> Math.max(50.0, (40.0 + (distanceKm * 11.0) + (durationMins * 1.1)) * surge);
            default -> Math.max(85.0, (60.0 + (distanceKm * 14.0) + (durationMins * 1.4)) * surge);
        };
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
