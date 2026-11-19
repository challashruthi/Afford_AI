import os
import csv
import random

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DATASET_PATH = os.path.join(SCRIPT_DIR, "ride_fare_dataset.csv")

def generate_dataset(filename=None, num_samples=10000):
    if filename is None:
        filename = DEFAULT_DATASET_PATH
    random.seed(42)

    source_areas = [
        "KITSW Warangal", "Kazipet Junction", "Hanamkonda Chowrastha",
        "Warangal Railway Station", "Subedari", "Mulugu Road",
        "Waddepally Lake", "Hunter Road", "Kakatiya University", "NIT Warangal"
    ]
    
    destination_areas = [
        "Hanamkonda Bus Station", "Warangal Railway Station", "KITSW Warangal",
        "Kazipet Junction", "Kakatiya University", "NIT Warangal",
        "MGM Hospital Warangal", "Rohini Super Speciality", "Bhadrakali Temple", "TCS Ion Centre"
    ]

    providers = ["Uber", "Ola", "Rapido", "Pink Bike"]
    ride_types = {
        "Uber": ["Moto", "Auto", "Go"],
        "Ola": ["Bike", "Auto", "Mini"],
        "Rapido": ["Bike", "Auto", "Cab Economy"],
        "Pink Bike": ["Women Captain", "Bike"]
    }

    # Provider-specific base rate structures (Base, per_km, per_min, min_fare)
    base_rates = {
        ("Uber", "Moto"): (30.0, 8.0, 1.0, 35.0),
        ("Uber", "Auto"): (45.0, 11.5, 1.2, 55.0),
        ("Uber", "Go"): (65.0, 15.0, 1.5, 90.0),
        ("Ola", "Bike"): (25.0, 7.5, 0.9, 32.0),
        ("Ola", "Auto"): (40.0, 11.0, 1.1, 50.0),
        ("Ola", "Mini"): (60.0, 14.0, 1.4, 85.0),
        ("Rapido", "Bike"): (20.0, 7.0, 0.8, 28.0),
        ("Rapido", "Auto"): (35.0, 10.0, 1.0, 45.0),
        ("Rapido", "Cab Economy"): (50.0, 13.0, 1.3, 75.0),
        ("Pink Bike", "Women Captain"): (22.0, 7.2, 0.85, 30.0),
        ("Pink Bike", "Bike"): (22.0, 7.2, 0.85, 30.0),
    }

    headers = [
        "source_area", "destination_area", "distance_km", "duration_mins",
        "provider", "ride_type", "hour_of_day", "day_of_week", "is_peak_time",
        "surge_multiplier", "traffic_density", "fare"
    ]

    with open(filename, mode="w", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(headers)

        for _ in range(num_samples):
            source = random.choice(source_areas)
            dest = random.choice([d for d in destination_areas if d != source])
            provider = random.choice(providers)
            ride_type = random.choice(ride_types[provider])
            
            distance_km = round(random.uniform(0.8, 42.0), 2)
            
            hour_of_day = random.randint(0, 23)
            day_of_week = random.randint(0, 6)
            
            # Align with SurgeService: Morning Peak (7-9), Evening High Demand (17-20)
            is_peak_time = 1 if (7 <= hour_of_day <= 9 or 17 <= hour_of_day <= 20) else 0

            # Traffic density (0.1 = free flow, 1.0 = heavy congestion)
            if is_peak_time:
                traffic_density = round(random.uniform(0.6, 0.95), 2)
                surge_multiplier = round(random.uniform(1.2, 2.0), 2)
            elif hour_of_day in [10, 11, 16, 21, 22]:
                traffic_density = round(random.uniform(0.3, 0.65), 2)
                surge_multiplier = round(random.uniform(1.05, 1.35), 2)
            else:
                traffic_density = round(random.uniform(0.1, 0.35), 2)
                surge_multiplier = 1.0

            # Duration scaling based on speed & traffic
            speed_kph = max(12.0, 40.0 * (1.0 - 0.5 * traffic_density))
            duration_mins = max(2.0, round((distance_km / speed_kph) * 60 + random.uniform(-2, 5), 1))

            base, per_km, per_min, min_fare = base_rates[(provider, ride_type)]
            
            # Ground truth fare calculation + minor market noise
            traffic_effect = (traffic_density * 3.5)
            noise = random.uniform(-3.5, 4.5)
            raw_fare = ((base + (distance_km * per_km) + (duration_mins * per_min) + traffic_effect) * surge_multiplier) + noise
            fare = round(max(min_fare, raw_fare), 2)

            writer.writerow([
                source, dest, distance_km, duration_mins,
                provider, ride_type, hour_of_day, day_of_week, is_peak_time,
                surge_multiplier, traffic_density, fare
            ])

    print(f"Diversified ride fare dataset generated with {num_samples} samples at '{filename}'.")

if __name__ == "__main__":
    generate_dataset()
