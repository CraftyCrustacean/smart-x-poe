# Smart-X

A PROG7312 project that simulates a pipeline monitoring network and turns its telemetry into a live operations dashboard.

About 1 200 simulated ESP32 devices (400 monitoring points, each with an environmental sensor, a valve actuator and a flow-rate sensor) publish readings over MQTT. An ASP.NET Core backend ingests, prioritises and stores them in memory, and a React frontend shows them live.

The app has three modules:

| Module                              | Part | What it does                                                                                                        |
| :---------------------------------- | :--- | :------------------------------------------------------------------------------------------------------------------ |
| Sensor Data Ingestion and Telemetry | 1    | Device registration, provisioning and drill-down by zone and subzone                                                |
| Real-Time Command Stream            | 2    | Live dashboard, alerts, commands with undo, search and predictive insights                                          |
| Network Topology and Mesh Routing   | 3    | Mesh map, routing (BFS, Prim's MST, Dijkstra), simulated failures with self healing, and AVL tree telemetry history |

---

## Contents

- [Quick start](#quick-start)
- [First-time Docker setup (Windows)](#first-time-docker-setup-windows)
- [Viewing Priority Queue](#viewing-priority-queue)
- [Using the app](#using-the-app)
- [Network topology and mesh routing](#network-topology-and-mesh-routing)
- [Part 3 data structures](#part-3-data-structures)
- [API reference](#api-reference)
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

### Mac - one click

1. Clone or download the repository.
2. Start Docker Desktop and wait for **Engine running**.
3. Open the terminal (Cmd + Space, type terminal).
4. Drag and drop the file into the terminal window to copy its path.
5. Press enter to run the script.

start.sh creates .env from .env.example if it is missing, builds and starts every container, and opens the app at <http://localhost:3000>. The first run builds the images and takes a few minutes. To stop everything, repeat the process with **stop.sh**.

### Mac - one click

1. Clone or download the repository.
2. Start Docker Desktop and wait for **Engine running**.
3. Open the terminal (Ctrl + Alt + T).
4. Give the file executable permission: `chmod +x start.sh`
5. Run the script using `./start.sh`

start.sh creates .env from .env.example if it is missing, builds and starts every container, and opens the app at <http://localhost:3000>. The first run builds the images and takes a few minutes. To stop everything, repeat the process with **stop.sh**.

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

## Viewing Priority Queue

To see diagnostics and the priority queue in action navigate to the following links. Waiting for a new batch to come through (10 seconds) and refreshing the page will show it working in real time.

| Diagnostic            | Link                                         |
| :-------------------- | :------------------------------------------- |
| Priority queue        | http://localhost:8080/api/diagnostics/queues |
| Duplicate suppression | http://localhost:8080/api/diagnostics/sets   |

## Using the app

| Page            | Route                | Contents                                                                                                                                     |
| :-------------- | :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------- |
| Landing         | /                    | The three modules and an about sections flows                                                                                                |
| Command Stream  | /command-stream      | Network summary tiles, metric charts, subzone grid, recent alerts. Updates every batch (about 10 s). Bulk commands are on each subzone card. |
| Insights        | /insights            | Suggested Actions (learned) and Automated Insights (rules), filterable by alert type, as well as the learned-patterns table                  |
| Command History | /command-history     | Every command issued, newest first, with Undo for the latest valve command                                                                   |
| Device Details  | /devices             | Part 1 drill down by zone and subzone as well as search results when you search                                                              |
| Device page     | /devices/:id         | Live state, recent readings, timeline charts, and single device commands                                                                     |
| Register device | /devices/new         | Part 1 registration form                                                                                                                     |
| Feature Demo    | /feature             | Part 1 recursion and operator-overloading demo                                                                                               |
| Mesh Overview   | /network             | Mesh map, stat tiles, failure controls, healing report and reachability by pipeline and subzone                                              |
| Network device  | /network/devices/:id | Device specific info, fewest hops and cheapest routes, hop table, route on the map, and its AVL tree telemetry history                       |

**Search** is in the header on every page. Type part of a device id for suggestions, or press Enter and filter by category, alert state, zone, subzone, chainage, low battery or active override.

**Moving between modules:** each device page has a **View mesh route** link, and while you are in the Network section the header search opens the network view of the device you pick.

**Commands:** open valve, close valve, reboot, mute, unmute and acknowledge, on one device or a whole subzone. Valve and reboot ask for confirmation. A valve or reboot override is shown for 3 batches (about 30 s), then live readings take over again.

**Diagnostics:** <http://localhost:8080/api/diagnostics/queues> shows queue depths and how often critical readings overtook the FIFO.

---

## Network topology and mesh routing

The devices form a mesh where each one can relay data for its neighbours until it reaches a gateway at the Durban hub. The Network section shows that mesh and how it reacts when devices fail.

**Using the feature**

1. Open **Network** in the sidebar or from the front page. The map shows each monitoring point, coloured by pipeline, or by status when a device there is down.
2. In **Failure controls**, choose **Subzone**, then `richards_bay_durban` and `Subzone-2`, and press **Simulate failure**. Subzone-2 turns red and the 99 devices in Subzone-1 behind it turn purple (indicating they are cut off), because no remaining link reaches the gateway.
3. Fail a Subzone-2 on any other pipeline instead. Nothing is cut off: the neighbouring pipeline is within radio range (12km), so the mesh reroutes. The **Healing report** lists each device that used to route through a failed one and where it goes now.
4. Press **Restore all** to bring everything back.
5. Click any device (or search for it) to open its route page. It compares three routes to the gateway: the MST route, the BFS route and the cheapest route (Dijkstra). Here you can also see the device's telemetry history with a date range query.

**Statuses:** online (pipeline colour), offline (grey, missed a batch), simulated failure (red), cut off (purple, online but with no route to the gateway).

**History query:** pick a date range in simulated days and a row limit. The statistics line shows how many readings are stored, the tree's height against the AVL maximum, how many nodes the query visited, and the query time.

**NOTE:**
Simulated failures are kept in memory only, and the map's background tiles load from the internet (the devices and routes still draw offline).

---

## Part 3 data structures

All these files can be found in the backend

| Structure     | File Location                   | Function                                                                                             |
| :------------ | :------------------------------ | :--------------------------------------------------------------------------------------------------- |
| AVL tree      | Services/History/AvlTree.cs     | Stores each device's most recent 1 000 readings and answers date range queries                       |
| Composite key | Models/History/HistoryKey.cs    | Simulated reading time plus queue sequence number, so readings that share a timestamp dont overwrite |
| Graph         | Services/Mesh/MeshTopology.cs   | Vertices are the devices plus the gateway. An edge links two devices within 12 km.                   |
| BFS           | Services/Mesh/MeshAlgorithms.cs | Finds every device that can reach the gateway and its fewest hops route.                             |
| Prim's MST    | Services/Mesh/MeshAlgorithms.cs | The cheapest set of links that connects every online device.                                         |
| Dijkstra      | Services/Mesh/MeshAlgorithms.cs | Each device's individually cheapest route, shown next to its MST route                               |

---

## How it works

1. The **MQTT thread** only parses the reading, looks the device up and checks thresholds, then enqueues it. Critical readings go into a priority queue, while everything else goes into a FIFO queue.
2. A **single consumer thread** empties the priority queue first, then the FIFO. For each reading it updates the device's live state and its AVL-tree history (capped at 1 000 readings per device), raises or clears alerts, and adds the reading to the current batch.
3. When a batch closes (5 seconds with no new packets), the backend detects disconnects, builds zone and subzone snapshots, rebuilds the insights, rebuilds the mesh (BFS, Prim's and Dijkstra over the devices that are still online), and pushes SignalR BatchClosed and MeshChanged messages.
4. The **frontend** keeps one SignalR connection above the router. Each push updates the TanStack Query cache, and open pages refetch over the API. New alerts arrive as AlertRaised and appear in the notification bell.
5. The **mesh topology** is built once from the device coordinates and only rebuilt when the number of registered devices changes.

---

## API reference

Part 3 endpoints, all on <http://localhost:8080>:

| Method | Endpoint                                          | Returns                                                                                                                          |
| :----- | :------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /api/history/{deviceId}?from=&to=&limit=&compare= | Readings in a date range (dates as yyyy-MM-dd, default limit 500) plus tree statistics; compare=true adds the linear scan timing |
| GET    | /api/history/{deviceId}/bounds                    | Oldest and newest stored reading time, count, tree height against the AVL maximum, and rotations so far                          |
| GET    | /api/mesh/topology                                | Vertices and links                                                                                                               |
| GET    | /api/mesh/state                                   | Every vertex's status, MST parent and BFS hop count                                                                              |
| GET    | /api/mesh/routes/{deviceId}                       | The device's three routes, hop by hop                                                                                            |
| GET    | /api/mesh/reachability?from=&zone=&subzone=       | Reachable, cut off and down counts per subzone, from the gateway or from the device in from                                      |
| GET    | /api/mesh/healing                                 | Each failed device's dependants and where they hop now                                                                           |
| POST   | /api/mesh/failures                                | Fails a device, point or subzone                                                                                                 |
| POST   | /api/mesh/failures/restore                        | Restores the same simulated failures                                                                                             |

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

| Issue                                            | Suggested fix                                                                                                                                                   |
| :----------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| start.bat says Docker is not running             | Start Docker Desktop and wait for **Engine running**                                                                                                            |
| Page loads but shows no data                     | Wait a minute for the first few batches. Then check docker compose logs backend and that <http://localhost:8080/health> responds                                |
| Backend logs Unknown device … telemetry dropped  | There is a known issue with the containers racing, wait for another readings pass as it should be self healing. If the problem persists restart the containers. |
| Port 3000, 8080, 1883 or 5432 already in use     | Stop the other program using that port, or change the left-hand port in docker-compose.yml                                                                      |
| Network map has no background                    | The map tiles load from the internet. Devices and routes still draw. Check your internet and reload for the base map                                            |
| Mesh shows devices missing or everything cut off | Wait for the provisioner to finish and one batch to pass. The topology rebuilds automatically when the device count changes                                     |

---

## Known limitations

- Histories, alerts, command history, simulated failures and the learned model are in memory, so they reset when the backend restarts.
- Telemetry uses MQTT QoS 0, so an occasional dropped packet can mark a device disconnected for one batch.
- Overrides are shown for a 3-batch window. Nothing is sent back to the simulated devices so no real change happens to that device.
- Building the topology compares every pair of devices. Not an issue at the 1200 device scale but could become slow with more devices.
- The map's background tiles need an internet connection.

---
