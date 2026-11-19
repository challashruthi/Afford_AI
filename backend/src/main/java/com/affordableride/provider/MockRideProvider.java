package com.affordableride.provider;

import com.affordableride.dto.RideOptionDTO;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class MockRideProvider implements RideProviderInterface {

    @Override
    public String getProviderName() {
        return "MockRideProvider";
    }

    @Override
    public List<RideOptionDTO> getRideOptions(Double distanceKm, Integer durationMins) {
        List<RideOptionDTO> options = new ArrayList<>();
        // Generates demo options for general providers if live API is absent
        options.add(createOption("Uber", "Bike", 30.0, 8.0, 1.0, 40.0, 1.1, distanceKm, durationMins, 1));
        options.add(createOption("Uber", "Auto", 40.0, 11.0, 1.2, 50.0, 1.1, distanceKm, durationMins, 3));
        options.add(createOption("Uber", "Go", 60.0, 15.0, 1.5, 90.0, 1.1, distanceKm, durationMins, 4));

        options.add(createOption("Ola", "Bike", 25.0, 7.5, 1.0, 35.0, 1.0, distanceKm, durationMins, 1));
        options.add(createOption("Ola", "Auto", 35.0, 10.5, 1.1, 45.0, 1.0, distanceKm, durationMins, 3));
        options.add(createOption("Ola", "Mini", 55.0, 14.0, 1.4, 80.0, 1.0, distanceKm, durationMins, 4));

        options.add(createOption("Rapido", "Bike", 20.0, 7.0, 0.8, 30.0, 1.0, distanceKm, durationMins, 1));
        options.add(createOption("Rapido", "Auto", 32.0, 10.0, 1.0, 40.0, 1.0, distanceKm, durationMins, 3));
        return options;
    }

    @Override
    public Double getFareEstimate(Double distanceKm, Integer durationMins, String rideType) {
        double base = 30.0;
        double perKm = 10.0;
        double perMin = 1.0;
        return Math.max(40.0, base + (distanceKm * perKm) + (durationMins * perMin));
    }

    @Override
    public Boolean getAvailability(String rideType) {
        return true;
    }

    private RideOptionDTO createOption(String provider, String type, double baseFare, double perKm, double perMin, double minFare, double surge, double dist, int dur, int capacity) {
        double rawFare = baseFare + (dist * perKm) + (dur * perMin);
        double finalFare = Math.max(minFare, rawFare) * surge;
        return new RideOptionDTO(provider, type, finalFare, dist, dur, surge, true, capacity);
    }
}
