package com.affordableride.service;

import com.affordableride.dto.RecommendationDTO;
import com.affordableride.dto.RideOptionDTO;
import com.affordableride.entity.Recommendation;
import com.affordableride.entity.RideSearch;
import com.affordableride.recommendation.WeightedRecommendationEngine;
import com.affordableride.repository.RecommendationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class RecommendationService {

    @Autowired
    private WeightedRecommendationEngine recommendationEngine;

    @Autowired
    private RecommendationRepository recommendationRepository;

    public RecommendationDTO getRecommendation(List<RideOptionDTO> options) {
        return recommendationEngine.evaluateCheapestRide(options, "ALL");
    }

    public RecommendationDTO getRecommendation(List<RideOptionDTO> options, String preferredCategory) {
        return recommendationEngine.evaluateCheapestRide(options, preferredCategory);
    }

    @Transactional
    public void saveRecommendation(RideSearch rideSearch, RecommendationDTO recDTO) {
        if (rideSearch == null || recDTO == null) return;
        
        Recommendation recommendation = new Recommendation();
        recommendation.setSearch(rideSearch);
        recommendation.setRecommendedProvider(recDTO.getProviderName());
        recommendation.setRideType(recDTO.getRideType());
        recommendation.setEstimatedFare(recDTO.getEstimatedFare());
        recommendation.setSavingsAmount(recDTO.getExpectedSavings());
        recommendation.setScore(recDTO.getScore());
        recommendation.setReason(recDTO.getReason());

        recommendationRepository.save(recommendation);
    }
}
