# smart-x-poe
A school project for the module Prog7312. It simulates pipeline telemetry and presents it in an easy to digest, engaging way.

# Setup Guide

## Pre-requisites
- Docker Desktop installed and running. Can be found at: https://docs.docker.com/desktop/setup/install/windows-install/
- Node.js installed. Can be found atL: https://nodejs.org/en/download

## Step 1: System Requirements and Hardware Setup
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

## Step 2: Clone the repository and set up environmental variables
- Option 1: your terminal or PowerShell and clone the project:
    ```bash
    git clone https://github.com/EMKNPM/prog7312-prog7312-part-1-github-assignment-link-craftycrustacean
    cd smart-x-poe
    ```
- You can also just download the zip file of this repo or clone the repo in some other way.
- In the root directory (smart-x-poe) create a .env file and fill it out like the example. Alternatively you can simply remove ".example" from ".env.example" if you feel lazy.

## Step 3: Launch with Docker Compose
- Ensure Docker Desktop is open.
- Make sure you're in the smart-x-poe directory and run this command:
    ```bash
    docker compose up --build
    ```
- The terminal should display logs as they are simulated.

## Step 4: Start the Frontend
- Set your current directory to smart-x-poe/frontend
- Run the following command to start the webserver:
    ```bash
    npm install
    npm run dev
    ```
- You can access the frontend by navigating to "http://localhost:5173" on your browser.

## Step 5: Shut Down the Environment
- In the terminal press CTRL + C to stop the simulator and repeat for the webserver,
- To clean up container run:
    ```bash 
    docker compose down
    ```