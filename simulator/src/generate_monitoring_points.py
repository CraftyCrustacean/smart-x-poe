from shapely.geometry import LineString
from pipeline_data import pipelines_raw


def get_points(coordinates, num_points):
    # Convert coordinate pairs into a line
    line = LineString(coordinates)
    points = []

    for i in range(num_points):
        # Place each point at a fraction of the line length
        fraction = i / (num_points - 1)
        point = line.interpolate(fraction, normalized=True)
        # Pull the lat and lon out of shapely's "Point" object
        points.append((point.x, point.y))
    return points


def generate_monitoring_points(points_per_line):
    all_points = []

    for pipeline_id, pipeline in pipelines_raw.items():
        coordinates = pipeline["coordinates"]
        pipe_points = get_points(coordinates, points_per_line)
        total_length = pipeline["length_km"]
        length_per_point = total_length / (points_per_line - 1)

        for i, (lon, lat) in enumerate(pipe_points):
            all_points.append({
                "pipeline_id": pipeline_id,
                "point_index": i,
                "longitude": lon,
                "latitude": lat,
                "approx_km_from_start": round(i * length_per_point, 1),
                "pipeline_type": pipeline["type"],
            })
    return all_points
