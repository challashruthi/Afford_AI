package com.affordableride.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "ride_options")
public class RideOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "provider_id", nullable = false)
    private RideProvider provider;

    @Column(name = "ride_type", nullable = false)
    private String rideType; // Bike, Auto, Economy, Sedan, SUV

    @Column(name = "capacity", nullable = false)
    private Integer capacity;

    @Column(name = "base_fare_multiplier", nullable = false)
    private Double baseFareMultiplier = 1.0;

    @Column(name = "per_km_multiplier", nullable = false)
    private Double perKmMultiplier = 1.0;

    public RideOption() {}

    public RideOption(RideProvider provider, String rideType, Integer capacity, Double baseFareMultiplier, Double perKmMultiplier) {
        this.provider = provider;
        this.rideType = rideType;
        this.capacity = capacity;
        this.baseFareMultiplier = baseFareMultiplier;
        this.perKmMultiplier = perKmMultiplier;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public RideProvider getProvider() { return provider; }
    public void setProvider(RideProvider provider) { this.provider = provider; }

    public String getRideType() { return rideType; }
    public void setRideType(String rideType) { this.rideType = rideType; }

    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }

    public Double getBaseFareMultiplier() { return baseFareMultiplier; }
    public void setBaseFareMultiplier(Double baseFareMultiplier) { this.baseFareMultiplier = baseFareMultiplier; }

    public Double getPerKmMultiplier() { return perKmMultiplier; }
    public void setPerKmMultiplier(Double perKmMultiplier) { this.perKmMultiplier = perKmMultiplier; }
}
