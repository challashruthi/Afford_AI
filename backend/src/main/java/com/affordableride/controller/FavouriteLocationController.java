package com.affordableride.controller;

import com.affordableride.dto.FavouriteLocationDTO;
import com.affordableride.entity.FavouriteLocation;
import com.affordableride.entity.User;
import com.affordableride.repository.FavouriteLocationRepository;
import com.affordableride.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/user/favourites")
public class FavouriteLocationController {

    @Autowired
    private FavouriteLocationRepository favouriteLocationRepository;

    @Autowired
    private UserRepository userRepository;

    private User getAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return null;
        }
        String email = auth.getName();
        return userRepository.findByEmailIgnoreCase(email).orElse(null);
    }

    private FavouriteLocationDTO toDTO(FavouriteLocation fav) {
        return new FavouriteLocationDTO(
                fav.getId(),
                fav.getName(),
                fav.getAddress(),
                fav.getLatitude(),
                fav.getLongitude(),
                fav.getCreatedAt(),
                fav.getUpdatedAt()
        );
    }

    @GetMapping
    public ResponseEntity<?> getFavourites() {
        User user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "User is not authenticated."));
        }

        List<FavouriteLocationDTO> list = favouriteLocationRepository
                .findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<?> addFavourite(@RequestBody FavouriteLocationDTO dto) {
        User user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "User is not authenticated."));
        }

        if (dto.getName() == null || dto.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Location name (e.g. Home, Office, College) is required."));
        }
        if (dto.getAddress() == null || dto.getAddress().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Address is required."));
        }
        if (dto.getLatitude() == null || dto.getLongitude() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Latitude and Longitude are required."));
        }

        FavouriteLocation fav = new FavouriteLocation(
                user,
                dto.getName().trim(),
                dto.getAddress().trim(),
                dto.getLatitude(),
                dto.getLongitude()
        );

        FavouriteLocation saved = favouriteLocationRepository.save(fav);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateFavourite(@PathVariable Long id, @RequestBody FavouriteLocationDTO dto) {
        User user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "User is not authenticated."));
        }

        FavouriteLocation fav = favouriteLocationRepository.findByIdAndUserId(id, user.getId()).orElse(null);
        if (fav == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Favourite location not found."));
        }

        if (dto.getName() != null && !dto.getName().trim().isEmpty()) {
            fav.setName(dto.getName().trim());
        }
        if (dto.getAddress() != null && !dto.getAddress().trim().isEmpty()) {
            fav.setAddress(dto.getAddress().trim());
        }
        if (dto.getLatitude() != null) {
            fav.setLatitude(dto.getLatitude());
        }
        if (dto.getLongitude() != null) {
            fav.setLongitude(dto.getLongitude());
        }

        FavouriteLocation updated = favouriteLocationRepository.save(fav);
        return ResponseEntity.ok(toDTO(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteFavourite(@PathVariable Long id) {
        User user = getAuthenticatedUser();
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "User is not authenticated."));
        }

        FavouriteLocation fav = favouriteLocationRepository.findByIdAndUserId(id, user.getId()).orElse(null);
        if (fav == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Favourite location not found."));
        }

        favouriteLocationRepository.delete(fav);
        return ResponseEntity.ok(Map.of("message", "Favourite location deleted successfully.", "id", id));
    }
}
