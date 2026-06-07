# Urban EV - Find A Charger Anywhere

A full-stack web application for electric vehicle owners to discover, navigate to, and review EV charging stations. Built by Team 16 as part of the BS-PMC-2026.

The platform supports three user roles:

- **Customer** - browse map, get directions, save favorites, log visits, and leave reviews.
- **Provider** - register and manage charging stations and receive visit notifications.
- **Admin** - approve user registrations and station submissions, manage all users and charging points.

New users and new stations require admin approval before becoming active.

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
```URL

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
