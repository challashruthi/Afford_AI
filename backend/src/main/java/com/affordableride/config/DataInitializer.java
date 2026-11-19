package com.affordableride.config;

import com.affordableride.entity.RideOption;
import com.affordableride.entity.RideProvider;
import com.affordableride.repository.RideOptionRepository;
import com.affordableride.repository.RideProviderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private RideProviderRepository providerRepository;

    @Autowired
    private RideOptionRepository optionRepository;

    @Override
    public void run(String... args) throws Exception {
        if (providerRepository.count() == 0) {
            // Seed Uber
            RideProvider uber = new RideProvider("Uber", 30.0, 9.0, 1.2, 40.0, 1.05);
            providerRepository.save(uber);

            optionRepository.save(new RideOption(uber, "Moto", 1, 1.0, 0.9));
            optionRepository.save(new RideOption(uber, "Auto", 3, 1.4, 1.2));
            optionRepository.save(new RideOption(uber, "Go", 4, 2.0, 1.6));
            optionRepository.save(new RideOption(uber, "Premier", 4, 2.8, 2.0));

            // Seed Ola
            RideProvider ola = new RideProvider("Ola", 28.0, 8.5, 1.0, 35.0, 1.0);
            providerRepository.save(ola);

            optionRepository.save(new RideOption(ola, "Bike", 1, 0.9, 0.9));
            optionRepository.save(new RideOption(ola, "Auto", 3, 1.3, 1.2));
            optionRepository.save(new RideOption(ola, "Mini", 4, 1.8, 1.5));
            optionRepository.save(new RideOption(ola, "Prime Sedan", 4, 2.5, 1.9));

            // Seed Rapido
            RideProvider rapido = new RideProvider("Rapido", 22.0, 7.5, 0.8, 30.0, 1.0);
            providerRepository.save(rapido);

            optionRepository.save(new RideOption(rapido, "Bike", 1, 0.8, 0.8));
            optionRepository.save(new RideOption(rapido, "Auto", 3, 1.2, 1.1));
            optionRepository.save(new RideOption(rapido, "Cab Economy", 4, 1.7, 1.4));

            // Seed Pink Bike
            RideProvider pinkBike = new RideProvider("Pink Bike", 22.0, 7.2, 0.85, 30.0, 1.0);
            providerRepository.save(pinkBike);

            optionRepository.save(new RideOption(pinkBike, "Bike", 1, 0.8, 0.8));
        }
    }
}
