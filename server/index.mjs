import config from "./config.mjs";
import express from "express";
import path from "path";
import { mkdir, writeFile, stat, rm } from "fs/promises";
import fetch from "node-fetch";
import cors from "cors";
import client from "./mongodb.mjs";

// MongoDB Setup
const dbName = config.MONGODB_DB_NAME;
const collectionName = config.MONGODB_COLLECTION_NAME;

const app = express();
const PORT = config.PORT || 3000; // Port where the app will run

// Middleware
app.use(cors());
app.use(express.static(path.join(process.cwd(), "dist")));

// URL of the import map JSON
const importMapUrl = config.IMPORT_MAP;

// Function to fetch JSON file
async function fetchImportMap(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching import map: ${error.message}`);
  }
}

// Function to download a script file
async function downloadScript(url, outputPath) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const buffer = await response.buffer();
    await writeFile(outputPath, buffer);
    const fileSize = (await stat(outputPath)).size;
    console.log(`Downloaded: ${outputPath} (${fileSize} bytes)`);
    return fileSize;
  } catch (error) {
    console.error(`Error downloading script: ${error.message}`);
    return null;
  }
}

// Function to extract app name from URL
function extractAppName(url) {
  const match = url.match(/([^/]+)-app/);
  return match ? match[0] : "unknown-app";
}

// Function to delete the 'bundle' folder
async function deleteBundleFolder(bundleDir) {
  try {
    await rm(bundleDir, { recursive: true, force: true });
    console.log(`Deleted 'bundle' folder: ${bundleDir}`);
  } catch (error) {
    console.error(`Error deleting 'bundle' folder: ${error.message}`);
  }
}

// Function to clean up old entries in MongoDB
async function cleanOldEntries(collection) {
  const daysOld = config.DAYS_TO_KEEP; // Days old for cleaning
  const now = new Date();
  const cutoffDate = new Date(now.setDate(now.getDate() - daysOld));

  try {
    await collection.deleteMany({ date: { $lt: cutoffDate } });
    console.log(`Deleted old entries older than ${daysOld} days`);
  } catch (error) {
    console.error(`Error cleaning old entries: ${error.message}`);
  }
}

// Function to handle the bundling and size report generation
async function generateBundle() {
  const importMap = await fetchImportMap(importMapUrl);
  if (!importMap || !importMap.imports) return;

  // Create 'bundle' directory if it doesn't exist
  const bundleDir = path.join(process.cwd(), "bundle");
  await mkdir(bundleDir, { recursive: true });

  // Get all the script URLs from the imports
  const scriptUrls = Object.values(importMap.imports);
  const scriptSizes = {};

  // Download each script and save its size
  for (const url of scriptUrls) {
    const fileName = path.basename(url);
    const outputPath = path.join(bundleDir, fileName);
    const fileSize = await downloadScript(url, outputPath);

    if (fileSize !== null) {
      const appName = extractAppName(url);
      const sizeInKB = (fileSize / 1024).toFixed(2); // Convert size to KB
      scriptSizes[appName] = `${sizeInKB} KB`; // Store the size in KB
    }
  }

  // Generate the filename with the current datetime
  const dateTime = new Date().toISOString();
  const bundleData = {
    date: new Date(),
    sizes: scriptSizes,
  };

  try {
    // Connect to MongoDB
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Insert the new bundle sizes into MongoDB
    await collection.insertOne(bundleData);
    console.log(`Bundle sizes saved to MongoDB`);

    // Clean up old entries in MongoDB
    await cleanOldEntries(collection);
  } catch (error) {
    console.error(`Error saving bundle sizes to MongoDB: ${error.message}`);
  } finally {
    await client.close();
  }

  // Delete the 'bundle' folder after processing
  await deleteBundleFolder(bundleDir);

  return bundleData;
}

// Endpoint to trigger bundling and reporting
app.get("/bundle", async (req, res) => {
  try {
    const bundleData = await generateBundle();
    res
      .status(200)
      .send(
        `Scripts downloaded and sizes saved: ${JSON.stringify(bundleData)}`
      );
  } catch (error) {
    res.status(500).send("Error generating bundle: " + error.message);
  }
});

// Endpoint to get all JSON files in 'bundleSize' folder, sorted by date
app.get("/analyser", async (req, res) => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Retrieve all entries from MongoDB
    const entries = await collection.find().sort({ date: -1 }).toArray();
    res.status(200).json(entries);
  } catch (error) {
    res.status(500).send("Error reading bundle sizes: " + error.message);
  } finally {
    await client.close();
  }
});

// Serve static files from React build
app.get("*", (req, res) => {
  res.sendFile(path.join(process.cwd(), "dist", "index.html"));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
