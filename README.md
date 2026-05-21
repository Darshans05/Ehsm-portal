# EHSM Portal

Enterprise Health & Safety Management Portal - A full-stack web application for managing incidents, risks, and health & safety operations.

## Project Structure

- **backend/** - Node.js Express server with SAP integration
  - `server.js` - Backend entry point
  - `config/` - Configuration files (SAP config)
  - `controllers/` - Route controllers (incidents, login, risks)
  - `middleware/` - Middleware components (error handling)
  - `routes/` - API route definitions
  - `services/` - Business logic services (SAP service)

- **webapp/** - SAPUI5 frontend application
  - `Component.js` - SAPUI5 component definition
  - `index.html` - Application entry point
  - `manifest.json` - Application manifest
  - `controller/` - UI controllers (App, Dashboard, Incident, Login, Risk)
  - `view/` - XML view definitions
  - `model/` - Data models and mock data
  - `utils/` - Utility functions (Formatter)
  - `css/` - Styling
  - `i18n/` - Internationalization resources

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Installation

### Backend Setup
```bash
cd backend
npm install
```

### Frontend Setup
```bash
cd webapp
npm install
```

## Running the Application

### Start Backend Server
```bash
cd backend
npm start
```
The backend server will run on the configured port.

### Start Frontend
```bash
cd webapp
npm start
```

## Features

- **Incident Management** - Track and manage incidents
- **Risk Management** - Monitor and assess risks
- **User Authentication** - Secure login system
- **SAP Integration** - Enterprise data synchronization
- **Dashboard** - Overview of key metrics and information

## Configuration

Backend configuration is located in `backend/config/sapConfig.js`. Update SAP connection details as needed.

## License

Proprietary
