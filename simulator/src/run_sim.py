import os
import time
import json
import random
import paho.mqtt.client as mqtt
from datetime import datetime, timedelta, timezone
from build_points import build_monitoring_points

mqtt_host = os.getenv("MQTT_HOST", "mosquitto")
mqtt_port = int(os.getenv("MQTT_PORT", "1883"))
hours_per_pass = 24
historical_pass_amount = 180
simulated_pass_interval_seconds = 10  # Time between simulated passes in seconds
random_seed = random.randint(0, 10000)  # Random seed for simulation, can be set to a fixed value for reproducibility

# MQTT setup
try:
    client = mqtt.Client()  
    client.connect(mqtt_host, mqtt_port)
    client.loop_start()
except Exception as e:
    print(f"Error connecting to MQTT broker at {mqtt_host}:{mqtt_port}: {e}")
    exit(1)

def publish_reading(reading):
    topic = "sensors/telemetry"
    # If json gets a type it cant handle fallback to a string
    payload = json.dumps(reading, default=str)
    client.publish(topic, payload)


def backfill_history(devices, rng, num_passes, hours_per_pass=hours_per_pass):

    # Generate backdated historical data
    # Starting time is based on how many passes are requested and how long is between each pass
    start_time = datetime.now(timezone.utc) - timedelta(hours=hours_per_pass * num_passes)
    pass_time = start_time

    for pass_num in range(1, num_passes + 1):
        pass_time += timedelta(hours=hours_per_pass)

        for d in devices:
            d.step(rng)
            reading = d.reading(pass_time)
            if reading is not None:
                publish_reading(reading)

    return pass_time


def run_live(devices, rng, pass_time, seconds_between_passes=simulated_pass_interval_seconds):

    # Simulate new readings continuously, sped up for demo purposes
    try:
        while True:
            pass_time += timedelta(hours=hours_per_pass)

            for d in devices:
                d.step(rng)
                reading = d.reading(pass_time)
                if reading is not None:
                    publish_reading(reading)    
                    print(f"Payload content: {reading}")       
            print(f"Published readings for pass at {pass_time.isoformat()}")
            time.sleep(seconds_between_passes)
    except KeyboardInterrupt:
        print("Simulation stopped by user.")
        client.loop_stop()
        client.disconnect()

def run_sim(historical_passes=historical_pass_amount, seed=random_seed):
    rng = random.Random(seed)
    devices = build_monitoring_points()

    print(f"Backfilling {historical_passes} historical passes...")
    last_pass_time = backfill_history(devices, rng, historical_passes)

    print("Backfill complete. Switching to live simulation...")
    run_live(devices, rng, last_pass_time)


if __name__ == "__main__":
    run_sim()