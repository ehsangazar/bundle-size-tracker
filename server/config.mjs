import dotenv from "dotenv";
dotenv.config();

const config = {
  IMPORT_MAP: process.env.IMPORT_MAP,
  MONGODB: process.env.MONGODB,
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME,
  MONGODB_COLLECTION_NAME: process.env.MONGODB_COLLECTION_NAME,
  DAYS_TO_KEEP: process.env.DAYS_TO_KEEP,
  PORT: process.env.PORT,
};

export default config;
