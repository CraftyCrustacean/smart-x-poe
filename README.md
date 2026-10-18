# Smart-X

A PROG7312 project that simulates a pipeline monitoring network and turns its telemetry into a live operations dashboard.

About 1,200 simulated ESP32 devices (400 monitoring points, each with an environmental sensor, a valve actuator and a flow-rate sensor) publish readings over MQTT. An ASP.NET Core backend ingests, prioritises and stores them in memory, and a React frontend shows them live.

---

## Contents

- [Quick start](#quick-start)
- [First-time Docker setup (Windows)](#first-time-docker-setup-windows)
- [Using the app](#using-the-app)
- [How it works](#how-it-works)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Known limitations](#known-limitations)

---

## Quick start

Everything runs in Docker, so the only thing you need installed is [Docker Desktop](https://docs.docker.com/desktop/). Node.js and .NET are not needed.

### Windows - one click

1. Clone or download the repository.
2. Start Docker Desktop and wait for **Engine running**.
3. Double-click **start.bat**.

start.bat creates .env from .env.example if it is missing, builds and starts every container, and opens the app at <http://localhost:3000>. The first run builds the images and takes a few minutes. To stop everything, double-click **stop.bat**.

### Mac and Linux - one click

1. Clone or download the repository.
2. Start Docker Desktop and wait for **Engine running**.
3. Double-click **start.sh**.

start.sh creates .env from .env.example if it is missing, builds and starts every container, and opens the app at <http://localhost:3000>. The first run builds the images and takes a few minutes. To stop everything, double-click **stop.sh**.

### The Containers

| Container   | Port                                 | Role                                                                          |
| :---------- | :----------------------------------- | :---------------------------------------------------------------------------- |
| frontend    | [3000](http://localhost:3000)        | React app served by nginx                                                     |
| backend     | [8080](http://localhost:8080/health) | ASP.NET Core API and SignalR hub                                              |
| mosquitto   | 1883                                 | MQTT broker                                                                   |
| timescaledb | 5432                                 | PostgreSQL with TimescaleDB (registered devices and uploaded files)           |
| provisioner | _none_                               | Registers the simulated devices once, then exits                              |
| simulator   | _none_                               | Publishes telemetry: one pass every 10 seconds, each pass = one simulated day |

**Give it a few minutes.** At-risk devices drift towards their thresholds over the first few simulated days, so alerts, drift insights and disconnects start to appear after about 2 to 5 minutes.

---

## First-time Docker setup (Windows)

_Skip this if Docker Desktop already runs._

Enable virtualisation and WSL 2

1. Check that hardware virtualisation is on. Press **Ctrl + Shift + Esc**, open the **Performance** tab, select **CPU**, and look for **Virtualisation: Enabled**. If it is disabled, turn it on in your BIOS/UEFI settings.
2. Enable the Windows features. Open PowerShell as Administrator and run:

   ```powershell
   dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
   wsl --update
   ```

3. Restart your PC, then install and start [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/).

---

## Using the app

| Page            | Route            | Contents                                                                                                                                     |
| --------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing         | /                | The three modules and an about sections flows                                                                                                |
| Command Stream  | /command-stream  | Network summary tiles, metric charts, subzone grid, recent alerts. Updates every batch (about 10 s). Bulk commands are on each subzone card. |
| Insights        | /insights        | Suggested Actions (learned) and Automated Insights (rules), filterable by alert type, as well as the learned-patterns table                  |
| Command History | /command-history | Every command issued, newest first, with Undo for the latest valve command                                                                   |
| Device Details  | /devices         | Part 1 drill down by zone and subzonea as well as search results when you search                                                             |
| Device page     | /devices/:id     | Live state, recent readings, timeline charts, and single device commands                                                                     |
| Register device | /devices/new     | Part 1 registration form                                                                                                                     |
| Feature Demo    | /feature         | Part 1 recursion and operator-overloading demo                                                                                               |

**Search** is in the header on every page. Type part of a device id for suggestions, or press Enter and filter by category, alert state, zone, subzone, chainage, low battery or active override.

**Commands:** open valve, close valve, reboot, mute, unmute and acknowledge, on one device or a whole subzone. Valve and reboot ask for confirmation. A valve or reboot override is shown for 3 batches (about 30 s), then live readings take over again.

**Diagnostics:** <http://localhost:8080/api/diagnostics/queues> shows queue depths and how often critical readings overtook the FIFO.

---

## How it works

1. The **MQTT thread** only parses the reading, looks the device up and checks thresholds, then enqueues it. Critical readings go into a priority queue, while everything else goes into a FIFO queue.
2. A **single consumer thread** empties the priority queue first, then the FIFO. For each reading it updates the device's live state and its timeline, raises or clears alerts, and adds the reading to the current batch.
3. When a batch closes (5 seconds with no new packets), the backend detects disconnects, builds zone and subzone snapshots, rebuilds the insights, and pushes one SignalR BatchClosed message.
4. The **frontend** keeps one SignalR connection above the router. Each push updates the TanStack Query cache, and open pages refetch over the API. New alerts arrive as AlertRaised and appear in the notification bell.

---

## Configuration

**Database credentials** live in .env (copied from .env.example):

```env
POSTGRES_USER=myuser
POSTGRES_PASSWORD=yoursecretpass
POSTGRES_DB=mydb
```

**Thresholds** are as follows:

| Setting                        | Normal | Critical |
| :----------------------------- | :----- | :------- |
| Thresholds:ElevationChangeMm   | 0      | −8 mm    |
| Thresholds:SurfaceTemperatureC | 18     | 23 °C    |
| Thresholds:ColourShiftIndex    | 0      | −0.35    |
| Thresholds:FlowRateLps         | 100    | 85 L/s   |
| Search:LowBatteryPct           |        | 20 %     |

---

## Troubleshooting

| Issue                                           | Suggested fix                                                                                                                                                   |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| start.bat says Docker is not running            | Start Docker Desktop and wait for **Engine running**                                                                                                            |
| Page loads but shows no data                    | Wait a minute for the first few batches. Then check docker compose logs backend and that <http://localhost:8080/health> responds                                |
| Backend logs Unknown device … telemetry dropped | There is a known issue with the containers racing, wait for another readings pass as it should be self healing. If the problem persists restart the containers. |
| Port 3000, 8080, 1883 or 5432 already in use    | Stop the other program using that port, or change the left-hand port in docker-compose.yml                                                                      |

---

## Known limitations

- Part 2 history is in memory, so timelines, alerts, command history and the learned model reset when the backend restarts.
- Telemetry uses MQTT QoS 0, so an occasional dropped packet can mark a device disconnected for one batch.
- Overrides are shown for a 3-batch window. Nothing is sent back to the simulated devices so no real change happens to that device.

---
