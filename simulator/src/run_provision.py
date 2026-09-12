from datetime import datetime, timezone
import os
import json
import time
import paho.mqtt.client as mqtt

from build_points import build_monitoring_points

MQTT_HOST = os.getenv("MQTT_HOST", "mosquitto")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
PUBLISH_TIMEOUT_SECONDS = 30.0

subzone_length_km = 50  # Length of each subzone in kilometers

def provision_all_devices():
    client = mqtt.Client()
    try:
        client.connect(MQTT_HOST, MQTT_PORT)
        client.loop_start()
    except Exception as e:
        print(f"Error connecting to MQTT broker at {MQTT_HOST}:{MQTT_PORT}: {e}")
        exit(1)

    devices = build_monitoring_points()
    provisioned_at = datetime.now(timezone.utc).isoformat(timespec='minutes')

    publish_results = []

    # Send static information for each device, simulating technicians provisioning the devices.
    for i, device in enumerate(devices, start=1):
        subzone_index = int(device.chainage_km // subzone_length_km) + 1

        payload = {
            "device_id": device.device_id,
            "mac_address": device.mac_address,
            "category": device.category,
            "product_type": device.product_type,
            "firmware_version": "1.0.1",
            "provisioned_at": provisioned_at,
            "status": "active",
            "location": {
                "latitude": device.latitude,
                "longitude": device.longitude,
                "chainage_km": device.chainage_km
            },
            "topology": {
                "region": "South Africa",
                "zone": device.pipeline_id,
                "subzone": f"Subzone-{subzone_index}"
            }
        }

        result = client.publish("devices/provision", json.dumps(payload), qos=1)
        publish_results.append((device.device_id, result))

    for device_id, result in publish_results:
        try:
                result.wait_for_publish(timeout=PUBLISH_TIMEOUT_SECONDS)
        except ValueError:
                client.loop_stop()
                client.disconnect()
                print(f"Error: Timeout waiting for MQTT PUBACK on device {device_id} after {PUBLISH_TIMEOUT_SECONDS}s.")
                exit(1)

    client.loop_stop()
    client.disconnect()
    print(f"Provisioning complete. {len(devices)} devices provisioned and confirmed.")

if __name__ == "__main__":
    provision_all_devices()

