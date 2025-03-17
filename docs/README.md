# Security Project Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Data Storage](#data-storage)
5. [Security Features](#security-features)
6. [Libraries and Dependencies](#libraries-and-dependencies)
7. [Installation and Setup](#installation-and-setup)
8. [API Documentation](#api-documentation)
9. [Backend Controllers](#backend-controllers)
10. [Data Storage Locations](#data-storage-locations)

## System Overview

This security project is a comprehensive network monitoring and threat detection system that combines real-time packet analysis, anomaly detection, and secure data storage. The system is built using a modern tech stack with Python for backend processing and Node.js for the web interface.

## Architecture

### Backend Architecture

The backend consists of two main components:

1. **Network Monitor (Python)**

   - Located in `ai/network_monitor.py`
   - Handles packet capture and analysis
   - Uses Scapy for packet processing
   - Implements machine learning for anomaly detection

2. **Server (Node.js)**
   - Located in `backend/`
   - Manages API endpoints
   - Handles data persistence
   - Controls the network monitor process

### Frontend Architecture

- React-based web interface
- Real-time data visualization
- Secure authentication system
- Interactive dashboard

## Components

### Network Monitor

- **Location**: `ai/network_monitor.py`
- **Functionality**:
  - Real-time packet capture using Scapy
  - Feature extraction from network packets
  - Anomaly detection using Isolation Forest
  - JSON-based data storage
- **Key Classes**:
  - `NetworkMonitor`: Main class for packet processing
  - `IsolationForest`: ML model for anomaly detection
  - `StandardScaler`: Data normalization

### Network Monitor Manager

- **Location**: `ai/manage.js`
- **Functionality**:
  - Process management for Python monitor
  - Data validation and backup
  - Error handling and recovery
  - API interface for frontend
- **Key Methods**:
  - `start()`: Launches monitor process
  - `stop()`: Terminates monitor
  - `getLatestData()`: Retrieves current data
  - `_validateData()`: Ensures data integrity

## Data Storage

### Packet Data

- **Location**: `data/packets.json`
- **Format**: JSON
- **Structure**:
  ```json
  {
    "packets": [
      {
        "timestamp": "ISO-8601 timestamp",
        "source": "IP address",
        "destination": "IP address",
        "protocol": "integer",
        "length": "integer",
        "ttl": "integer",
        "sport": "optional integer",
        "dport": "optional integer",
        "flags": "optional string"
      }
    ],
    "anomalies": [
      {
        "timestamp": "ISO-8601 timestamp",
        "source": "IP address",
        "destination": "IP address",
        "protocol": "integer",
        "anomaly_score": "float",
        "details": {
          "length": "integer",
          "ttl": "integer",
          "sport": "optional integer",
          "dport": "optional integer",
          "flags": "optional string"
        }
      }
    ],
    "lastUpdate": "ISO-8601 timestamp"
  }
  ```

### Backup System

- Automatic backup creation before updates
- Backup location: `data/packets.backup.json`
- Automatic recovery on corruption

## Security Features

### Packet Analysis

- Real-time packet inspection
- Protocol analysis
- Port monitoring
- TCP flag analysis

### Anomaly Detection

- Machine Learning based detection
- Feature extraction:
  - Packet length
  - Time-to-live (TTL)
  - Protocol type
  - Port numbers
  - TCP flags
- Isolation Forest algorithm
- Contamination factor: 0.1

### Data Protection

- JSON validation before write
- Atomic file operations
- Backup system
- Error recovery
- Sanitized inputs

## Libraries and Dependencies

### Python Dependencies

- **Scapy**: Network packet manipulation
- **pandas**: Data processing
- **numpy**: Numerical operations
- **scikit-learn**: Machine learning
  - IsolationForest
  - StandardScaler
- **logging**: Debug and error logging

### Node.js Dependencies

- **child_process**: Process management
- **path**: Path manipulation
- **fs**: File system operations
- **winston**: Logging system

## Installation and Setup

### Prerequisites

- Python 3.8+
- Node.js 14+
- npm or yarn
- Administrator privileges (for packet capture)

### Installation Steps

1. Clone the repository
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Install Node.js dependencies:
   ```bash
   cd backend
   npm install
   ```

### Configuration

1. Create required directories:
   ```bash
   mkdir -p data logs config
   ```
2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

### Running the System

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```
2. Start the network monitor:
   ```bash
   python ai/network_monitor.py
   ```

## API Documentation

### Network Monitor Endpoints

#### GET /api/network/status

- Returns monitor status
- Response: `{ "running": boolean }`

#### GET /api/network/data

- Returns latest packet data
- Response: Full packet and anomaly data

#### POST /api/network/start

- Starts the monitor
- Requires admin privileges

#### POST /api/network/stop

- Stops the monitor
- Requires admin privileges

### Error Handling

- All endpoints return appropriate HTTP status codes
- Error responses include:
  ```json
  {
    "error": "Error message",
    "code": "Error code",
    "details": "Additional details"
  }
  ```

## Logging and Debugging

### Log Files

- Network Monitor: `network_monitor.log`
- Backend Server: `backend.log`
- System Health: `health.log`

### Debug Features

- Detailed logging
- Stack traces
- Performance metrics
- Health checks

## Backend Controllers

### Security Controller

- **Location**: `backend/controllers/securityController.js`
- **Size**: 25KB (996 lines)
- **Functionality**:
  - Malware scanning and detection
  - System vulnerability assessment
  - Real-time threat monitoring
  - Process monitoring and analysis
- **Key Methods**:
  ```javascript
  - scanForMalware(): Scans system for malicious software
  - detectHackingAttempts(): Monitors for suspicious activities
  - checkVulnerabilities(): System vulnerability assessment
  - getSecurityStatus(): Current security state
  - checkPwnedEmail(): HaveIBeenPwned API integration
  - checkPwnedPassword(): Password breach checking
  ```
- **Features**:
  - Windows Defender integration
  - ClamAV integration
  - File entropy analysis
  - Process monitoring
  - Memory analysis
  - Signature-based detection

### Vault Controller

- **Location**: `backend/controllers/vaultController.js`
- **Size**: 10KB (437 lines)
- **Functionality**:
  - Secure data storage
  - Encryption/decryption
  - Access control
  - Item management
- **Key Methods**:
  ```javascript
  - getVaultItems(): Retrieve stored items
  - addVaultItem(): Store new items
  - updateVaultItem(): Modify existing items
  - deleteVaultItem(): Remove items
  - lockVault(): Secure the vault
  - unlockVault(): Access the vault
  ```
- **Security Features**:
  - AES-256 encryption
  - Secure key derivation (PBKDF2)
  - Auto-lock functionality
  - Backup management
  - Access logging

### Anomaly Controller

- **Location**: `backend/controllers/anomalyController.js`
- **Size**: 7.4KB (299 lines)
- **Functionality**:
  - Network traffic analysis
  - Anomaly detection
  - Pattern recognition
  - Alert generation
- **Key Methods**:
  ```javascript
  - detectAnomalies(): Identify suspicious patterns
  - getNetworkTraffic(): Current traffic data
  - getAnomalyHistory(): Historical anomalies
  - updateThreshold(): Adjust detection sensitivity
  - getSettings(): Anomaly detection configuration
  ```
- **Detection Features**:
  - Statistical analysis
  - Machine learning integration
  - Pattern matching
  - Threshold management
  - Historical trending

### Network Controller

- **Location**: `backend/controllers/networkController.js`
- **Size**: 5.9KB (227 lines)
- **Functionality**:
  - Network traffic monitoring
  - Connection tracking
  - Bandwidth analysis
  - Protocol analysis
- **Key Methods**:
  ```javascript
  - getNetworkTraffic(): Current traffic stats
  - getNetworkStats(): Detailed statistics
  - getTopTalkers(): Most active connections
  - calculateNetworkStats(): Traffic analysis
  - parseNetstatOutput(): Connection parsing
  ```
- **Monitoring Features**:
  - Bandwidth tracking
  - Protocol distribution
  - Connection statistics
  - Top talkers analysis
  - Real-time monitoring

### Port Scan Controller

- **Location**: `backend/controllers/portScanController.js`
- **Size**: 11KB (441 lines)
- **Functionality**:
  - Port scanning
  - Service detection
  - Vulnerability assessment
  - Port monitoring
- **Key Methods**:
  ```javascript
  - scanLocalPorts(): Local port scanning
  - scanCustomPorts(): Target-specific scanning
  - getScanHistory(): Previous scan results
  - getWhitelist(): Allowed ports
  - getBlacklist(): Blocked ports
  ```
- **Scanning Features**:
  - TCP/UDP scanning
  - Service fingerprinting
  - Port state detection
  - Rate limiting
  - Whitelist/blacklist management

### Settings Controller

- **Location**: `backend/controllers/settingsController.js`
- **Size**: 2.3KB (89 lines)
- **Functionality**:
  - System configuration
  - Feature management
  - User preferences
  - Security settings
- **Key Methods**:
  ```javascript
  - getSettings(): Retrieve current settings
  - updateSettings(): Modify configuration
  ```
- **Configuration Options**:
  ```javascript
  {
    "security": {
      "autoScan": boolean,
      "scanInterval": number,
      "notifications": boolean,
      "threatLevel": string
    },
    "network": {
      "monitoringEnabled": boolean,
      "portScanningEnabled": boolean,
      "anomalyDetection": boolean,
      "alertThreshold": number
    },
    "vault": {
      "autoLock": boolean,
      "lockTimeout": number,
      "backupEnabled": boolean,
      "backupInterval": number
    },
    "system": {
      "darkMode": boolean,
      "telemetryEnabled": boolean,
      "updateCheck": boolean,
      "logRetention": number
    }
  }
  ```

## Data Storage Locations

### Security Data

- **Malware Scans**: `data/security/scans/`
- **Threat Database**: `data/security/threats.json`
- **Vulnerability Reports**: `data/security/vulnerabilities/`

### Vault Data

- **Encrypted Items**: `data/vault/items.enc`
- **Vault Config**: `data/vault/config.json`
- **Backups**: `data/vault/backups/`

### Network Data

- **Packet Captures**: `data/network/captures/`
- **Traffic Stats**: `data/network/stats.json`
- **Anomaly Logs**: `data/network/anomalies/`

### Port Scan Data

- **Scan Results**: `data/portscan/results/`
- **Whitelist**: `data/portscan/whitelist.json`
- **Blacklist**: `data/portscan/blacklist.json`

### System Settings

- **Main Config**: `data/settings.json`
- **User Preferences**: `data/user_prefs.json`
- **Feature Flags**: `data/features.json`
