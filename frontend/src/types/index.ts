// Security Types
export interface SecurityStatus {
  malwareProtection: {
    status: "active" | "inactive";
    lastScan: string;
    threats: number;
  };
  firewall: {
    status: "enabled" | "disabled";
    connections: number;
    blocked: number;
  };
  activeThreats: {
    count: number;
    severity: "low" | "medium" | "high" | "critical";
  };
  encryption: {
    status: "active" | "inactive";
    type: string;
    strength: string;
  };
}

export interface ScanResult {
  windowsDefender: {
    status: "enabled" | "disabled";
    upToDate: boolean;
    lastUpdate: string;
    threats: Array<{
      name: string;
      path: string;
      type: string;
      severity: string;
    }>;
  };
  clamAV: {
    infected: boolean;
    detections: string[];
  };
  systemStatus: {
    cpu: number;
    memory: {
      total: number;
      used: number;
      free: number;
    };
    suspiciousProcesses: Array<{
      pid: number;
      name: string;
      cpu: number;
      memory: number;
    }>;
  };
}

// Network Types
export interface NetworkTraffic {
  timestamp: string;
  packets: number;
  bytes: number;
  connections: number;
  protocols: Record<string, number>;
  sourceIPs: Array<{ ip: string; count: number }>;
  destinationIPs: Array<{ ip: string; count: number }>;
}

export interface Anomaly {
  id: string;
  timestamp: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  sourceIP: string;
  destinationIP: string;
  protocol: string;
  port: number;
  status: "active" | "resolved" | "dismissed";
}

export interface PortScanResult {
  port: number;
  status: "open" | "closed" | "filtered";
  service?: string;
  risk: "low" | "medium" | "high";
}

// Vault Types
export interface VaultItem {
  id: string;
  name: string;
  type: string;
  data: {
    value: string;
  };
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface VaultStatus {
  locked: boolean;
  itemCount: number;
  encryptionType: string;
  lastAccess: string;
  key?: string;
  salt: string;
}

export interface VaultItemInput {
  name: string;
  type: string;
  data: {
    value: string;
  };
  tags: string[];
}

// Analytics Types
export interface Analytics {
  securityMetrics: {
    threatsBlocked: number;
    scanCount: number;
    vulnerabilitiesFound: number;
    lastScanDuration: number;
  };
  networkMetrics: {
    totalTraffic: number;
    anomaliesDetected: number;
    blockedConnections: number;
    averageLatency: number;
  };
  vaultMetrics: {
    totalItems: number;
    lastBackup: string;
    accessCount: number;
    storageUsed: number;
  };
  systemMetrics: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    uptime: number;
  };
}
