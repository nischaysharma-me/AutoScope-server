# System Architecture

## Overview
This document specifies the system architecture for an image scanning, resumable chunked upload, asynchronous processing pipeline with **libvips**, S3 storage, certificate-based scanner authentication, Auth0 dashboard authentication, device health monitoring, and OTA update rollback capabilities.

---

## 1. High-Level Architecture Diagram

```mermaid
flowchart TD
    %% Users & Authentication
    subgraph Users["User Types & Roles (Dashboard / Auth0)"]
        SysAdmin["System User\n(Full Platform & Infrastructure Access)"]
        DevAdmin["Device Admin\n(Scanner Fleet, Health & OTA)"]
        Staff["Staff Member\n(Image Review & Processing Status)"]
        Auth0["Auth0 Identity Provider\n(Roles: system, device_admin, staff_member)"]

        SysAdmin & DevAdmin & Staff <-->|"Authenticate & Receive Role JWT"| Auth0
    end

    subgraph ScannerClient["Scanner Device Layer"]
        Scanner["Scanner Hardware\n(A/B Partitions for OTA)"]
        Chunker["Chunking & Checksum Engine"]
        Scanner --> Chunker
    end

    %% Security & Ingress Layer
    subgraph SecurityGateway["API Gateway / Security Layer"]
        JWTValidator["Auth0 JWT & RBAC Validator\n(system / device_admin / staff_member)"]
        CertValidator["mTLS Client Cert Validator\n(X.509 Device Certificates)"]
    end

    SysAdmin & DevAdmin & Staff -->|"Bearer JWT (user_type)"| JWTValidator
    Scanner -->|"mTLS Handshake"| CertValidator

    %% Backend & Queue Infrastructure
    subgraph BackendLayer["Backend & Queue Infrastructure"]
        Backend["Backend API"]
        DB[("Database (PostgreSQL / Relational)")]
        Redis[("Redis")]
        BullMQ_Producer["BullMQ Producer"]
        BullMQ_Worker["BullMQ Worker"]

        Backend <-->|"State, Certs, Telemetry, OTA & Metadata"| DB
        Backend -->|"Upload complete -> Enqueue job"| BullMQ_Producer
        BullMQ_Producer -->|"Push job"| Redis
        Redis -->|"Consume job"| BullMQ_Worker
    end

    %% Scanner Communication
    CertValidator -->|"Authenticated Scanner Traffic"| Backend
    Chunker -->|"1. Async chunk upload & progress resume"| CertValidator
    Scanner -.->|"Heartbeat & Telemetry (CPU, Temp, Storage, Version)"| CertValidator

    %% Dashboard Role Access
    JWTValidator -->|"Device Admin / System: Manage Fleet & Trigger OTA"| Backend
    JWTValidator -->|"Staff / System: View Uploads, Processed Images & Thumbnails"| Backend

    %% Processing Layer
    subgraph ProcessingLayer["Processing Compute (ECS Fargate / EC2)"]
        Libvips["libvips Processing Service (Self-Deployed)"]
        BullMQ_Worker -->|"2. Dispatch image asynchronously"| Libvips
    end

    %% Storage Layer
    subgraph StorageLayer["Storage Layer (Amazon S3)"]
        S3_Images[("S3: Processed Images & Thumbnails")]
        S3_OTA[("S3: OTA Firmware Packages")]
    end

    %% Storage & Metadata Return
    Libvips -->|"3. Store processedImage"| S3_Images
    Libvips -->|"4. Store thumbnail"| S3_Images
    Libvips -->|"5. Send metadata back"| Backend
    Backend -->|"6. Persist metadata"| DB
    Backend <-->|"Manage OTA Releases"| S3_OTA
```

---

## 2. Component Workflows

### 2.1 Chunking & Resumable Async Upload (Part 1)
1. **Image Partitioning**: Scanner divides large, high-resolution scans into chunks.
2. **Session / Resume Verification**: Scanner queries the Backend API using image identifiers. If previous transmission failed, Backend returns `last_uploaded_chunk_index` to resume without restarting from scratch.
3. **Async Upload**: Scanner uploads chunks asynchronously, with each chunk receipt updating progress in the database.

### 2.2 Async Event Queue & libvips Compute (Part 2)
1. **BullMQ Enqueue**: When the final chunk is received, the Backend acknowledges the client and pushes an image processing job into **BullMQ** (persisted in **Redis**).
2. **libvips Dispatch**: The **BullMQ Worker** consumes the task and dispatches the raw image asynchronously to the self-deployed **`libvips`** service on **AWS ECS Fargate / EC2**.

### 2.3 Storage & Metadata Persistence (Part 3)
1. **Output Generation**: `libvips` creates `processedImage` and `thumbnail`.
2. **Direct S3 Upload**: `libvips` uploads both image assets directly to **Amazon S3**.
3. **Metadata Callback**: `libvips` sends image dimensions, sizes, formats, and S3 keys back to the Backend API.
4. **Database Persistence**: Backend saves the image metadata into the database.

---

## 3. Security & Authentication Architecture

- **Scanner Device**: Authenticates over mutual TLS (**mTLS**) using device-specific X.509 client certificates. Validated at the API Gateway / Reverse Proxy.
- **Dashboard Users**: Authenticate through **Auth0** (OIDC/OAuth2) with Bearer JWT tokens. RBAC roles enforced:
  - `system`: Unrestricted platform access and auditing.
  - `device_admin`: Scanner fleet provisioning, health tracking, and OTA updates.
  - `staff_member`: Access to scan workflows, thumbnails, and processed images.

---

## 4. OTA (Over-The-Air) Update & Health Validation Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Device Admin / System
    participant Backend as Backend API
    participant S3 as Amazon S3 (OTA)
    participant Scanner as Scanner Hardware (A/B Partition)
    participant DB as Database

    Admin->>Backend: Trigger OTA Release
    Backend->>S3: Upload / Locate Firmware Binary
    Backend->>Scanner: Notify / Serve Update Metadata
    Scanner->>Backend: Download Update Package
    Scanner->>Scanner: Verify Checksum & Install to Inactive Partition
    Scanner->>Scanner: Reboot into New Version
    Scanner->>Scanner: Run Health Checks (CPU, Temp, Storage, Version)
    
    alt Health Metrics PASS
        Scanner->>Scanner: Mark New Partition as Active
        Scanner->>Backend: Report OTA Status: APPLIED
        Backend->>DB: Update Scanner Status & Version
    else Health Metrics FAIL
        Scanner->>Scanner: Roll back to Previous Stable Partition
        Scanner->>Backend: Report OTA Status: ROLLED_BACK (Failure Reason)
        Backend->>DB: Record Rollback Incident & Alert Admin
    end
```
