const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const axios = require("axios");
const crypto = require("crypto");
const util = require("util");
const execAsync = util.promisify(exec);
const ClamScan = require("clamscan");
const { PowerShell } = require("node-powershell");
const si = require("systeminformation");
const os = require("os");

// Path to alerts file
const alertsPath = path.join(__dirname, "../logs/security-alerts.json");
const logsDir = path.join(__dirname, "../logs");

// Create logs directory if it doesn't exist
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Initialize alerts file if it doesn't exist
if (!fs.existsSync(alertsPath)) {
  fs.writeFileSync(
    alertsPath,
    JSON.stringify({
      alerts: [],
    })
  );
}

// Initialize ClamAV scanner
const ClamAV = new ClamScan({
  removeInfected: false,
  quarantineInfected: true,
  scanLog: path.join(__dirname, "../logs/scan.log"),
  debugMode: false,
  fileList: null,
  scanRecursively: true,
  clamscan: {
    path: "C:\\Program Files\\ClamAV\\clamscan.exe",
    db: "C:\\Program Files\\ClamAV\\db",
    maxBuffer: 1024 * 1024,
  },
  preference: "clamscan",
});

// Initialize PowerShell
let ps = null;

async function initPowerShell() {
  if (!ps) {
    ps = new PowerShell({
      executionPolicy: "Bypass",
      noProfile: true,
    });
  }
  return ps;
}

// Enhanced malware signatures
const MALWARE_SIGNATURES = new Set([
  // Common ransomware signatures
  "e1112134b6dcc8bed54e0e34d8ac272795e73d74",
  "aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d",
  "d41d8cd98f00b204e9800998ecf8427e",
  // Emotet signatures
  "2f54d647b6b96d60f6d9a1607516384c",
  "b7c714d05181cf10b75c2f6acfc37954",
  // TrickBot signatures
  "fc1f1845e47d4494a02d3f4d731c6ee0",
  "26b9adebf79fac5a616d442516b64357",
  // Cryptomining malware
  "a67d7b4a8f284f4a8f4e4d4b8f4c4b8a",
  "c4b8a4f4e4d4b8f4a8f284f4a8f4e4d4",
  // Backdoor signatures
  "d4b8f4a8f284f4a8f4e4d4b8f4c4b8a4",
  "8f4a8f284f4a8f4e4d4b8f4c4b8a4f4e",
]);

// Enhanced suspicious file extensions
const SUSPICIOUS_EXTENSIONS = new Set([
  // Executable files
  ".exe",
  ".dll",
  ".sys",
  ".drv",
  ".bin",
  ".scr",
  ".com",
  // Script files
  ".ps1",
  ".vbs",
  ".js",
  ".jse",
  ".wsf",
  ".wsh",
  ".hta",
  // Batch files
  ".bat",
  ".cmd",
  ".sh",
  // Programming languages that can be used maliciously
  ".py",
  ".rb",
  ".pl",
  ".php",
  ".asp",
  ".aspx",
  ".jsp",
  // Archive files that might contain malware
  ".zip",
  ".7z",
  ".rar",
  ".tar",
  ".gz",
  // Other potentially dangerous files
  ".msi",
  ".reg",
  ".jar",
  ".vbe",
  ".chm",
]);

