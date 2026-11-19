package com.affordableride.service;

import com.affordableride.dto.RideOptionDTO;
import com.affordableride.provider.ProviderRegistry;
import com.affordableride.provider.RideProviderInterface;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class FareCalculationService {

    @Autowired
    private ProviderRegistry providerRegistry;

    @Autowired
    private MlFarePredictionService mlFarePredictionService;

    public List<RideOptionDTO> calculateAllFares(Double distanceKm, Integer durationMins) {
        return calculateAllFares(distanceKm, durationMins != null ? durationMins.doubleValue() : 0.0, null, null, null);
    }

    public List<RideOptionDTO> calculateAllFares(Double distanceKm, Double durationMins) {
        return calculateAllFares(distanceKm, durationMins, null, null, null);
    }

    public List<RideOptionDTO> calculateAllFares(Double distanceKm, Double durationMins, Double pickupLat, Double pickupLng, String pickupName) {
        List<RideOptionDTO> allOptions = new ArrayList<>();
        List<RideProviderInterface> providers = providerRegistry.getAllProviders();

        int durationMinsInt = (int) Math.round(durationMins != null ? durationMins : 0.0);

        for (RideProviderInterface provider : providers) {
            try {
                List<RideOptionDTO> providerOptions = provider.getRideOptions(distanceKm, durationMinsInt, pickupLat, pickupLng, pickupName);
                if (providerOptions != null && !providerOptions.isEmpty()) {
                    allOptions.addAll(providerOptions);
                }
            } catch (Exception e) {
                System.err.println("Provider error (" + provider.getProviderName() + "): " + e.getMessage());
            }
        }

        // Apply ML Fare Prediction to options using full precision distanceKm & durationMins
        allOptions = mlFarePredictionService.predictFares(allOptions, distanceKm, durationMins);

        // Sort options by predicted fare ascending (cheapest first)
        allOptions.sort(Comparator.comparingDouble(RideOptionDTO::getEstimatedFare));
        return allOptions;
    }
}
