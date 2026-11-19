package com.affordableride.controller;

import com.affordableride.dto.FareObservationDTO;
import com.affordableride.service.FareObservationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/fare-history")
public class FareHistoryController {

    @Autowired
    private FareObservationService fareObservationService;

    @GetMapping("/{searchId}")
    public ResponseEntity<List<FareObservationDTO>> getFareHistory(@PathVariable Long searchId) {
        List<FareObservationDTO> observations = fareObservationService.getHistoryForSearch(searchId);
        return ResponseEntity.ok(observations);
    }
}