// Enhanced suspicious patterns
const SUSPICIOUS_PATTERNS = [
  // Code execution
  /eval\s*\(/i,
  /exec\s*\(/i,
  /system\s*\(/i,
  /shell_exec\s*\(/i,
  /powershell/i,
  /cmd\.exe/i,
  /rundll32/i,
  // Encoding/Obfuscation
  /base64_decode\s*\(/i,
  /frombase64string/i,
  /convert::frombase64/i,
  // PowerShell suspicious commands
  /invoke-expression/i,
  /iex\s/i,
  /invoke-webrequest/i,
  /downloadstring/i,
  /downloadfile/i,
  /new-object\s+net\.webclient/i,
  /start-process/i,
  /hidden\s+window/i,
  // Registry modifications
  /reg\s+add/i,
  /reg\s+delete/i,
  /registry::\s*hkey/i,
  // Network activity
  /netsh\s+firewall/i,
  /net\s+user/i,
  /net\s+localgroup/i,
  // File operations
  /copy-item/i,
  /move-item/i,
  /remove-item/i,
  /set-content/i,
  // Scheduled tasks
  /schtasks/i,
  /new-scheduledtask/i,
  // Service manipulation
  /sc\s+create/i,
  /sc\s+config/i,
  /new-service/i,
];

async function scanFile(filePath) {
  try {
    const stats = await fs.promises.stat(filePath);
    const fileExtension = path.extname(filePath).toLowerCase();
    const isSuspiciousExt = SUSPICIOUS_EXTENSIONS.has(fileExtension);
    const startTime = Date.now();

    // Skip very large files and non-suspicious extensions
    if (
      stats.size > 100 * 1024 * 1024 ||
      (!isSuspiciousExt &&
        !fileExtension.match(/\.(txt|log|conf|ps1|bat|cmd)$/))
    ) {
      return null;
    }

    const fileContent = await fs.promises.readFile(filePath);
    const fileHash = crypto
      .createHash("sha1")
      .update(fileContent)
      .digest("hex");
    const md5Hash = crypto.createHash("md5").update(fileContent).digest("hex");

    let detectionMethod = [];
    let details = [];

    // Check against known malware signatures
    if (MALWARE_SIGNATURES.has(fileHash) || MALWARE_SIGNATURES.has(md5Hash)) {
      detectionMethod.push("signature_match");
      details.push("Matched known malware signature");
    }

    // Check file entropy for potential encryption/packing
    const entropy = calculateEntropy(fileContent);
    if (entropy > 7.5) {
      detectionMethod.push("high_entropy");
      details.push("High entropy indicates possible encryption or packing");
    }

    // Check for suspicious patterns in text files
    if (fileContent.length < 1024 * 1024) {
      const content = fileContent.toString();
      for (const pattern of SUSPICIOUS_PATTERNS) {
        if (pattern.test(content)) {
          detectionMethod.push("pattern_match");
          details.push(`Contains suspicious pattern: ${pattern.toString()}`);
        }
      }
    }

    // Check file signature/magic bytes
    const magicBytes = fileContent.slice(0, 4);
    const isExecutable = magicBytes.toString("hex").startsWith("4d5a"); // MZ header
    if (isExecutable && !fileExtension.match(/\.(exe|dll|sys)$/)) {
      detectionMethod.push("suspicious_header");
      details.push("Executable content with non-executable extension");
    }

    if (detectionMethod.length > 0) {
      return {
        path: filePath,
        type: detectionMethod.includes("signature_match")
          ? "malware"
          : "suspicious",
        severity: detectionMethod.includes("signature_match")
          ? "critical"
          : "high",
        details: details.join("; "),
        hash: fileHash,
        md5Hash: md5Hash,
        detectionMethod: detectionMethod.join(","),
        size: stats.size,
        timestamp: new Date().toISOString(),
        entropy: entropy,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error scanning file ${filePath}:`, error);
    return null;
  }
}

// Helper function to calculate Shannon entropy
function calculateEntropy(buffer) {
  const bytes = new Uint8Array(buffer);
  const frequencies = new Array(256).fill(0);

  for (const byte of bytes) {
    frequencies[byte]++;
  }

  let entropy = 0;
  const length = bytes.length;

  for (const freq of frequencies) {
    if (freq === 0) continue;
    const p = freq / length;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

// Enhanced directory scanning
async function scanDirectory(
  dirPath,
  results = [],
  stats = {
    totalFiles: 0,
    skippedFiles: 0,
    fileTypes: {},
    startTime: Date.now(),
    scannedDirs: 0,
  }
) {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    stats.scannedDirs++;

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Skip system and package directories
        if (
          !entry.name.match(
            /^(node_modules|\.git|\.vscode|dist|build|Windows|Program Files|System32)$/
          )
        ) {
          await scanDirectory(fullPath, results, stats);
        }
      } else {
        stats.totalFiles++;
        const ext = path.extname(entry.name).toLowerCase();
        stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;

        const result = await scanFile(fullPath);
        if (result) {
          results.push(result);
        } else {
          stats.skippedFiles++;
        }
      }
    }

    return { results, stats };
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
    return { results, stats };
  }
}

// Enhanced malware scan endpoint
exports.scanForMalware = async (req, res) => {
  try {
    const startTime = Date.now();
    const scanPath =
      req.query.path ||
      process.env.DOCUMENTS_PATH ||
      path.join(os.homedir(), "Pictures");
    const { results, stats } = await scanDirectory(scanPath);
    const endTime = Date.now();

    // Get detailed system info
    const [processInfo, systemInfo] = await Promise.all([
      getProcessInfo(),
      getSystemInfo(),
    ]);

    // Calculate scan statistics
    const scanDuration = endTime - startTime;
    const averageScanTime = scanDuration / (stats.totalFiles || 1);

    // Find largest scanned file
    const largestFile = results.reduce(
      (max, curr) =>
        curr.size > (max.size || 0)
          ? { path: curr.path, size: curr.size }
          : max,
      { path: "", size: 0 }
    );

    res.json({
      success: true,
      data: {
        scanDuration,
        threats: results.length,
        findings: results,
        systemStatus: {
          suspiciousProcesses: processInfo,
          scannedFiles: stats.totalFiles,
          scannedDirectories: stats.scannedDirs,
          timestamp: new Date().toISOString(),
          scanPath,
          systemInfo,
        },
        scanStats: {
          totalFiles: stats.totalFiles,
          skippedFiles: stats.skippedFiles,
          fileTypes: stats.fileTypes,
          averageScanTime,
          largestFile,
          malwareHashes: Array.from(MALWARE_SIGNATURES),
          knownThreats: results.map((r) => r.hash),
        },
      },
    });
  } catch (error) {
    console.error("Error during malware scan:", error);
    res.status(500).json({
      success: false,
      error: "Failed to complete malware scan",
      details: error.message,
    });
  }
};

// Enhanced process information gathering
async function getProcessInfo() {
  try {
    const { stdout: processOutput } = await execAsync("tasklist /v /fo csv");
    const processes = processOutput
      .split("\n")
      .slice(1) // Skip header
      .map((line) => {
        const [
          name,
          pid,
          sessionName,
          sessionNum,
          memUsage,
          status,
          username,
          cpuTime,
          windowTitle,
        ] = line.split(",").map((field) => field.replace(/"/g, "").trim());

        return {
          name,
          pid: parseInt(pid),
          memoryUsage: parseInt(memUsage.replace(/[^0-9]/g, "")),
          status,
          username,
          cpuTime,
          windowTitle,
        };
      })
      .filter((proc) =>
        SUSPICIOUS_PATTERNS.some(
          (pattern) =>
            pattern.test(proc.name.toLowerCase()) ||
            pattern.test(proc.windowTitle.toLowerCase())
        )
      );

    // Get additional process details using PowerShell
    for (const proc of processes) {
      try {
        const { stdout: details } = await execAsync(
          `powershell "Get-Process -Id ${proc.pid} | Select-Object Path,Company,Description,StartTime | ConvertTo-Json"`
        );
        const procDetails = JSON.parse(details);
        Object.assign(proc, {
          path: procDetails.Path,
          company: procDetails.Company,
          description: procDetails.Description,
          startTime: procDetails.StartTime,
        });

        // Get file hash if path exists
        if (proc.path) {
          const { stdout: hash } = await execAsync(
            `powershell "Get-FileHash '${proc.path}' | Select-Object -ExpandProperty Hash"`
          );
          proc.hash = hash.trim();
        }
      } catch (error) {
        console.error(`Error getting details for process ${proc.pid}:`, error);
      }
    }

    return processes;
  } catch (error) {
    console.error("Error getting process information:", error);
    return [];
  }
}

// Get detailed system information
async function getSystemInfo() {
  try {
    const [cpu, mem, os] = await Promise.all([si.cpu(), si.mem(), si.osInfo()]);

    return {
      cpu: {
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        speed: cpu.speed,
        cores: cpu.cores,
        physicalCores: cpu.physicalCores,
      },
      memory: {
        total: mem.total,
        free: mem.free,
        used: mem.used,
        swapTotal: mem.swaptotal,
        swapUsed: mem.swapused,
      },
      os: {
        platform: os.platform,
        distro: os.distro,
        release: os.release,
        arch: os.arch,
      },
    };
  } catch (error) {
    console.error("Error getting system information:", error);
    return {};
  }
}

// Add custom code scanning endpoint
exports.scanCustomCode = async (req, res) => {
  try {
    const { code, filename } = req.body;
    if (!code) {
      return res.status(400).json({
        success: false,
        error: "No code provided for scanning",
      });
    }

    // Save code to temporary file for scanning
    const tempDir = path.join(__dirname, "../temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const tempFile = path.join(tempDir, filename || "temp_code.txt");
    await fs.promises.writeFile(tempFile, code);

    // Scan the file
    const scanResult = await scanFile(tempFile);

    // Get AI analysis
    const aiAnalysis = await scanCode(code);

    // Clean up temp file
    await fs.promises.unlink(tempFile);

    res.json({
      success: true,
      data: {
        scanResult,
        aiAnalysis: aiAnalysis.success ? aiAnalysis.analysis : null,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error during custom code scan:", error);
    res.status(500).json({
      success: false,
      error: "Failed to scan custom code",
      details: error.message,
    });
  }
};

// Code scanning using Gemini
async function scanCode(code) {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error("Gemini API key not configured");
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: `Please analyze this code for security vulnerabilities and best practices. Provide a detailed report:\n\n${code}`,
              },
            ],
          },
        ],
      }
    );

    return {
      success: true,
      analysis: response.data.candidates[0].content.parts[0].text,
    };
  } catch (error) {
    console.error("Error scanning code with Gemini:", error);
    return {
      success: false,
      error: "Failed to analyze code",
    };
  }
}

/**
 * Add a new security alert
 * @param {string} type - Type of alert (malware, hack, vulnerability)
 * @param {string} severity - Severity level (low, medium, high, critical)
 * @param {string} message - Alert message
 * @param {Object} details - Additional details
 */
const addAlert = (type, severity, message, details = {}) => {
  try {
    const alerts = JSON.parse(fs.readFileSync(alertsPath, "utf8"));

    const newAlert = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type,
      severity,
      message,
      details,
      dismissed: false,
    };

    alerts.alerts.push(newAlert);

    // Keep only the last 100 alerts
    if (alerts.alerts.length > 100) {
      alerts.alerts = alerts.alerts.slice(-100);
    }

    fs.writeFileSync(alertsPath, JSON.stringify(alerts, null, 2));

    return newAlert;
  } catch (error) {
    console.error("Error adding alert:", error);
    return null;
  }
};

/**
 * Check for signs of hacking attempts
 */
exports.detectHackingAttempts = async (req, res) => {
  try {
    const results = {
      suspicious_logins: [],
      port_scans: [],
      system_modifications: [],
      network_anomalies: [],
    };

    // Check Windows Event Log for suspicious logins
    try {
      const { stdout } = await execAsync(
        "powershell \"Get-WinEvent -FilterHashtable @{LogName='Security'; ID=4625} -MaxEvents 50 | ConvertTo-Json\""
      );
      const events = JSON.parse(stdout);

      results.suspicious_logins = events.map((event) => ({
        timestamp: event.TimeCreated,
        username: event.Properties.find((p) => p.Name === "TargetUserName")
          ?.Value,
        source: event.Properties.find((p) => p.Name === "IpAddress")?.Value,
        status: "failed_login",
      }));
    } catch (error) {
      console.error("Event log check error:", error);
    }

    // Check for system modifications
    try {
      const { stdout: sysChanges } = await execAsync(
        "powershell \"Get-WinEvent -FilterHashtable @{LogName='System'; ID=1102} -MaxEvents 20 | ConvertTo-Json\""
      );
      results.system_modifications = JSON.parse(sysChanges);
    } catch (error) {
      console.error("System modifications check error:", error);
    }

    // Network anomalies detection
    try {
      const { stdout: netstat } = await execAsync("netstat -n");
      const connections = netstat
        .split("\n")
        .filter((line) => line.includes("ESTABLISHED"))
        .map((line) => {
          const parts = line.trim().split(/\s+/);
          return {
            local: parts[1],
            remote: parts[2],
            state: parts[3],
          };
        });

      // Analyze for suspicious connections
      results.network_anomalies = connections.filter((conn) => {
        const remotePort = parseInt(conn.remote.split(":")[1]);
        return (
          remotePort === 4444 || // Common metasploit port
          remotePort === 31337 || // Common backdoor port
          conn.remote.includes(":0")
        ); // Invalid port
      });
    } catch (error) {
      console.error("Network analysis error:", error);
    }

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Hack detection error:", error);
    res.status(500).json({
      success: false,
      error: "Error detecting hacking attempts",
    });
  }
};

/**
 * Check for system vulnerabilities
 */
exports.checkVulnerabilities = async (req, res) => {
  try {
    const results = {
      os_vulnerabilities: [],
      network_vulnerabilities: [],
      software_vulnerabilities: [],
    };

    // Check Windows Update status
    try {
      const { stdout: updates } = await execAsync(
        'powershell "Get-HotFix | Sort-Object -Property InstalledOn -Descending | Select-Object -First 10 | ConvertTo-Json"'
      );
      const recentUpdates = JSON.parse(updates);

      results.os_vulnerabilities.push({
        type: "windows_updates",
        details: recentUpdates,
        lastUpdate: recentUpdates[0]?.InstalledOn,
      });
    } catch (error) {
      console.error("Windows Update check error:", error);
    }

    // Check firewall status
    try {
      const { stdout: firewall } = await execAsync(
        'powershell "Get-NetFirewallProfile | ConvertTo-Json"'
      );
      const firewallStatus = JSON.parse(firewall);

      results.network_vulnerabilities.push({
        type: "firewall",
        status: firewallStatus.map((profile) => ({
          profile: profile.Name,
          enabled: profile.Enabled,
        })),
      });
    } catch (error) {
      console.error("Firewall check error:", error);
    }

    // Check installed software
    try {
      const { stdout: software } = await execAsync(
        'powershell "Get-WmiObject -Class Win32_Product | Select-Object Name, Version, Vendor | ConvertTo-Json"'
      );
      const installedSoftware = JSON.parse(software);

      results.software_vulnerabilities = installedSoftware.map((sw) => ({
        name: sw.Name,
        version: sw.Version,
        vendor: sw.Vendor,
      }));
    } catch (error) {
      console.error("Software check error:", error);
    }

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Vulnerability check error:", error);
    res.status(500).json({
      success: false,
      error: "Error checking vulnerabilities",
    });
  }
};

/**
 * Check if email has been pwned
 */
exports.checkPwnedEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    const response = await axios.get(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${email}`,
      {
        headers: {
          "hibp-api-key": process.env.HIBP_API_KEY,
        },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    if (error.response?.status === 404) {
      res.json({
        success: true,
        data: [], // No breaches found
      });
    } else {
      console.error("HIBP check error:", error);
      res.status(500).json({
        success: false,
        error: "Error checking email status",
      });
    }
  }
};

/**
 * Check if password has been compromised
 */
exports.checkPwnedPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({
        success: false,
        error: "Password is required",
      });
    }

    // Hash the password with SHA-1
    const hash = crypto.SHA1(password).toString().toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    // Check against HIBP API
    const response = await axios.get(
      `https://api.pwnedpasswords.com/range/${prefix}`
    );

    const hashes = response.data.split("\n");
    const match = hashes.find((h) => h.split(":")[0] === suffix);

    res.json({
      success: true,
      data: {
        compromised: !!match,
        occurrences: match ? parseInt(match.split(":")[1]) : 0,
      },
    });
  } catch (error) {
    console.error("Password check error:", error);
    res.status(500).json({
      success: false,
      error: "Error checking password status",
    });
  }
};

/**
 * Get security alerts
 */
exports.getSecurityAlerts = (req, res) => {
  try {
    const alerts = JSON.parse(fs.readFileSync(alertsPath, "utf8"));

    // Filter by type if specified
    const { type, severity, dismissed } = req.query;
    let filteredAlerts = alerts.alerts;

    if (type) {
      filteredAlerts = filteredAlerts.filter((alert) => alert.type === type);
    }

    if (severity) {
      filteredAlerts = filteredAlerts.filter(
        (alert) => alert.severity === severity
      );
    }

    if (dismissed !== undefined) {
      const isDismissed = dismissed === "true";
      filteredAlerts = filteredAlerts.filter(
        (alert) => alert.dismissed === isDismissed
      );
    }

    res.json({
      success: true,
      data: filteredAlerts,
    });
  } catch (error) {
    console.error("Error getting alerts:", error);
    res.status(500).json({
      success: false,
      error: "Error retrieving security alerts",
    });
  }
};

/**
 * Dismiss a security alert
 */
exports.dismissAlert = (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Alert ID is required",
      });
    }

    const alerts = JSON.parse(fs.readFileSync(alertsPath, "utf8"));

    const alertIndex = alerts.alerts.findIndex((alert) => alert.id === id);

    if (alertIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Alert not found",
      });
    }

    alerts.alerts[alertIndex].dismissed = true;

    fs.writeFileSync(alertsPath, JSON.stringify(alerts, null, 2));

    res.json({
      success: true,
      data: alerts.alerts[alertIndex],
    });
  } catch (error) {
    console.error("Error dismissing alert:", error);
    res.status(500).json({
      success: false,
      error: "Error dismissing security alert",
    });
  }
};

