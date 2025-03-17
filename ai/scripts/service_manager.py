import os
import sys
import psutil
import logging
import subprocess
from pathlib import Path
import signal
import time

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
        logging.FileHandler(logs_dir / 'service_manager.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('ServiceManager')

class ServiceManager:
    def __init__(self):
        self.network_monitor_script = project_root / 'network_monitor.py'
        self.pid_file = project_root / 'network_monitor.pid'

    def is_running(self):
        """Check if network monitor is running"""
        try:
            if self.pid_file.exists():
                with open(self.pid_file, 'r') as f:
                    pid = int(f.read().strip())
                try:
                    process = psutil.Process(pid)
                    return process.is_running() and 'python' in process.name().lower()
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    return False
            return False
        except Exception as e:
            logger.error(f"Error checking process status: {e}")
            return False

    def start(self):
        """Start the network monitor"""
        if self.is_running():
            logger.info("Network monitor is already running")
            return True

        try:
            # Start the process with elevated privileges on Windows
            if os.name == 'nt':
                command = [
                    'powershell',
                    'Start-Process',
                    'python',
                    '-ArgumentList',
                    f'"{str(self.network_monitor_script)}"',
                    '-Verb',
                    'RunAs',
                    '-WindowStyle',
                    'Hidden'
                ]
            else:
                command = ['sudo', sys.executable, str(self.network_monitor_script)]

            # Start the process
            process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
            )

            # Save PID
            with open(self.pid_file, 'w') as f:
                f.write(str(process.pid))

            # Wait briefly to check if process started successfully
            time.sleep(2)
            if process.poll() is None:
                logger.info(f"Started network monitor (PID: {process.pid})")
                return True
            else:
                stdout, stderr = process.communicate()
                error_msg = stderr.decode() if stderr else stdout.decode()
                logger.error(f"Failed to start network monitor: {error_msg}")
                if os.name == 'nt' and 'Access is denied' in error_msg:
                    logger.error("Please run as administrator to capture network traffic")
                return False

        except Exception as e:
            logger.error(f"Error starting network monitor: {e}")
            if os.name == 'nt':
                logger.error("Try running the script as administrator")
            else:
                logger.error("Try running with sudo")
            return False

    def stop(self):
        """Stop the network monitor"""
        try:
            if not self.pid_file.exists():
                logger.info("No PID file found")
                return True

            with open(self.pid_file, 'r') as f:
                pid = int(f.read().strip())

            try:
                process = psutil.Process(pid)
                if 'python' in process.name().lower():
                    # Send Ctrl+C signal
                    if os.name == 'nt':  # Windows
                        process.send_signal(signal.CTRL_C_EVENT)
                    else:  # Unix
                        process.send_signal(signal.SIGINT)
                    
                    # Wait for process to terminate
                    try:
                        process.wait(timeout=10)
                    except psutil.TimeoutExpired:
                        process.kill()
                    
                    logger.info(f"Stopped network monitor (PID: {pid})")
            except psutil.NoSuchProcess:
                logger.info("Process was not running")
            except Exception as e:
                logger.error(f"Error stopping process: {e}")
                return False

            # Remove PID file
            self.pid_file.unlink(missing_ok=True)
            return True

        except Exception as e:
            logger.error(f"Error stopping network monitor: {e}")
            return False

    def restart(self):
        """Restart the network monitor"""
        self.stop()
        time.sleep(2)  # Wait for process to fully stop
        return self.start()

def main():
    if len(sys.argv) < 2:
        print("Usage: python service_manager.py [start|stop|restart|status]")
        sys.exit(1)

    manager = ServiceManager()
    command = sys.argv[1].lower()

    if command == 'start':
        if manager.start():
            print("Network monitor started successfully")
            sys.exit(0)
    elif command == 'stop':
        if manager.stop():
            print("Network monitor stopped successfully")
            sys.exit(0)
    elif command == 'restart':
        if manager.restart():
            print("Network monitor restarted successfully")
            sys.exit(0)
    elif command == 'status':
        if manager.is_running():
            print("Network monitor is running")
            sys.exit(0)
        else:
            print("Network monitor is not running")
            sys.exit(1)
    else:
        print("Invalid command. Use start, stop, restart, or status")
        sys.exit(1)

    print("Operation failed")
    sys.exit(1)

if __name__ == '__main__':
    main() 