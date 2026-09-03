import random
import math


class SensorDevice:

    disconnect_chance = 0.0015
    battery_drain_pct_per_pass = 0.05


    def __init__(self, latitude, longitude, pipeline_id, category, chainage_km, product_type, rng, is_at_risk = False):
        self.mac_address = self.generate_mac(rng)
        self.device_id = f"ESP32-{self.mac_address.replace(':', '')}"
        self.latitude = latitude
        self.longitude = longitude
        self.pipeline_id = pipeline_id
        self.category = category
        self.chainage_km = chainage_km
        self.product_type = product_type
        self.is_at_risk = is_at_risk
        self.tick = 0
        self.is_connected = True
        self.battery_level_raw = 100.0


    # Generate a random mac address
    @staticmethod
    def generate_mac(rng: random.Random):
        return ":".join(f"{rng.randint(0, 255):02X}" for _ in range(6))


    # Move the simulation forward one tick with a random chance to disconnect/reconnect a sensor
    def step(self, rng: random.Random):
        self.tick += 1
        if self.is_connected and rng.random() < self.disconnect_chance:
            self.is_connected = False
        elif not self.is_connected and rng.random() < 0.05:  # 5% chance to reconnect
            self.is_connected = True

        if self.is_connected:
            drain = max(0.0, self.battery_drain_pct_per_pass + rng.gauss(0, 0.08))
            self.battery_level_raw = max(0.0, self.battery_level_raw - drain)

    @property
    def battery_level_pct(self) -> int:
        return round(self.battery_level_raw)


class EnvironmentalSensor(SensorDevice):


    def __init__(self, *args, **kwargs):
        super().__init__(*args, category="Environmental", **kwargs)

        # Baseline values, points move around this
        self.elevation_change_mm = 0.0
        self.surface_temperature_c = 18.0
        self.colour_shift_index = 0.0


    def step(self, rng: random.Random):
        super().step(rng)
        if not self.is_connected:
            return

        # Elevation changes
        noise = max(-3.0, min(3.0, rng.gauss(0, 1.5)))
        # Sensors at risk points trend to -15mm following a logirithmic curve
        drift = max(-15.0, -2.0 * math.log1p(self.tick)) if self.is_at_risk else 0.0
        self.elevation_change_mm = drift + noise

        # Surface temp changes
        noise = rng.gauss(0, 0.8)
        anomaly = 0
        if self.is_at_risk and rng.random() < 0.08:
            # Add a number between 3 and 7 to at tisk sensors
            anomaly = rng.uniform(3,7)
        self.surface_temperature_c = 18 + noise + anomaly

        # Colour shift, at risk points trending toward a lower value
        target = -0.4 if self.is_at_risk else 0.0
        self.colour_shift_index += (target - self.colour_shift_index) * 0.05 + rng.gauss(0, 0.03)
        self.colour_shift_index = max(-1.0, min(1.0, self.colour_shift_index))


    def reading(self, timestamp) -> dict:
        if not self.is_connected:
            return None
        return{
            "device_id": self.device_id,
            "timestamp": timestamp.isoformat(timespec='minutes'),
            "elevation_change_mm": round(self.elevation_change_mm, 2),
            "surface_temperature_c": round(self.surface_temperature_c, 2),
            "colour_shift_index": round(self.colour_shift_index, 4),
            "battery_level_pct": self.battery_level_pct,
        }


class ActuatorSensor(SensorDevice):

    switch_chance = 0.01
    max_ticks_closed = 5 # Maximum ticks a valve can be closed before it is forced open again


    def __init__(self, *args, **kwargs):
        super().__init__(*args, category = "Actuator", **kwargs)
        self.valve_open = True
        self.ticks_since_clossed = 0


    def step(self, rng: random.Random):
        super().step(rng)
        if not self.is_connected:
            return
        # Every tick there is a chance a valves state changes
        if self.valve_open:
            if rng.random() < self.switch_chance:
                self.valve_open = False
                self.ticks_since_clossed = 0
        # If a valve is closed for too long it will be forced open
        else:
            self.ticks_since_clossed += 1
            if self.ticks_since_clossed > self.max_ticks_closed:
                self.valve_open = True


    def reading(self, timestamp) -> dict:
        if not self.is_connected:
            return None
        return {
            "device_id": self.device_id,
            "timestamp": timestamp.isoformat(timespec='minutes'),
            "valve_state": self.valve_open,
            "battery_level_pct": self.battery_level_pct,
        }


class FlowRateSensor(SensorDevice):
    baseline_flow_lps = 100.0
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, category = "FlowRate", **kwargs)
        self.flow_rate_lps = self.baseline_flow_lps


    def step(self, rng: random.Random):
        super().step(rng)
        if not self.is_connected:
            return
        # Flow rate changes with some noise
        max_drop = self.baseline_flow_lps * 0.6 # Flow drop will cap out at 60% baseline if at risk.
        noise = rng.gauss(0, 1.5)
        if self.is_at_risk:
            # At risk sensors trend down to 60% of baseline following a logarithmic curve
            drop = min(max_drop, 4 * math.log1p(self.tick))
        else:
            drop = 0.0

        self.flow_rate_lps = max(0.0, self.baseline_flow_lps - drop + noise)


    def reading(self, timestamp) -> dict:
        if not self.is_connected:
            return None
        return {
            "device_id": self.device_id,
            "timestamp": timestamp.isoformat(timespec='minutes'),
            "flow_rate_lps": round(self.flow_rate_lps, 2),
            "battery_level_pct": self.battery_level_pct,
        }
