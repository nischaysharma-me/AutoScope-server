# REST API Reference

The AutoScope Server provides a RESTful JSON API for scanner registration, resumable chunked image uploading, artifact inspection, and health telemetry.

---

## Base URL
```
http://localhost:3000/api
```

---

## 1. Chunked Upload Pipeline

### 1.1 Initialize Upload Session
Create a new upload session before sending chunks.

- **URL**: `POST /api/uploads/init`
- **Body**:
  ```json
  {
    "originalFilename": "histopathology_specimen.png",
    "totalFileSize": 1995322,
    "totalChunks": 4,
    "scannerId": "SCN-101"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Upload session initialized successfully",
    "data": {
      "id": "6aaae3575a7dd1af9607221f",
      "scannerId": "SCN-101",
      "originalFilename": "histopathology_specimen.png",
      "totalFileSize": 1995322,
      "totalChunks": 4,
      "lastUploadedChunkIndex": -1,
      "uploadStatus": "IN_PROGRESS",
      "processingStatus": "QUEUED"
    }
  }
  ```

---

### 1.2 Upload Individual Chunk
Uploads an individual binary chunk file. When the final chunk arrives, the server automatically merges all chunks via streams, creates artifacts, and syncs to Amazon S3.

- **URL**: `POST /api/uploads/:id/chunk`
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `chunkIndex` (number, 0-indexed)
  - `chunk` (binary file)
- **Response (In-Progress)**:
  ```json
  {
    "success": true,
    "message": "Chunk 0 uploaded successfully",
    "data": {
      "uploadId": "6aaae3575a7dd1af9607221f",
      "chunkIndex": 0,
      "isComplete": false
    }
  }
  ```
- **Response (Final Chunk)**:
  ```json
  {
    "success": true,
    "message": "Final chunk uploaded and file merged successfully",
    "data": {
      "uploadId": "6aaae3575a7dd1af9607221f",
      "chunkIndex": 3,
      "isComplete": true,
      "completedFile": {
        "fileName": "6aaae3575a7dd1af9607221f_histopathology_specimen.png",
        "fileSize": 1995322,
        "downloadUrl": "/api/uploads/6aaae3575a7dd1af9607221f/file"
      }
    }
  }
  ```

---

### 1.3 Check Upload Session & Resumption Status
Query upload progress to resume after network failure.

- **URL**: `GET /api/uploads/:id/status`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "6aaae3575a7dd1af9607221f",
      "lastUploadedChunkIndex": 2,
      "uploadedChunksCount": 3,
      "uploadedChunkIndices": [0, 1, 2],
      "uploadStatus": "IN_PROGRESS"
    }
  }
  ```

---

### 1.4 Download / Stream Assembled File
Downloads the completed image. If the file has been purged from local disk, the server transparently fetches and streams the image from Amazon S3.

- **URL**: `GET /api/uploads/:id/file`
- **Response**: Binary image stream with headers:
  - `Content-Type: image/png`
  - `Content-Disposition: inline; filename="original_name.png"`

---

### 1.5 Inspect Raw Chunks on Disk
Lists all raw binary chunk files retained on disk for inspection and verification.

- **URL**: `GET /api/uploads/:id/chunks`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "uploadId": "6aaae3575a7dd1af9607221f",
      "totalChunks": 4,
      "chunks": [
        { "chunkIndex": 0, "sizeBytes": 524288, "existsOnDisk": true, "downloadUrl": "/api/uploads/6aaae3575a7dd1af9607221f/chunks/0" },
        { "chunkIndex": 1, "sizeBytes": 524288, "existsOnDisk": true, "downloadUrl": "/api/uploads/6aaae3575a7dd1af9607221f/chunks/1" }
      ]
    }
  }
  ```

---

### 1.6 Download Individual Chunk File
Downloads any specific chunk binary directly from disk.

- **URL**: `GET /api/uploads/:id/chunks/:chunkIndex`
- **Response**: Binary octet-stream of the exact chunk.

---

### 1.7 Query BullMQ Asynchronous Job Status
Checks the live processing state of a BullMQ worker job for a given upload session.

- **URL**: `GET /api/uploads/:id/job`
- **Response**:
  ```json
  {
    "success": true,
    "message": "Job status retrieved",
    "data": {
      "uploadId": "6aab81aac08203974bd0c4be",
      "bullmqJobId": "job-6aab81aac08203974bd0c4be",
      "processingStatus": "COMPLETED",
      "job": {
        "id": "job-6aab81aac08203974bd0c4be",
        "name": "process-specimen-scan",
        "state": "completed",
        "progress": 100,
        "failedReason": null,
        "returnvalue": {
          "fileName": "bullmq_specimen_scan.jpg",
          "fileSize": 1995322,
          "s3Location": "https://vectorstoretj.s3.ap-south-1.amazonaws.com/scans/..."
        }
      },
      "artifacts": [...]
    }
  }
  ```

---

### 1.8 BullMQ Queue Health & Scale Metrics
Returns the job distribution across queue lifecycle stages (`waiting`, `active`, `completed`, `failed`, `delayed`).

- **URL**: `GET /api/uploads/queue/metrics`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "queueName": "image-processing",
      "status": "UP",
      "counts": {
        "waiting": 0,
        "active": 0,
        "completed": 12,
        "failed": 0,
        "delayed": 0
      }
    }
  }
  ```

---

## 2. Scanners Fleet

### 2.1 List Scanners
- **URL**: `GET /api/scanners`

### 2.2 Register Scanner
- **URL**: `POST /api/scanners`
- **Body**:
  ```json
  {
    "deviceId": "SCN-201",
    "serialNumber": "SN-AUTOSCOPE-201",
    "name": "Cardiology Specimen Scanner",
    "currentVersion": "v1.0.0"
  }
  ```

### 2.3 Seed Default Scanners
- **URL**: `POST /api/scanners/seed`
- Seeds or resets 5 realistic lab scanners (`SCN-101` through `SCN-105`) into MongoDB.

---

## 3. Artifacts

### 3.1 List All Artifacts
- **URL**: `GET /api/artifacts`

### 3.2 List Artifacts for Upload
- **URL**: `GET /api/artifacts/upload/:uploadId`

---

## 4. System Health

- **URL**: `GET /api/health`
- **Response**: `{"status": "UP", "service": "AutoScope-server"}`
