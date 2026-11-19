package com.affordableride.provider;

import com.affordableride.dto.RideOptionDTO;
import com.affordableride.service.SurgeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Component
public class RapidoProvider implements RideProviderInterface {

    @Autowired
    private SurgeService surgeService;

    @Override
    public String getProviderName() {
        return "Rapido";
    }

    @Override
    public List<RideOptionDTO> getRideOptions(Double distanceKm, Integer durationMins) {
        List<RideOptionDTO> options = new ArrayList<>();
        LocalTime now = LocalTime.now();

        // Rapido Bike (Capacity 1)
        double surgeBike = surgeService.calculateSurge(now, "Rapido", "Bike", distanceKm);
        options.add(calculateOption("Rapido", "Bike", 20.0, 7.0, 0.8, 28.0, surgeBike, distanceKm, durationMins, 1));

        // Rapido Auto (Capacity 3)
        double surgeAuto = surgeService.calculateSurge(now, "Rapido", "Auto", distanceKm);
        options.add(calculateOption("Rapido", "Auto", 35.0, 10.0, 1.0, 45.0, surgeAuto, distanceKm, durationMins, 3));

        // Rapido Cab Economy (Capacity 4)
        double surgeCab = surgeService.calculateSurge(now, "Rapido", "Cab Economy", distanceKm);
        options.add(calculateOption("Rapido", "Cab Economy", 50.0, 13.0, 1.3, 75.0, surgeCab, distanceKm, durationMins, 4));

        return options;
    }

    @Override
    public Double getFareEstimate(Double distanceKm, Integer durationMins, String rideType) {
        double surge = surgeService.calculateSurge(LocalTime.now(), "Rapido", rideType, distanceKm);
        return switch (rideType.toLowerCase()) {
            case "bike" -> Math.max(28.0, (20.0 + (distanceKm * 7.0) + (durationMins * 0.8)) * surge);
            case "auto" -> Math.max(45.0, (35.0 + (distanceKm * 10.0) + (durationMins * 1.0)) * surge);
            default -> Math.max(75.0, (50.0 + (distanceKm * 13.0) + (durationMins * 1.3)) * surge);
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
