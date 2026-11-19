package com.affordableride.service;

import com.affordableride.config.CityServiceAreaConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ProviderAvailabilityService {

    @Autowired
    private CityServiceAreaConfig cityServiceAreaConfig;

    /**
     * Determines whether a provider/ride type is applicable for the given pickup location.
     */
    public boolean isProviderAvailable(String providerName, Double pickupLat, Double pickupLng, String pickupName) {
        if (providerName == null) return false;
        String name = providerName.toLowerCase();

        if (name.contains("pink")) {
            double lat = pickupLat != null ? pickupLat : 0.0;
            double lng = pickupLng != null ? pickupLng : 0.0;
            return cityServiceAreaConfig.isLocationInHyderabad(lat, lng, pickupName);
        }

        // Uber, Ola, Rapido supported across India
        return true;
    }
}
