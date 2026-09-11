CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

CREATE TABLE IF NOT EXISTS devices (
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

CREATE TABLE IF NOT EXISTS device_files (
    file_id UUID PRIMARY KEY,
    device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    original_filename TEXT NOT NULL,
    stored_path TEXT NOT NULL,
    content_type TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS index_device_files_device_id ON device_files(device_id);

CREATE TABLE IF NOT EXISTS environmental_sensors (
	device_id TEXT REFERENCES devices(device_id),
	"timestamp" TIMESTAMPTZ NOT NULL,
	elevation_change_mm FLOAT NOT NULL,
	surface_temp_c FLOAT NOT NULL,
	colour_shift_index FLOAT NOT NULL,
	PRIMARY KEY("timestamp", device_id)
)WITH (timescaledb.hypertable);

CREATE TABLE IF NOT EXISTS actuator_sensors (
	device_id TEXT REFERENCES devices(device_id),
	"timestamp" TIMESTAMPTZ NOT NULL,
	valve_open BOOL NOT NULL,
	PRIMARY KEY("timestamp", device_id)
)WITH (timescaledb.hypertable);

CREATE TABLE IF NOT EXISTS flow_sensors (
	device_id TEXT REFERENCES devices(device_id),
	"timestamp" TIMESTAMPTZ NOT NULL,
	flow_rate_lps FLOAT NOT NULL,
	PRIMARY KEY("timestamp", device_id)
)WITH (timescaledb.hypertable);