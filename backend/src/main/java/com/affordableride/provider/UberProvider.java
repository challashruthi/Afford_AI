package com.affordableride.provider;

import com.affordableride.dto.RideOptionDTO;
import com.affordableride.service.SurgeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Component
public class UberProvider implements RideProviderInterface {

    @Autowired
    private SurgeService surgeService;

    @Override
    public String getProviderName() {
        return "Uber";
    }

    @Override
    public List<RideOptionDTO> getRideOptions(Double distanceKm, Integer durationMins) {
        List<RideOptionDTO> options = new ArrayList<>();
        LocalTime now = LocalTime.now();

        // Uber Moto (Capacity 1)
        double surgeMoto = surgeService.calculateSurge(now, "Uber", "Moto", distanceKm);
        options.add(calculateOption("Uber", "Moto", 30.0, 8.0, 1.0, 35.0, surgeMoto, distanceKm, durationMins, 1));

        // Uber Auto (Capacity 3)
        double surgeAuto = surgeService.calculateSurge(now, "Uber", "Auto", distanceKm);
        options.add(calculateOption("Uber", "Auto", 45.0, 11.5, 1.2, 55.0, surgeAuto, distanceKm, durationMins, 3));

        // Uber Go (Capacity 4)
        double surgeGo = surgeService.calculateSurge(now, "Uber", "Go", distanceKm);
        options.add(calculateOption("Uber", "Go", 65.0, 15.0, 1.5, 90.0, surgeGo, distanceKm, durationMins, 4));

        return options;
    }

    @Override
    public Double getFareEstimate(Double distanceKm, Integer durationMins, String rideType) {
        double surge = surgeService.calculateSurge(LocalTime.now(), "Uber", rideType, distanceKm);
        return switch (rideType.toLowerCase()) {
            case "moto", "bike" -> Math.max(35.0, (30.0 + (distanceKm * 8.0) + (durationMins * 1.0)) * surge);
            case "auto" -> Math.max(55.0, (45.0 + (distanceKm * 11.5) + (durationMins * 1.2)) * surge);
            default -> Math.max(90.0, (65.0 + (distanceKm * 15.0) + (durationMins * 1.5)) * surge);
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
