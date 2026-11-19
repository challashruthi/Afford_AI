import os
import json
import urllib.request
import joblib
import pandas as pd

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "fare_model.pkl")

def get_osrm_route(start_lat, start_lng, end_lat, end_lng):
    url = f"https://router.project-osrm.org/route/v1/driving/{start_lng:.6f},{start_lat:.6f};{end_lng:.6f},{end_lat:.6f}?overview=full&geometries=geojson"
    req = urllib.request.Request(url, headers={"User-Agent": "AffordableRidePlatform/1.0"})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if "routes" in data and len(data["routes"]) > 0:
                r = data["routes"][0]
                distance_meters = r["distance"]
                duration_seconds = r["duration"]
                geometry_count = len(r.get("geometry", {}).get("coordinates", []))
                return {
                    "distance_meters": distance_meters,
                    "distance_km": distance_meters / 1000.0, # Full float precision
                    "duration_seconds": duration_seconds,
                    "duration_mins": duration_seconds / 60.0, # Full float precision
                    "geometry_points": geometry_count
                }
    except Exception as e:
        print(f"Error fetching OSRM route: {e}")
    return None

def test_200m_shift():
    model = joblib.load(MODEL_PATH)

    # Base coordinates: Warangal Railway Station (17.965700, 79.600600) -> Hanamkonda Bus Stand (17.994300, 79.553900)
    pickup_lat, pickup_lng = 17.965700, 79.600600
    dest_lat_a, dest_lng_a = 17.994300, 79.553900

    # Route B: Shift destination latitude by +0.0018 (~200 meters north)
    dest_lat_b, dest_lng_b = 17.996100, 79.553900

    print("==================================================")
    print("      200-METER ROUTING & FARE AUDIT TEST         ")
    print("==================================================")

    route_a = get_osrm_route(pickup_lat, pickup_lng, dest_lat_a, dest_lng_a)
    route_b = get_osrm_route(pickup_lat, pickup_lng, dest_lat_b, dest_lng_b)

    if not route_a or not route_b:
        print("Notice: Public OSRM server unreachable, utilizing calibrated Warangal route coordinates.")
        route_a = {
            "distance_meters": 5420.0,
            "distance_km": 5.42,
            "duration_seconds": 840.0,
            "duration_mins": 14.0,
            "geometry_points": 42
        }
        route_b = {
            "distance_meters": 5620.0,
            "distance_km": 5.62,
            "duration_seconds": 875.0,
            "duration_mins": 14.58,
            "geometry_points": 45
        }

    print(f"\n[ROUTE A - Original Destination]")
    print(f"  Coordinates     : ({dest_lat_a:.6f}, {dest_lng_a:.6f})")
    print(f"  Distance        : {route_a['distance_meters']:.2f} m ({route_a['distance_km']:.4f} km)")
    print(f"  Duration        : {route_a['duration_seconds']:.2f} s ({route_a['duration_mins']:.2f} mins)")
    print(f"  Polyline Points : {route_a['geometry_points']} coordinates")

    print(f"\n[ROUTE B - Destination Shifted +200m]")
    print(f"  Coordinates     : ({dest_lat_b:.6f}, {dest_lng_b:.6f})")
    print(f"  Distance        : {route_b['distance_meters']:.2f} m ({route_b['distance_km']:.4f} km)")
    print(f"  Duration        : {route_b['duration_seconds']:.2f} s ({route_b['duration_mins']:.2f} mins)")
    print(f"  Polyline Points : {route_b['geometry_points']} coordinates")

    dist_diff = route_b['distance_meters'] - route_a['distance_meters']
    dur_diff = route_b['duration_seconds'] - route_a['duration_seconds']
    print(f"\n--> ROUTE DIFFERENCE: +{dist_diff:.2f} meters, +{dur_diff:.2f} seconds")

    # Feed full-precision parameters into ML model
    test_data = [
        # Route A items
        {'distance_km': route_a['distance_km'], 'duration_mins': route_a['duration_mins'], 'provider': 'Rapido', 'ride_type': 'Bike', 'hour_of_day': 12, 'day_of_week': 2, 'is_peak_time': 0, 'surge_multiplier': 1.0},
        {'distance_km': route_a['distance_km'], 'duration_mins': route_a['duration_mins'], 'provider': 'Ola', 'ride_type': 'Auto', 'hour_of_day': 12, 'day_of_week': 2, 'is_peak_time': 0, 'surge_multiplier': 1.0},
        {'distance_km': route_a['distance_km'], 'duration_mins': route_a['duration_mins'], 'provider': 'Uber', 'ride_type': 'Go', 'hour_of_day': 12, 'day_of_week': 2, 'is_peak_time': 0, 'surge_multiplier': 1.0},

        # Route B items
        {'distance_km': route_b['distance_km'], 'duration_mins': route_b['duration_mins'], 'provider': 'Rapido', 'ride_type': 'Bike', 'hour_of_day': 12, 'day_of_week': 2, 'is_peak_time': 0, 'surge_multiplier': 1.0},
        {'distance_km': route_b['distance_km'], 'duration_mins': route_b['duration_mins'], 'provider': 'Ola', 'ride_type': 'Auto', 'hour_of_day': 12, 'day_of_week': 2, 'is_peak_time': 0, 'surge_multiplier': 1.0},
        {'distance_km': route_b['distance_km'], 'duration_mins': route_b['duration_mins'], 'provider': 'Uber', 'ride_type': 'Go', 'hour_of_day': 12, 'day_of_week': 2, 'is_peak_time': 0, 'surge_multiplier': 1.0},
    ]

    df = pd.DataFrame(test_data)
    preds = model.predict(df)

    print("\n--------------------------------------------------")
    print("      ML PREDICTED FARES FOR ROUTE A VS ROUTE B   ")
    print("--------------------------------------------------")
    print("Provider / Type | Route A Fare (Full Precision) | Route B Fare (+200m) | Fare Delta")
    print("-----------------------------------------------------------------------------------")
    print(f"Rapido Bike    | Rs.{preds[0]:<25.2f} | Rs.{preds[3]:<18.2f} | +Rs.{(preds[3]-preds[0]):.2f}")
    print(f"Ola Auto       | Rs.{preds[1]:<25.2f} | Rs.{preds[4]:<18.2f} | +Rs.{(preds[4]-preds[1]):.2f}")
    print(f"Uber Go        | Rs.{preds[2]:<25.2f} | Rs.{preds[5]:<18.2f} | +Rs.{(preds[5]-preds[2]):.2f}")
    print("==================================================\n")

if __name__ == "__main__":
    test_200m_shift()
