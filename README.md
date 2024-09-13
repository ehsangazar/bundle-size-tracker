# Bundle Size Tracker

## Overview

The Bundle Size Tracker is an Express-based application designed to download JavaScript bundles from specified URLs, measure their sizes, and store this information in MongoDB. The application provides endpoints to trigger the bundling process and to retrieve historical bundle size data.

## Features

- **Fetch and Download Scripts:** Automatically fetch and download script files listed in an import map.
- **Measure and Store Sizes:** Measure the sizes of downloaded scripts and store this data in MongoDB.
- **Cleanup:** Periodically clean up old entries from the MongoDB collection based on a specified retention period.
- **Serve Static Files:** Serve a React application’s static files.
- **API Endpoints:**
  - `/bundle` - Trigger the bundling process and save bundle sizes.
  - `/analyser` - Retrieve historical bundle size data.

## Prerequisites

- [Node.js](https://nodejs.org/) (v14.x or later)
- [MongoDB](https://www.mongodb.com/) (or a MongoDB Atlas account)
- [npm](https://www.npmjs.com/) (Node Package Manager)
