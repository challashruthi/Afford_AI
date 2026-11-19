package com.affordableride.controller;

import com.affordableride.dto.RecommendationDTO;
import com.affordableride.dto.RideOptionDTO;
import com.affordableride.service.RecommendationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recommendations")
public class RecommendationController {

    @Autowired
    private RecommendationService recommendationService;

    @PostMapping
    public ResponseEntity<RecommendationDTO> getRecommendation(@RequestBody List<RideOptionDTO> options) {
        RecommendationDTO recommendation = recommendationService.getRecommendation(options);
        return ResponseEntity.ok(recommendation);
    }
}
