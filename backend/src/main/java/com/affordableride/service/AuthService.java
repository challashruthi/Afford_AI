package com.affordableride.service;

import com.affordableride.dto.AuthRequest;
import com.affordableride.dto.AuthResponse;
import com.affordableride.dto.RegisterRequest;
import com.affordableride.entity.User;
import com.affordableride.exception.InvalidRequestException;
import com.affordableride.repository.UserRepository;
import com.affordableride.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtTokenProvider tokenProvider;

    public AuthResponse register(RegisterRequest request) {
        String email = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        String fullName = request.getFullName() != null ? request.getFullName().trim() : "";
        String password = request.getPassword();

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new InvalidRequestException("Email address is already in use. Please log in or use a different email.");
        }

        User user = new User(
                fullName,
                email,
                passwordEncoder.encode(password),
                "ROLE_USER"
        );
        user.setOnboardingCompleted(true);

        user = userRepository.save(user);

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, password)
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String token = tokenProvider.generateToken(authentication);

        return new AuthResponse(
                token,
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getOnboardingCompleted(),
                user.getPreferredRideType(),
                user.getTripPriority(),
                user.getWelcomeOfferUsed(),
                user.getWelcomeOfferEligible()
        );
    }

    public AuthResponse login(AuthRequest request) {
        String email = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        String password = request.getPassword();

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, password)
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String token = tokenProvider.generateToken(authentication);

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new InvalidRequestException("User not found with email: " + email));

        return new AuthResponse(
                token,
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getOnboardingCompleted(),
                user.getPreferredRideType(),
                user.getTripPriority(),
                user.getWelcomeOfferUsed(),
                user.getWelcomeOfferEligible()
        );
    }
}
