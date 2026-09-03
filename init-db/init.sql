CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

CREATE TABLE devices (
	device_id TEXT PRIMARY KEY,
	mac_address TEXT NOT NULL,
	category TEXT NOT NULL,
	product_type TEXT NOT NULL,
	firmware_version TEXT NOT NULL,
	provisioned_at TIMESTAMPTZ NOT NULL,
	"status" TEXT NOT NULL,
	lat FLOAT NOT NULL,
	lon FLOAT NOT NULL,
	region TEXT NOT NULL,
	"zone" TEXT NOT NULL,
	subzone TEXT NOT NULL,
	chainage_km FLOAT NOT NULL	
);

CREATE TABLE environmental_sensors (
	device_id TEXT REFERENCES devices(device_id),
	"timestamp" TIMESTAMPTZ NOT NULL,
	elevation_change_mm FLOAT NOT NULL,
	surface_temp_c FLOAT NOT NULL,
	colour_shift_index FLOAT NOT NULL,
	PRIMARY KEY("timestamp", device_id)
)WITH (timescaledb.hypertable);

CREATE TABLE actuator_sensors (
	device_id TEXT REFERENCES devices(device_id),
	"timestamp" TIMESTAMPTZ NOT NULL,
	valve_state BOOL NOT NULL,
	PRIMARY KEY("timestamp", device_id)
)WITH (timescaledb.hypertable);

CREATE TABLE flow_sensors (
	device_id TEXT REFERENCES devices(device_id),
	"timestamp" TIMESTAMPTZ NOT NULL,
	flow_rate_lps FLOAT NOT NULL,
	PRIMARY KEY("timestamp", device_id)
)WITH (timescaledb.hypertable);