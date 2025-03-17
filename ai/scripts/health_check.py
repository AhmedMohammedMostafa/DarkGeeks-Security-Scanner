import os
import sys
import psutil
import json
import shutil
import logging
from pathlib import Path

# Get the project root directory
project_root = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
logs_dir = project_root / 'logs'

# Create logs directory if it doesn't exist
os.makedirs(logs_dir, exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(logs_dir / 'health_check.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('HealthCheck')

class HealthCheck:
    def __init__(self):
        self.project_root = project_root
        self.required_dirs = ['data', 'logs', 'config']
        self.required_files = [
            'data/packets.json',
            '.env',
            'config/network_config.json'
        ]
        self.min_free_space_mb = 500
        self.max_cpu_percent = 80
        self.max_memory_percent = 80

    def check_directories(self):
        """Check and create required directories"""
        logger.info("Checking required directories...")
        for dir_name in self.required_dirs:
            dir_path = self.project_root / dir_name
            if not dir_path.exists():
                try:
                    dir_path.mkdir(parents=True)
                    logger.info(f"Created directory: {dir_path}")
                except Exception as e:
                    logger.error(f"Failed to create directory {dir_path}: {e}")
                    return False
        return True

    def check_files(self):
        """Check and initialize required files"""
        logger.info("Checking required files...")
        for file_path in self.required_files:
            full_path = self.project_root / file_path
            if not full_path.exists():
                try:
                    if file_path.endswith('packets.json'):
                        with open(full_path, 'w') as f:
                            json.dump({"packets": [], "anomalies": []}, f)
                    elif file_path.endswith('network_config.json'):
                        with open(full_path, 'w') as f:
                            json.dump({
                                "max_packet_queue": 1000,
                                "save_interval": 30,
                                "log_level": "INFO"
                            }, f)
                    elif file_path.endswith('.env'):
                        shutil.copy(self.project_root / '.env.example', full_path)
                    logger.info(f"Initialized file: {full_path}")
                except Exception as e:
                    logger.error(f"Failed to initialize file {full_path}: {e}")
                    return False
        return True

    def check_permissions(self):
        """Check and fix file permissions"""
        logger.info("Checking file permissions...")
        try:
            for dir_name in self.required_dirs:
                dir_path = self.project_root / dir_name
                if dir_path.exists():
                    os.chmod(dir_path, 0o755)
            for file_path in self.required_files:
                full_path = self.project_root / file_path
                if full_path.exists():
                    os.chmod(full_path, 0o644)
            return True
        except Exception as e:
            logger.error(f"Failed to set permissions: {e}")
            return False

    def check_disk_space(self):
        """Check available disk space"""
        logger.info("Checking disk space...")
        try:
            disk_usage = shutil.disk_usage(self.project_root)
            free_space_mb = disk_usage.free / (1024 * 1024)
            if free_space_mb < self.min_free_space_mb:
                logger.warning(f"Low disk space: {free_space_mb:.2f}MB free")
                return False
            return True
        except Exception as e:
            logger.error(f"Failed to check disk space: {e}")
            return False

    def check_system_resources(self):
        """Check system resource usage"""
        logger.info("Checking system resources...")
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory_percent = psutil.virtual_memory().percent
            
            if cpu_percent > self.max_cpu_percent:
                logger.warning(f"High CPU usage: {cpu_percent}%")
            if memory_percent > self.max_memory_percent:
                logger.warning(f"High memory usage: {memory_percent}%")
                
            return cpu_percent <= self.max_cpu_percent and memory_percent <= self.max_memory_percent
        except Exception as e:
            logger.error(f"Failed to check system resources: {e}")
            return False

    def check_network_monitor(self):
        """Check if network monitor is running properly"""
        logger.info("Checking network monitor status...")
        try:
            # Check for network monitor process
            for proc in psutil.process_iter(['name', 'cmdline']):
                if 'python' in proc.info['name'].lower() and \
                   any('network_monitor.py' in cmd for cmd in proc.info['cmdline'] if cmd):
                    logger.info("Network monitor is running")
                    return True
            logger.warning("Network monitor is not running")
            return False
        except Exception as e:
            logger.error(f"Failed to check network monitor status: {e}")
            return False

    def run_checks(self):
        """Run all health checks"""
        checks = {
            "Directories": self.check_directories(),
            "Files": self.check_files(),
            "Permissions": self.check_permissions(),
            "Disk Space": self.check_disk_space(),
            "System Resources": self.check_system_resources(),
            "Network Monitor": self.check_network_monitor()
        }
        
        logger.info("\nHealth Check Results:")
        for check, status in checks.items():
            logger.info(f"{check}: {'PASS' if status else 'FAIL'}")
        
        return all(checks.values())

def main():
    try:
        health_checker = HealthCheck()
        if health_checker.run_checks():
            logger.info("All checks passed successfully!")
            sys.exit(0)
        else:
            logger.warning("Some checks failed. Please review the logs.")
            sys.exit(1)
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 