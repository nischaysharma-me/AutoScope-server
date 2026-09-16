# Entity Relationship Diagram (ERD)

## Overview
This document contains the Entity Relationship Diagram (ERD) and database schema specification for the image scanning, chunk upload, processing, device health telemetry, and OTA deployment platform.

---

## 1. Complete Entity Relationship Diagram

```mermaid
erDiagram
    APP_USER ||--o{ SCANNER_OTA_DEPLOYMENT : initiates
    APP_USER ||--o{ IMAGE_UPLOAD : views_or_manages
    SCANNER ||--o{ SCANNER_CERTIFICATE : has
    SCANNER ||--o{ SCANNER_HEALTH_CHECK : reports
    SCANNER ||--o{ SCANNER_OTA_DEPLOYMENT : receives
    OTA_PACKAGE ||--o{ SCANNER_OTA_DEPLOYMENT : deployed_via
    SCANNER ||--o{ IMAGE_UPLOAD : initiates
    IMAGE_UPLOAD ||--|{ CHUNK : contains
    IMAGE_UPLOAD ||--o| PROCESSED_IMAGE_METADATA : produces
    IMAGE_UPLOAD ||--o| THUMBNAIL_METADATA : produces

    APP_USER {
        uuid id PK
        string auth0_user_id UK "Auth0 'sub' claim"
        string email UK
        string user_type "system | device_admin | staff_member"
        boolean is_active
        timestamp last_login_at
        timestamp created_at
    }

    SCANNER {
        uuid id PK
        string device_id UK "Hardware Device Identifier"
        string serial_number UK
        string name
        string current_version "Active firmware version"
        string status "ACTIVE | UPDATING | REVOKED | DECOMMISSIONED"
        timestamp registered_at
    }

    SCANNER_HEALTH_CHECK {
        uuid id PK
        string device_id FK "References SCANNER(device_id)"
        float cpu_usage "CPU utilization % (0.0 - 100.0)"
        float temperature "Device core temperature in Celsius"
        bigint storage "Available storage in bytes"
        string version "Reported firmware version"
        timestamp recorded_at
    }

    SCANNER_CERTIFICATE {
        uuid id PK
        uuid scanner_id FK "References SCANNER(id)"
        string certificate_fingerprint UK "SHA-256 fingerprint"
        string subject_dn
        string issuer_dn
        timestamp valid_from
        timestamp valid_to
        boolean is_revoked
        timestamp revoked_at
    }

    OTA_PACKAGE {
        uuid id PK
        string version UK "Semantic version e.g., v2.5.0"
        string s3_bucket
        string s3_key
        string checksum "SHA-256 package hash"
        bigint file_size
        string release_notes
        boolean is_active
        timestamp created_at
    }

    SCANNER_OTA_DEPLOYMENT {
        uuid id PK
        uuid scanner_id FK "References SCANNER(id)"
        uuid ota_package_id FK "References OTA_PACKAGE(id)"
        uuid initiated_by_user_id FK "References APP_USER(id)"
        string previous_version
        string target_version
        string deployment_status "PENDING | DOWNLOADING | INSTALLING | HEALTH_CHECKING | APPLIED | ROLLED_BACK | FAILED"
        json health_check_summary "Snapshot of metrics during validation"
        string failure_reason "Error detail if rolled back or failed"
        timestamp initiated_at
        timestamp completed_at
    }

    IMAGE_UPLOAD {
        uuid id PK
        uuid scanner_id FK "References SCANNER(id)"
        string original_filename
        bigint total_file_size
        int total_chunks
        int last_uploaded_chunk_index "Last chunk index for resumption"
        string upload_status "IN_PROGRESS | COMPLETED | FAILED"
        string bullmq_job_id "BullMQ Job ID for async tracking"
        string processing_status "QUEUED | PROCESSING | COMPLETED | FAILED"
        timestamp created_at
        timestamp updated_at
    }

    CHUNK {
        uuid id PK
        uuid image_upload_id FK "References IMAGE_UPLOAD(id)"
        int chunk_index
        bigint chunk_size
        string checksum
        string storage_key
        string status "PENDING | UPLOADED"
        timestamp uploaded_at
    }

    PROCESSED_IMAGE_METADATA {
        uuid id PK
        uuid image_upload_id FK "References IMAGE_UPLOAD(id)"
        string s3_bucket
        string s3_key
        int width
        int height
        bigint file_size
        string format
        float processing_time_ms
        timestamp created_at
    }

    THUMBNAIL_METADATA {
        uuid id PK
        uuid image_upload_id FK "References IMAGE_UPLOAD(id)"
        string s3_bucket
        string s3_key
        int width
        int height
        bigint file_size
        string format
        timestamp created_at
    }
```

---

## 2. Table Specifications & Data Dictionary

### `APP_USER`
Stores dashboard users authenticated via Auth0.
- `id`: Unique identifier (UUID).
- `auth0_user_id`: Auth0 subject claim (`sub`) used to authenticate incoming JWT tokens.
- `email`: User email address.
- `user_type`: Role-based classification (`system`, `device_admin`, `staff_member`).
- `is_active`: Account status flag.

### `SCANNER`
Hardware scanner registry.
- `id`: Unique internal ID.
- `device_id`: Hardware unique ID sent by the scanner.
- `serial_number`: Device hardware serial.
- `current_version`: Currently running firmware/software version.
- `status`: Device operational state.

### `SCANNER_HEALTH_CHECK`
Periodic scanner telemetry received from hardware devices.
- `id`: Health check entry ID.
- `device_id`: Device identifier reporting metrics.
- `cpu_usage`: CPU usage percentage.
- `temperature`: Thermal measurement in °C.
- `storage`: Free disk space in bytes.
- `version`: Installed version during health check.
- `recorded_at`: Ingestion timestamp.

### `SCANNER_CERTIFICATE`
Tracks X.509 client certificates used for mTLS authentication.
- `certificate_fingerprint`: Unique fingerprint of the client cert.
- `valid_from` / `valid_to`: Certificate validity window.
- `is_revoked`: Revocation status flag.

### `OTA_PACKAGE` & `SCANNER_OTA_DEPLOYMENT`
Manages firmware distribution and rollback tracking.
- `OTA_PACKAGE`: Contains version, S3 location, and SHA-256 checksum of firmware builds.
- `SCANNER_OTA_DEPLOYMENT`: Records per-device rollout state (`HEALTH_CHECKING`, `APPLIED`, `ROLLED_BACK`), snapshot of health checks, and rollback reasons.

### `IMAGE_UPLOAD` & `CHUNK`
Coordinates chunked, resumable image uploads.
- `last_uploaded_chunk_index`: Allows the scanner to resume from the last saved chunk after connection interruption.
- `bullmq_job_id`: Links upload session to the asynchronous BullMQ processing job.

### `PROCESSED_IMAGE_METADATA` & `THUMBNAIL_METADATA`
Stores metadata returned from `libvips` after image transformations and direct S3 uploads.
- Holds S3 bucket, S3 key, dimensions (width, height), byte size, and format.
