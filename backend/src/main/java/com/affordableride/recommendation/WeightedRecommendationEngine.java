package com.affordableride.recommendation;

import com.affordableride.dto.RecommendationDTO;
import com.affordableride.dto.RideOptionDTO;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class WeightedRecommendationEngine {

    public RecommendationDTO evaluateCheapestRide(List<RideOptionDTO> options) {
        return evaluateCheapestRide(options, "ALL");
    }

    public RecommendationDTO evaluateCheapestRide(List<RideOptionDTO> options, String preferredCategory) {
        if (options == null || options.isEmpty()) {
            return new RecommendationDTO("N/A", "N/A", 0.0, 0.0, 0.0, "No ride options available for recommendation.");
        }

        double weightFare = 0.65;
        double weightTime = 0.15;
        double weightSurge = 0.10;
        double weightAvail = 0.10;

        double minFare = options.stream().mapToDouble(RideOptionDTO::getEstimatedFare).min().orElse(1.0);
        double maxFare = options.stream().mapToDouble(RideOptionDTO::getEstimatedFare).max().orElse(100.0);
        double avgFare = options.stream().mapToDouble(RideOptionDTO::getEstimatedFare).average().orElse(minFare);
        double maxTime = options.stream().mapToDouble(RideOptionDTO::getDurationMins).max().orElse(30.0);

        RideOptionDTO bestOption = null;
        double bestScore = -1.0;

        for (RideOptionDTO opt : options) {
            double fareRange = (maxFare - minFare) > 0 ? (maxFare - minFare) : 1.0;
            double fareScore = 1.0 - ((opt.getEstimatedFare() - minFare) / fareRange);
            double timeScore = maxTime > 0 ? (1.0 - (opt.getDurationMins() / (maxTime * 1.5))) : 1.0;
            double surgeScore = Math.max(0.0, 1.0 - ((opt.getSurgeFactor() - 1.0) * 0.5));
            double availScore = Boolean.TRUE.equals(opt.getAvailable()) ? 1.0 : 0.0;

            double compositeScore = ((weightFare * fareScore) +
                                    (weightTime * timeScore) +
                                    (weightSurge * surgeScore) +
                                    (weightAvail * availScore)) * 100.0;

            // Optional category filtering boost
            if (preferredCategory != null && !"ALL".equalsIgnoreCase(preferredCategory)) {
                String type = opt.getRideType().toLowerCase();
                String pref = preferredCategory.toLowerCase();
                if ((pref.contains("bike") && (type.contains("bike") || type.contains("moto"))) ||
                    (pref.contains("auto") && type.contains("auto")) ||
                    (pref.contains("cab") && !type.contains("bike") && !type.contains("moto") && !type.contains("auto"))) {
                    compositeScore += 15.0;
                }
            }

            if (compositeScore > bestScore) {
                bestScore = compositeScore;
                bestOption = opt;
            }
        }

        // Sort available options by predicted fare ascending
        List<RideOptionDTO> sortedOptions = options.stream()
                .filter(opt -> Boolean.TRUE.equals(opt.getAvailable()))
                .sorted((a, b) -> Double.compare(a.getEstimatedFare(), b.getEstimatedFare()))
                .toList();

        if (sortedOptions.isEmpty()) {
            sortedOptions = options.stream()
                    .sorted((a, b) -> Double.compare(a.getEstimatedFare(), b.getEstimatedFare()))
                    .toList();
        }

        bestOption = sortedOptions.get(0);
        double secondLowestFare = sortedOptions.size() > 1 ? sortedOptions.get(1).getEstimatedFare() : bestOption.getEstimatedFare();
        double savings = Math.max(0.0, secondLowestFare - bestOption.getEstimatedFare());

        String reason;
        if (bestOption.getPlatformDiscount() != null && bestOption.getPlatformDiscount() > 0) {
            reason = String.format("%s has the lowest estimated cost (₹%.0f with 10%% platform welcome discount applied) among compared rides.",
                    bestOption.getProviderName() + " " + bestOption.getRideType(), bestOption.getEstimatedFare());
        } else {
            reason = String.format("%s has the lowest predicted fare (₹%.0f) among the available compared rides.",
                    bestOption.getProviderName() + " " + bestOption.getRideType(), bestOption.getEstimatedFare());
        }

        return new RecommendationDTO(
                bestOption.getProviderName(),
                bestOption.getRideType(),
                bestOption.getEstimatedFare(),
                100.0,
                savings,
                reason
        );
    }
}
