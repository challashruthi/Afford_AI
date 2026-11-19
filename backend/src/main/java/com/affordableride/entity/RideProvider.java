package com.affordableride.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "ride_providers")
public class RideProvider {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "provider_name", nullable = false, unique = true)
    private String providerName;

    @Column(name = "base_fare", nullable = false)
    private Double baseFare;

    @Column(name = "per_km_rate", nullable = false)
    private Double perKmRate;

    @Column(name = "per_min_rate", nullable = false)
    private Double perMinRate;

    @Column(name = "minimum_fare", nullable = false)
    private Double minimumFare;

    @Column(name = "surge_factor", nullable = false)
    private Double surgeFactor = 1.0;

    @Column(name = "is_active", nullable = false)
    private Boolean active = true;

    public RideProvider() {}

    public RideProvider(String providerName, Double baseFare, Double perKmRate, Double perMinRate, Double minimumFare, Double surgeFactor) {
        this.providerName = providerName;
        this.baseFare = baseFare;
        this.perKmRate = perKmRate;
        this.perMinRate = perMinRate;
        this.minimumFare = minimumFare;
        this.surgeFactor = surgeFactor != null ? surgeFactor : 1.0;
        this.active = true;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getProviderName() { return providerName; }
    public void setProviderName(String providerName) { this.providerName = providerName; }

    public Double getBaseFare() { return baseFare; }
    public void setBaseFare(Double baseFare) { this.baseFare = baseFare; }

    public Double getPerKmRate() { return perKmRate; }
    public void setPerKmRate(Double perKmRate) { this.perKmRate = perKmRate; }

    public Double getPerMinRate() { return perMinRate; }
    public void setPerMinRate(Double perMinRate) { this.perMinRate = perMinRate; }

    public Double getMinimumFare() { return minimumFare; }
    public void setMinimumFare(Double minimumFare) { this.minimumFare = minimumFare; }

    public Double getSurgeFactor() { return surgeFactor; }
    public void setSurgeFactor(Double surgeFactor) { this.surgeFactor = surgeFactor; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}
