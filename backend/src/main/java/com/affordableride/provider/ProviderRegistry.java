package com.affordableride.provider;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class ProviderRegistry {

    private final Map<String, RideProviderInterface> providerMap;

    @Autowired
    public ProviderRegistry(List<RideProviderInterface> providers) {
        this.providerMap = providers.stream()
                .collect(Collectors.toMap(
                        p -> p.getProviderName().toLowerCase(),
                        Function.identity()
                ));
    }

    public List<RideProviderInterface> getAllProviders() {
        return providerMap.values().stream()
                .filter(p -> !"mockrideprovider".equalsIgnoreCase(p.getProviderName()))
                .collect(Collectors.toList());
    }

    public RideProviderInterface getProvider(String name) {
        if (name == null) return providerMap.get("mockrideprovider");
        return providerMap.getOrDefault(name.toLowerCase(), providerMap.get("mockrideprovider"));
    }
}
