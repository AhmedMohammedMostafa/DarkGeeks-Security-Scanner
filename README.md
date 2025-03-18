# DarkGeeks Security Scanner

A comprehensive network security monitoring and threat detection system combining real-time packet analysis, anomaly detection, and secure data storage.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Core Features](#core-features)
3. [Component Integration](#component-integration)
4. [Data Storage Structure](#data-storage-structure)
5. [Security Features](#security-features)
6. [Installation](#installation)
7. [Configuration](#configuration)
8. [API Documentation](#api-documentation)
9. [Logging System](#logging-system)

## System Architecture

### Backend Components

1. **Network Monitor (Python)**

   - Location: `ai/network_monitor.py`
   - Purpose: Real-time packet analysis and anomaly detection
   - Features:
     - Packet capture using Scapy
     - ML-based anomaly detection
     - TCP/UDP traffic analysis
     - Protocol analysis
   - Data Storage: `data/packets.json`

2. **Security Server (Node.js)**
   - Location: `backend/`
   - Controllers:
     - `portScanController.js`: Port scanning and risk assessment
     - `securityController.js`: Malware detection and system security
     - `vaultController.js`: Secure data storage
     - `anomalyController.js`: Anomaly processing
     - `networkController.js`: Network traffic analysis
     - `settingsController.js`: System configuration

### Frontend Architecture

- Next.js-based web interface
- Real-time data visualization
- Interactive dashboard
- Secure authentication

## Core Features

### 1. Port Scanning System

#### Implementation Details

```javascript
const scanOptions = [
  "-p-", // All 65535 ports
  "-T4", // Aggressive timing
  "-sV", // Version detection
  "--version-intensity 5", // Deep version detection
  "--min-rate=1000", // Minimum rate of packets/sec
  "--max-retries=2", // Maximum retry attempts
];
```

#### Risk Assessment Levels

1. **High Risk Ports**

   - System ports (0-20)
     - Reason: Critical system services
   - NetBIOS (135-139)
     - Reason: Common attack vector
   - SMB (445)
     - Reason: File sharing vulnerabilities
   - RDP (3389)
     - Reason: Remote access risks
   - VNC (5900-5902)
     - Reason: Remote control vulnerabilities

2. **Medium Risk Ports**

   - FTP (20, 21)
     - Reason: Unencrypted file transfer
   - SMTP (25)
     - Reason: Email server risks
   - HTTP (80)
     - Reason: Web server exposure
   - Development ports (3000, 5000)
     - Reason: Potential debug endpoints

3. **Low Risk Ports**
   - SSH (22)
     - Reason: Secure encrypted protocol
   - HTTPS (443)
     - Reason: Encrypted web traffic
   - Dynamic ports (49152-65535)
     - Reason: Temporary allocations

#### Risk Calculation Method

```javascript
function assessRisk(port, status, serviceInfo) {
  if (status === "blacklisted") return "high";
  if (status === "whitelisted") return "low";

  const portNum = parseInt(port);
  const info = serviceInfo || getPortInfo(portNum);

  // High-risk port ranges check
  const highRiskRanges = [
    [0, 20], // System ports
    [135, 139], // NetBIOS
    [445, 445], // SMB
    [3389, 3389], // RDP
    [5900, 5902], // VNC
  ];

  const isHighRisk = highRiskRanges.some(
    ([start, end]) => portNum >= start && portNum <= end
  );

  if (isHighRisk) return "high";
  if (info.risk) return info.risk;

  return "medium";
}
```

### 2. Malware Detection System

#### Detection Methods

1. **Signature-Based Detection**

   ```javascript
   const MALWARE_SIGNATURES = new Set([
     // Ransomware signatures
     "e1112134b6dcc8bed54e0e34d8ac272795e73d74",
     // Emotet signatures
     "2f54d647b6b96d60f6d9a1607516384c",
     // TrickBot signatures
     "fc1f1845e47d4494a02d3f4d731c6ee0",
   ]);
   ```

2. **Pattern Matching**

   ```javascript
   const SUSPICIOUS_PATTERNS = [
     // Code execution
     /eval\s*\(/i,
     /exec\s*\(/i,
     // PowerShell suspicious commands
     /invoke-expression/i,
     /downloadstring/i,
     // Registry modifications
     /reg\s+add/i,
     /registry::\s*hkey/i,
   ];
   ```

3. **File Analysis**
   - Entropy calculation for encryption detection
   - Magic bytes verification
   - Extension validation
   - Size analysis

#### Severity Classification

1. **Critical**

   - Matched known malware signatures
   - Active malware processes
   - System compromise indicators
   - Threshold: Direct signature match

2. **High**

   - Suspicious executables
   - High entropy files (> 7.5)
   - Unauthorized system changes
   - Threshold: Multiple detection methods

3. **Medium**

   - Unusual network connections
   - Modified system files
   - Suspicious scripts
   - Threshold: Single detection method

4. **Low**
   - Minor anomalies
   - Non-critical modifications
   - Potential misconfigurations
   - Threshold: Pattern match only

### 3. Anomaly Detection (AI)

#### Network Monitor Implementation

```python
class NetworkMonitor:
    def __init__(self):
        self.model = IsolationForest(
            contamination=0.1,  # 10% anomaly rate
            random_state=42
        )
        self.scaler = StandardScaler()
        self.packets = []  # Max 1000 packets in memory
```

#### Feature Extraction

```python
def extract_features(self, df):
    features = pd.DataFrame({
        'packet_length': df['length'],
        'ttl': df['ttl'],
        'protocol': df['protocol_num'],
        'source_port': df['sport'].fillna(-1),
        'dest_port': df['dport'].fillna(-1),
        'tcp_flags': df['flags'].apply(flag_to_numeric)
    })
    return features
```

#### TCP Flags Analysis

```python
flag_values = {
    'F': 0x01,  # FIN
    'S': 0x02,  # SYN
    'R': 0x04,  # RST
    'P': 0x08,  # PSH
    'A': 0x10,  # ACK
    'U': 0x20,  # URG
    'E': 0x40,  # ECE
    'C': 0x80   # CWR
}
```

#### Thresholds

- Contamination: 0.1 (10% of data considered anomalous)
- Minimum Packets: 10 (required for analysis)
- Memory Limit: 1000 packets
- Save Interval: 10 seconds

### 4. Vault System

#### Encryption Implementation

1. **Key Derivation**

   ```javascript
   const keyParams = {
     iterations: 100000,
     keyLength: 32,
     digest: "sha512",
   };
   ```

2. **Data Encryption**

   - Algorithm: AES-256-GCM
   - IV Size: 16 bytes
   - Auth Tag: 16 bytes

3. **Security Measures**
   - Auto-lock after 15 minutes
   - Max failed attempts: 5
   - Session timeout: 1 hour
   - Backup frequency: Before each modification

### 5. Network Analysis

#### Protocol Analysis

1. **TCP Flags**

   - SYN (0x02): Connection initiation
   - ACK (0x10): Acknowledgment
   - FIN (0x01): Connection termination
   - RST (0x04): Connection reset
   - PSH (0x08): Push data
   - URG (0x20): Urgent data

2. **Connection States**

   - ESTABLISHED
   - TIME_WAIT
   - CLOSE_WAIT
   - SYN_SENT
   - SYN_RECV
   - FIN_WAIT1/2
   - CLOSING
   - LAST_ACK

3. **Top Talkers Analysis**
   - Packet count threshold: > 1000
   - Bandwidth threshold: > 1MB/s
   - Connection frequency: > 100/min

## Component Integration

### Data Flow

1. **Packet Capture → Analysis**

   ```
   Network Monitor → Packets.json → Anomaly Controller → Security Analysis
   ```

2. **Security Scanning**

   ```
   Port Scanner → Risk Assessment → Security Controller → Alert System
   ```

3. **Vault Operations**
   ```
   User Input → Encryption → Secure Storage → Access Control
   ```

## Data Storage Structure

### 1. Network Data

- Location: `data/network/`
  - `packets.json`: Current packet data
  - `history/`: Historical packet data
  - `anomalies/`: Detected anomalies
  - `stats/`: Network statistics

### 2. Security Data

- Location: `data/security/`
  - `scans/`: Port scan results
  - `threats/`: Detected threats
  - `malware/`: Malware analysis results
  - `reports/`: Security reports

### 3. Vault Data

- Location: `data/vault/`
  - `items.enc`: Encrypted vault items
  - `config.json`: Vault configuration
  - `backups/`: Automatic backups

### 4. System Data

- Location: `data/system/`
  - `settings.json`: System configuration
  - `metrics/`: Performance metrics
  - `logs/`: System logs

## Logging System

### Log Categories

1. **Security Logs**

   - Location: `logs/security/`
   - Contents:
     - Threat detections
     - Scan results
     - Access attempts
     - System changes

2. **Network Logs**

   - Location: `logs/network/`
   - Contents:
     - Packet statistics
     - Anomaly detections
     - Connection tracking
     - Protocol analysis

3. **System Logs**
   - Location: `logs/system/`
   - Contents:
     - Performance metrics
     - Error tracking
     - Component status
     - Health checks

### Log Rotation

- Maximum size: 10MB per file
- Retention: 30 days
- Compression: gzip
- Backup: Daily

## Installation

### Prerequisites

- Python 3.8+
- Node.js 14+
- npm or yarn
- Administrator privileges

### Setup Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/AhmedMohammedMostafa/DarkGeeks-Security-Scanner.git
   ```

2. Install Python dependencies:

   ```bash
   cd ai
   pip install -r requirements.txt
   ```

3. Install Node.js dependencies:

   ```bash
   cd backend
   npm install
   cd ../frontend
   npm install
   ```

4. Configure environment:

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   cp ai/.env.example ai/.env
   ```

5. Initialize directories:
   ```bash
   mkdir -p data/{network,security,vault,system}
   mkdir -p logs/{security,network,system}
   ```

## Configuration

### Environment Variables

1. **Backend (.env)**

   ```env
   PORT=5000
   NODE_ENV=development
   JWT_SECRET=your_secret
   ENCRYPTION_KEY=your_key
   ```

2. **Frontend (.env.local)**

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   NEXT_PUBLIC_WS_URL=ws://localhost:5000
   ```

3. **AI (.env)**
   ```env
   NETWORK_INTERFACE=eth0
   ANOMALY_THRESHOLD=0.8
   MAX_PACKETS=1000
   ```

## Running the System

1. Start the backend:

   ```bash
   cd backend
   npm run dev
   ```

2. Start the network monitor:

   ```bash
   cd ai
   python network_monitor.py
   ```

3. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```