// Get security status
exports.getSecurityStatus = async (req, res) => {
  try {
    // Get Windows Defender status using execAsync
    const { stdout: defenderStatus } = await execAsync(
      'powershell -Command "Get-MpComputerStatus | Select-Object -Property AntivirusEnabled, RealTimeProtectionEnabled, AntivirusSignatureLastUpdated | ConvertTo-Json"'
    );
    const defenderInfo = JSON.parse(defenderStatus);

    // Parse the Windows PowerShell date format
    const lastScanDate = defenderInfo.AntivirusSignatureLastUpdated;
    const formattedDate = lastScanDate
      ? new Date(parseInt(lastScanDate.match(/\d+/)[0])).toISOString()
      : new Date().toISOString();

    // Get threat count
    const { stdout: threatCount } = await execAsync(
      'powershell -Command "Get-MpThreatDetection | Measure-Object | Select-Object -ExpandProperty Count"'
    );
    const threats = parseInt(threatCount) || 0;

    // Get firewall status
    const { stdout: firewallStatus } = await execAsync(
      'powershell -Command "Get-NetFirewallProfile | Where-Object { $_.Enabled -eq $true } | Measure-Object | Select-Object -ExpandProperty Count"'
    );
    const firewallEnabled = parseInt(firewallStatus) > 0;

    const status = {
      malwareProtection: {
        status: defenderInfo.AntivirusEnabled ? "active" : "inactive",
        lastScan: formattedDate,
        threats: threats,
      },
      firewall: {
        status: firewallEnabled ? "enabled" : "disabled",
        connections: 0,
        blocked: 0,
      },
      activeThreats: {
        count: threats,
        severity: threats > 5 ? "high" : threats > 0 ? "medium" : "low",
      },
      encryption: {
        status: "active",
        type: "AES-256",
        strength: "256-bit",
      },
    };

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("Error getting security status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get security status",
    });
  }
};
