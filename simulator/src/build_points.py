import random
from monitoring_point_hardware import EnvironmentalSensor, ActuatorSensor, FlowRateSensor
from generate_monitoring_points import generate_monitoring_points
from pipeline_data import pipelines_raw

risk_chance = 0.15
points = 100
set_seed = 2407


def build_monitoring_points(points_per_line=points, seed=set_seed):
    rng = random.Random(seed)
    raw_points = generate_monitoring_points(points_per_line)
    devices = []

    for r in raw_points:
        is_risk = rng.random() < risk_chance

        shared_args = dict(
            latitude=r["latitude"],
            longitude=r["longitude"],
            pipeline_id=r["pipeline_id"],
            chainage_km=r["approx_km_from_start"],
            product_type=r["pipeline_type"],
            is_at_risk=is_risk,
        )

        devices.append(EnvironmentalSensor(**shared_args))
        devices.append(ActuatorSensor(**shared_args))
        devices.append(FlowRateSensor(**shared_args))

    return devices
