## smart-x-poe
A school project for the module Prog7312. It simulates pipeline telemetry and presents it in an easy to digest, engaging way.

## Setup Guide

# Pre-requisites
- Docker Desktop installed and running. Can be found at: https://docs.docker.com/desktop/setup/install/windows-install/
- Git installed. Can be found at: https://git-scm.com/install/windows

# Step 1: System Requirements and Hardware Setup
- Check if hardware virtualisation is enabled.
	- Control + Shift + Esc will open task manager, click the performance tab (below the current default)
	- Look for the Virtualisation setting in the middle of the bottom right text block. It should be enabled.
	- If not enabled do so in your BIOS/UEFI settings.
- Enable Windows Features
	- Open PowerShell as Administrator and run: 
	```
	dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
	wsl --update
	```
	- Reboot your PC after running these commands.

# Step 2: Clone the repository
- Open your terminal or PowerShell and clone the project:
```bash
git clone https://github.com/your-org/smart-x-poe.git
cd smart-x-poe
```

# Step 3: Launch with Docker Compose
- Make sure you're in the smart-x-poe directory and run this command:
```bash
docker compose up --build
```
- The terminal should display logs as they are simulated.

# Step 4: Shut Down the Environment
- In the terminal press CTRL + C to stop the simulator
- To clean up container run:
```bash 
docker compose down
```