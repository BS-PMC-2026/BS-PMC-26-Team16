# Urban EV - Find A Charger Anywhere

A full-stack web application for electric vehicle owners  and electric vehicle charging point owners to discover, add, navigate to, and review EV charging stations.
Built by Team 16 as part of the BS-PMC-2026.

The platform supports three user roles:

## User Roles

### Customer
- Browse EV charging stations on the map
- Get navigation and directions to stations
- Save favorite charging locations
- Log charging visits
- Leave ratings and reviews

### Provider
- Register new charging stations
- Manage and update station information
- Monitor station activity
- Receive notifications when users visit their stations

### Admin
- Approve or reject new user registrations
- Approve or reject charging station submissions
- Manage all users in the system
- Manage all charging stations and platform data

> Note: New users and newly submitted charging stations must be approved by an administrator before becoming active on the platform.

## Technologies

| Component | Technology |
|-----------|------------|
| Framework | Next.js |
| UI | React + CSS |
| Database | Supabase |
| Maps | Google Maps API |
| Testing | Vitest + React Testing Library |

## Azure Deployment

The application can also be deployed to Microsoft Azure.
```
URL: https://urban-ev.azurewebsites.net
```

## Installation

### 1. Download and install Node.js

Verify the installation:

```bash
node --version
npm --version
```

Recommended versions:

- Node.js v18.x.x or higher
- npm v9.x.x or higher

### 2. Clone the repository and install dependencies

```bash
git clone https://github.com/BS-PMC-2026/BS-PMC-26-Team16.git
cd BS-PMC-26-Team16
npm install
```

`npm install` automatically installs all required project dependencies.

### 3. Run the application

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```
