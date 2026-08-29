import random
from monitoring_point_hardware import EnvironmentalSensor, PowerSensor, ActuatorSensor
from generate_monitoring_points import generate_monitoring_points

risk_chance = 0.15
points = 100
set_seed = 2407


def build_monitoring_points(points_per_line=points, seed=set_seed):
    rng = random.Random(seed)
    raw_points = generate_monitoring_points(points_per_line)
    devices = []

    for r in raw_points:
        is_risk = rng.random() < risk_chance
        location_id =  f"{r['pipeline_id']}_{r['point_index']:03d}"

        shared_args = dict(
            location_id = location_id,
            latitude=r["latitude"],
            longitude=r["longitude"],
            pipeline_id=r["pipeline_id"],
            is_at_risk=is_risk,
        )

        devices.append(EnvironmentalSensor(**shared_args))
        devices.append(PowerSensor(**shared_args))
        devices.append(ActuatorSensor(**shared_args))

    return devices
