package com.affordableride.service;

import com.affordableride.dto.*;
import com.affordableride.entity.RideSearch;
import com.affordableride.entity.User;
import com.affordableride.exception.ResourceNotFoundException;
import com.affordableride.repository.RideSearchRepository;
import com.affordableride.repository.UserRepository;
import com.affordableride.websocket.RideUpdatePublisher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class RideService {

    @Autowired
    private RouteCalculationService routeCalculationService;

    @Autowired
    private FareCalculationService fareCalculationService;

    @Autowired
    private RecommendationService recommendationService;

    @Autowired
    private SurgeService surgeService;

    @Autowired
    private RideSearchRepository rideSearchRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RideUpdatePublisher rideUpdatePublisher;

    @Autowired
    private FareObservationService fareObservationService;

    @Transactional
    public RideSearchResponse processRideSearch(RideSearchRequest request) {
        LocationDTO pickup = request.getPickup();
        LocationDTO destination = request.getDestination();

        // 1. Geocode if coordinates are missing or zero
        if ((pickup.getLatitude() == 0.0 && pickup.getLongitude() == 0.0) && pickup.getName() != null) {
            double[] coords = routeCalculationService.geocodeLocation(pickup.getName());
            if (coords != null) {
                pickup.setLatitude(coords[0]);
                pickup.setLongitude(coords[1]);
            }
        }

        if ((destination.getLatitude() == 0.0 && destination.getLongitude() == 0.0) && destination.getName() != null) {
            double[] coords = routeCalculationService.geocodeLocation(destination.getName());
            if (coords != null) {
                destination.setLatitude(coords[0]);
                destination.setLongitude(coords[1]);
            }
        }

        // 2. Single Source of Truth for Route Distance & Duration via OSRM / RouteCalculationService
        CanonicalRouteResponseDTO canonicalRoute = routeCalculationService.calculateCanonicalRoute(
                pickup.getName(), pickup.getLatitude(), pickup.getLongitude(),
                destination.getName(), destination.getLatitude(), destination.getLongitude()
        );

        double distanceKm = canonicalRoute.getDistanceKm();
        double durationMins = canonicalRoute.getDurationMinutes();
        int durationMinsInt = (int) Math.round(durationMins);

        // 3. Calculate provider fares dynamically from ML prediction model using full precision inputs
        List<RideOptionDTO> options = fareCalculationService.calculateAllFares(
                distanceKm, durationMins, pickup.getLatitude(), pickup.getLongitude(), pickup.getName()
        );

        // 4. Retrieve user preferred category and number of passengers if authenticated
        String preferredCategory = "ALL";
        int passengers = request.getNumberOfPassengers();
        User user = null;

        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                String email = auth.getName();
                user = userRepository.findByEmail(email).orElse(null);
                if (user != null) {
                    preferredCategory = user.getPreferredRideType();
                    // Use user's stored passenger preference if not explicitly overridden in request
                    if (request.getNumberOfPassengers() == 1) {
                        passengers = user.getNumberOfPassengers();
                    }
                }
            }
        } catch (Exception ignored) {}

        // 5. Filter by passenger capacity (only if a ride type has a capacity constraint)
        final int finalPassengers = passengers;
        List<RideOptionDTO> filteredOptions = options.stream()
                .filter(opt -> {
                    int cap = getCapacity(opt.getRideType(), opt.getCapacity());
                    return cap >= finalPassengers;
                })
                .collect(Collectors.toList());

        // If filtering removed all options (e.g., 5+ passengers with only bikes), fall back
        if (filteredOptions.isEmpty()) {
            filteredOptions = options;
        }

        // Determine Welcome Offer eligibility (Backend validated & persisted)
        // Rule 1: Genuinely new user is eligible after registration and login
        // Rule 4 & 5: Permanently mark as used once used, subsequent rides never receive it
        // Rule 6: Existing users who already used it never receive it again
        // Rule 9: Prevent duplicate discount application if refreshing or recalculating same fare
        // Rule 10: If no eligible ride estimate exists, do not mark offer as used
        boolean isEligibleForWelcomeOffer = false;
        boolean isFirstEligibleSearch = false;
        if (user != null) {
            boolean alreadyUsed = Boolean.TRUE.equals(user.getWelcomeOfferUsed());
            boolean eligible = Boolean.TRUE.equals(user.getWelcomeOfferEligible());
            Long previousOfferSearchId = user.getWelcomeOfferSearchId();

            if (!alreadyUsed && eligible) {
                if (previousOfferSearchId == null) {
                    isEligibleForWelcomeOffer = true;
                    isFirstEligibleSearch = true;
                } else {
                    RideSearch prevSearch = rideSearchRepository.findById(previousOfferSearchId).orElse(null);
                    boolean isSameRoute = prevSearch != null &&
                            prevSearch.getPickupName() != null && prevSearch.getPickupName().equalsIgnoreCase(pickup.getName()) &&
                            prevSearch.getDestName() != null && prevSearch.getDestName().equalsIgnoreCase(destination.getName());

                    if (isSameRoute) {
                        isEligibleForWelcomeOffer = true;
                    } else {
                        // User searched a DIFFERENT subsequent ride: mark offer permanently used
                        user.setWelcomeOfferUsed(true);
                        user.setWelcomeOfferEligible(false);
                        user.setWelcomeOfferUsedAt(java.time.LocalDateTime.now());
                        userRepository.save(user);
                        isEligibleForWelcomeOffer = false;
                    }
                }
            }
        }

        boolean hasEligibleRide = filteredOptions.stream().anyMatch(opt ->
                Boolean.TRUE.equals(opt.getAvailable()) && opt.getEstimatedFare() != null && opt.getEstimatedFare() > 0
        );

        if (isEligibleForWelcomeOffer && hasEligibleRide) {
            for (RideOptionDTO opt : filteredOptions) {
                double raw = opt.getEstimatedFare() != null ? opt.getEstimatedFare() : 0.0;
                if (Boolean.TRUE.equals(opt.getAvailable()) && raw > 0) {
                    double discount = Math.round(raw * 0.10); // 10% Platform Welcome Offer
                    double finalCost = Math.max(0.0, raw - discount);
                    opt.setOriginalEstimatedFare(raw);
                    opt.setPlatformDiscount(discount);
                    opt.setFinalEstimatedCost(finalCost);
                    opt.setEstimatedFare(finalCost);
                    opt.setComparableFare(finalCost);
                    opt.setHasWelcomeOffer(true);
                    opt.setOfferTitle("Platform Welcome Offer (10% off)");
                } else {
                    opt.setOriginalEstimatedFare(raw);
                    opt.setPlatformDiscount(0.0);
                    opt.setFinalEstimatedCost(raw);
                    opt.setComparableFare(raw);
                    opt.setHasWelcomeOffer(false);
                }
            }
        } else {
            for (RideOptionDTO opt : filteredOptions) {
                double raw = opt.getEstimatedFare() != null ? opt.getEstimatedFare() : 0.0;
                opt.setOriginalEstimatedFare(raw);
                opt.setPlatformDiscount(0.0);
                opt.setFinalEstimatedCost(raw);
                opt.setComparableFare(raw);
                opt.setHasWelcomeOffer(false);
            }
        }

        // 6. Generate AI recommendation based on comparable estimated fares (cheapest first)
        RecommendationDTO recommendation = recommendationService.getRecommendation(filteredOptions, preferredCategory);

        // 7. Get demand summary based on current system time
        Map<String, Object> demandInfo = surgeService.getDemandSummary(LocalTime.now());

        // 8. Persist search record to MySQL
        RideSearch search = new RideSearch();
        search.setPickupName(pickup.getName());
        search.setPickupLat(pickup.getLatitude());
        search.setPickupLng(pickup.getLongitude());
        search.setDestName(destination.getName());
        search.setDestLat(destination.getLatitude());
        search.setDestLng(destination.getLongitude());
        search.setDistanceKm(distanceKm);
        search.setDurationMins(durationMinsInt);
        search.setUser(user);

        search = rideSearchRepository.save(search);
        recommendationService.saveRecommendation(search, recommendation);

        if (isFirstEligibleSearch && hasEligibleRide && user != null) {
            user.setWelcomeOfferSearchId(search.getId());
            userRepository.save(user);
        }

        // Record initial fare observations for this searchId
        fareObservationService.recordObservations(search.getId(), options, distanceKm, durationMins);

        // Register this search with the WebSocket publisher for route-specific live updates
        rideUpdatePublisher.registerSearch(search.getId(), distanceKm, durationMins, preferredCategory, pickup.getLatitude(), pickup.getLongitude(), pickup.getName());

        return new RideSearchResponse(
                search.getId(),
                pickup,
                destination,
                distanceKm,
                durationMinsInt,
                filteredOptions,
                recommendation,
                demandInfo
        );
    }

    /**
     * Returns the capacity of a ride type.
     * Bike/Moto = 1, Auto = 3, Cab/Mini/Go = 4
     */
    private int getCapacity(String rideType, Integer capacityProp) {
        if (capacityProp != null && capacityProp > 0) return capacityProp;
        if (rideType == null) return 4;
        String t = rideType.toLowerCase();
        if (t.contains("bike") || t.contains("moto")) return 1;
        if (t.contains("auto")) return 3;
        return 4;
    }

    public RideSearchResponse getSearchById(Long searchId) {
        RideSearch search = rideSearchRepository.findById(searchId)
                .orElseThrow(() -> new ResourceNotFoundException("Ride search not found with ID: " + searchId));

        LocationDTO pickup = new LocationDTO(search.getPickupName(), search.getPickupLat(), search.getPickupLng());
        LocationDTO destination = new LocationDTO(search.getDestName(), search.getDestLat(), search.getDestLng());

        List<RideOptionDTO> options = fareCalculationService.calculateAllFares(
                search.getDistanceKm(), (double) search.getDurationMins(), search.getPickupLat(), search.getPickupLng(), search.getPickupName()
        );

        boolean isWelcomeOfferSearch = search.getUser() != null &&
                search.getId().equals(search.getUser().getWelcomeOfferSearchId());

        if (isWelcomeOfferSearch) {
            for (RideOptionDTO opt : options) {
                double raw = opt.getEstimatedFare() != null ? opt.getEstimatedFare() : 0.0;
                if (Boolean.TRUE.equals(opt.getAvailable()) && raw > 0) {
                    double discount = Math.round(raw * 0.10);
                    double finalCost = Math.max(0.0, raw - discount);
                    opt.setOriginalEstimatedFare(raw);
                    opt.setPlatformDiscount(discount);
                    opt.setFinalEstimatedCost(finalCost);
                    opt.setEstimatedFare(finalCost);
                    opt.setComparableFare(finalCost);
                    opt.setHasWelcomeOffer(true);
                    opt.setOfferTitle("Platform Welcome Offer (10% off)");
                } else {
                    opt.setOriginalEstimatedFare(raw);
                    opt.setPlatformDiscount(0.0);
                    opt.setFinalEstimatedCost(raw);
                    opt.setComparableFare(raw);
                    opt.setHasWelcomeOffer(false);
                }
            }
        } else {
            for (RideOptionDTO opt : options) {
                double raw = opt.getEstimatedFare() != null ? opt.getEstimatedFare() : 0.0;
                opt.setOriginalEstimatedFare(raw);
                opt.setPlatformDiscount(0.0);
                opt.setFinalEstimatedCost(raw);
                opt.setComparableFare(raw);
                opt.setHasWelcomeOffer(false);
            }
        }
        
        String preferredCategory = "ALL";
        if (search.getUser() != null) {
            preferredCategory = search.getUser().getPreferredRideType();
        }

        RecommendationDTO recommendation = recommendationService.getRecommendation(options, preferredCategory);
        Map<String, Object> demandInfo = surgeService.getDemandSummary(LocalTime.now());

        return new RideSearchResponse(
                search.getId(),
                pickup,
                destination,
                search.getDistanceKm(),
                search.getDurationMins(),
                options,
                recommendation,
                demandInfo
        );
    }
}
