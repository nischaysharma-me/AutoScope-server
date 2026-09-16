# Setup & Deployment Guide

This guide covers getting the AutoScope Server up and running locally or in production.

---

## Prerequisites
- **Node.js**: v18+ (Tested on v22.22)
- **MongoDB**: v5+ running locally or a MongoDB Atlas URI
- **AWS S3**: An active S3 bucket with IAM access credentials (optional: mock mode is supported)

---

## 1. Installation
Clone the repository and install dependencies:
```bash
git clone git@github.desktop.com:nischaysharma-me/AutoScope-server.git
cd AutoScope-server
npm install
```

---

## 2. Environment Variables (.env)
Create a `.env` file in the root directory (based on `.env.example`):
```ini
# Application Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://127.0.0.1:27017/autoscope

# AWS S3 Configuration
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET_NAME=your_bucket_name
AWS_S3_ENDPOINT=
AWS_S3_FORCE_PATH_STYLE=false
USE_S3_MOCK=false
```

---

## 3. Database Seeding
To populate MongoDB with realistic medical and pathology hardware scanners:
```bash
npm run seed
```
Or via HTTP request:
```bash
curl -X POST http://localhost:3000/api/scanners/seed
```

---

## 4. Starting the Server
- **Production Mode**:
  ```bash
  npm start
  ```
- **Development Watch Mode**:
  ```bash
  npm run dev
  ```

---

## 5. Accessing Interfaces
- **Interactive Single-Page Demo App**: [http://localhost:3000](http://localhost:3000)
- **Interactive Documentation Hub**: [http://localhost:3000/docs](http://localhost:3000/docs)
- **API Health Check**: [http://localhost:3000/api/health](http://localhost:3000/api/health)
