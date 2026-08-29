import random
import math


class SensorDevice:

    disconnect_chance = 0.0015


    def __init__(self, location_id, latitude, longitude, pipeline_id, category, is_at_risk = False):
        self.device_id = f"{location_id}_{category}"
        self.mac_address = self.generate_mac()
        self.latitude = latitude
        self.longitude = longitude
        self.pipeline_id = pipeline_id
        self.category = category
        self.is_at_risk = is_at_risk
        self.tick = 0
        self.is_connected = True


    # Generate a random mac address
    @staticmethod
    def generate_mac():
        return ":".join(f"{random.randint(0, 255):02X}" for _ in range(6))


    # Move the simulation forward one tick with a random chance to disconnect a sensor
    def step(self, rng: random.Random):
        self.tick += 1
        if self.is_connected and rng.random() < self.disconnect_chance:
            self.is_connected = False


class EnvironmentalSensor(SensorDevice):


    def __init__(self, *args, **kwargs):
        super().__init__(*args, category="Environmental", **kwargs)

        # Baseline values, points move around this
        self.elevation_change_mm = 0.0
        self.surface_temperature_c = 21.0
        self.colour_shift_index = 0.0


    def step(self, rng: random.Random):
        super().step(rng)
        if not self.is_connected:
            return

        # Elevation changes
        base_change = rng.gauss(0, 0.3)
        # Sensors at risk point drop faster (following a logarithmic pattern)
        drift = -0.15 * math.log1p(self.tick) if self.is_at_risk else 0
        self.elevation_change_mm += base_change + drift

        # Surface temp changes
        noise = rng.gauss(0, 0.8)
        anomaly = 0
        if self.is_at_risk and rng.random() < 0.08:
            # Add a number between 3 and 7 to at tisk sensors
            anomaly = rng.uniform(3,7)
        self.surface_temperature_c = 21 + noise + anomaly

        # Colour shift, at risk points trending toward a lower value
        target = -0.4 if self.is_at_risk else 0.0
        self.colour_shift_index += (target - self.colour_shift_index) * 0.05 + rng.gauss(0, 0.03)
        self.colour_shift_index = max(-1.0, min(1.0, self.colour_shift_index))


    def reading(self, timestamp) -> dict:
        if not self.is_connected:
            return None
        return{
            "device_id": self.device_id,
            "mac_address": self.mac_address,
            "pipeline_id": self.pipeline_id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "category": self.category,
            "timestamp": timestamp,
            "elevation_change_mm": self.elevation_change_mm,
            "surface_temperature_c": self.surface_temperature_c,
            "colour_shift_index": self.colour_shift_index,
        }


class PowerSensor(SensorDevice):

    battery_drain = 100/2190


    def __init__(self, *args, **kwargs):
        super().__init__(*args, category = "Power", **kwargs)
        self.battery_level_raw = 100.0


    def step(self, rng: random.Random):
        super().step(rng)
        if not self.is_connected:
            return
        # Randomly drain the battery every tick
        drain = self.battery_drain + rng.gauss(0, 0.05)
        self.battery_level_raw = max(0, self.battery_level_raw - drain)


    # Assignment requires an int, this rounds it to be one
    @property
    def battery_level(self) -> int:
        return round(self.battery_level_raw)


    def reading(self, timestamp) -> dict:
        if not self.is_connected:
            return None
        return {
            "device_id": self.device_id,
            "mac_address": self.mac_address,
            "pipeline_id": self.pipeline_id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "category": self.category,
            "timestamp": timestamp,
            "battery_level_pct": self.battery_level,
        }


class ActuatorSensor(SensorDevice):

    switch_chance = 0.05


    def __init__(self, *args, **kwargs):
        super().__init__(*args, category = "Actuator", **kwargs)
        self.valve_open = True


    def step(self, rng: random.Random):
        super().step(rng)
        if not self.is_connected:
            return
        # Every tick there is a chance a valves state changes
        if rng.random() < self.switch_chance:
            self.valve_open = not self.valve_open


    def reading(self, timestamp) -> dict:
        if not self.is_connected:
            return None
        return {
            "device_id": self.device_id,
            "mac_address": self.mac_address,
            "pipeline_id": self.pipeline_id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "category": self.category,
            "timestamp": timestamp,
            "valve_open": self.valve_open,
        }
