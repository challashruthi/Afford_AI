package com.affordableride.provider;

import com.affordableride.dto.RideOptionDTO;
import java.util.List;

public interface RideProviderInterface {
    String getProviderName();
    List<RideOptionDTO> getRideOptions(Double distanceKm, Integer durationMins);
    default List<RideOptionDTO> getRideOptions(Double distanceKm, Integer durationMins, Double pickupLat, Double pickupLng, String pickupName) {
        return getRideOptions(distanceKm, durationMins);
    }
    Double getFareEstimate(Double distanceKm, Integer durationMins, String rideType);
    Boolean getAvailability(String rideType);
}
