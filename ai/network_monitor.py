import scapy.all as scapy
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import json
import time
from datetime import datetime
import os
from threading import Thread
import warnings
import logging
from typing import Dict, Any, Optional
warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('network_monitor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('NetworkMonitor')

class NetworkMonitor:
    def __init__(self):
        self.packets = []
        self.model = IsolationForest(contamination=0.1, random_state=42)
        self.scaler = StandardScaler()
        self.is_capturing = False
        self.output_file = os.path.join(os.path.dirname(__file__), '..', 'data', 'packets.json')
        self.model_trained = False
        self.required_packet_fields = {'timestamp', 'source', 'destination', 'protocol', 'length', 'ttl'}
        
        # Create data directory if it doesn't exist
        os.makedirs(os.path.dirname(self.output_file), exist_ok=True)
        
        # Initialize packets.json if it doesn't exist
        if not os.path.exists(self.output_file):
            self._initialize_packets_file()
        else:
            # Validate existing file
            try:
                with open(self.output_file, 'r') as f:
                    json.load(f)
            except json.JSONDecodeError:
                logger.warning("Corrupted packets.json found. Reinitializing file.")
                self._initialize_packets_file()

    def _initialize_packets_file(self):
        """Initialize packets.json with empty structure"""
        with open(self.output_file, 'w') as f:
            json.dump({"packets": [], "anomalies": []}, f, indent=2)

    def _validate_packet(self, packet_info: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            # Ensure all required fields have valid values
            required_fields = ['timestamp', 'source', 'destination', 'protocol', 'length', 'ttl']
            for field in required_fields:
                if field not in packet_info or packet_info[field] is None:
                    return None

            # Convert numeric fields to appropriate types
            if 'length' in packet_info:
                packet_info['length'] = int(packet_info['length'] or 0)
            if 'ttl' in packet_info:
                packet_info['ttl'] = int(packet_info['ttl'] or 0)
            if 'protocol' in packet_info:
                packet_info['protocol'] = int(packet_info['protocol'] or 0)
            if 'sport' in packet_info:
                packet_info['sport'] = int(packet_info['sport'] or 0)
            if 'dport' in packet_info:
                packet_info['dport'] = int(packet_info['dport'] or 0)

            return packet_info
        except (ValueError, TypeError) as e:
            logging.error(f"Error validating packet: {e}")
            return None

    def packet_callback(self, packet):
        """Process captured packets"""
        try:
            if packet.haslayer(scapy.IP):
                packet_info = {
                    'timestamp': datetime.now().isoformat(),
                    'source': packet[scapy.IP].src,
                    'destination': packet[scapy.IP].dst,
                    'protocol': packet[scapy.IP].proto,
                    'length': len(packet),
                    'ttl': packet[scapy.IP].ttl
                }

                # Add TCP/UDP specific information
                if packet.haslayer(scapy.TCP):
                    packet_info.update({
                        'sport': packet[scapy.TCP].sport,
                        'dport': packet[scapy.TCP].dport,
                        'flags': str(packet[scapy.TCP].flags)
                    })
                elif packet.haslayer(scapy.UDP):
                    packet_info.update({
                        'sport': packet[scapy.UDP].sport,
                        'dport': packet[scapy.UDP].dport
                    })

                # Validate packet before adding
                validated_packet = self._validate_packet(packet_info)
                if validated_packet:
                    self.packets.append(validated_packet)
                else:
                    logger.warning("Packet validation failed, skipping packet")
        except Exception as e:
            logger.error(f"Error processing packet: {str(e)}")

    def extract_features(self, df):
        """Extract features for anomaly detection"""
        # Convert protocol to numeric
        df['protocol_num'] = pd.factorize(df['protocol'])[0]
        
        # Create features
        features = pd.DataFrame({
            'packet_length': df['length'],
            'ttl': df['ttl'],
            'protocol': df['protocol_num']
        })
        
        if 'sport' in df.columns:
            features['source_port'] = df['sport'].fillna(-1)
        if 'dport' in df.columns:
            features['dest_port'] = df['dport'].fillna(-1)
        if 'flags' in df.columns:
            # Convert TCP flags to numeric values
            def flag_to_numeric(flags):
                if not isinstance(flags, str):
                    return 0
                # Common TCP flags and their values
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
                # Calculate numeric value by combining flags
                value = 0
                for flag in flags:
                    if flag in flag_values:
                        value |= flag_values[flag]
                return value
            
            features['tcp_flags'] = df['flags'].fillna('0').apply(flag_to_numeric)
            
        return features

    def detect_anomalies(self):
        """Detect anomalies in captured packets"""
        if len(self.packets) < 10:
            return []

        df = pd.DataFrame(self.packets)
        features = self.extract_features(df)
        
        # Scale features
        scaled_features = self.scaler.fit_transform(features)
        
        # Train model if not trained
        if not self.model_trained:
            self.model.fit(scaled_features)
            self.model_trained = True
        
        # Predict anomalies
        predictions = self.model.predict(scaled_features)
        anomaly_scores = self.model.score_samples(scaled_features)
        
        # Find anomalies
        anomalies = []
        for i, (pred, score) in enumerate(zip(predictions, anomaly_scores)):
            if pred == -1:  # Anomaly detected
                packet = self.packets[i]
                anomalies.append({
                    'timestamp': packet['timestamp'],
                    'source': packet['source'],
                    'destination': packet['destination'],
                    'protocol': packet['protocol'],
                    'anomaly_score': float(score),
                    'details': {
                        'length': packet['length'],
                        'ttl': packet['ttl'],
                        'sport': packet.get('sport'),
                        'dport': packet.get('dport'),
                        'flags': packet.get('flags')
                    }
                })
        
        return anomalies

    def save_to_file(self):
        """Save captured packets and anomalies to file with error handling"""
        try:
            # Validate packets before saving
            valid_packets = [
                packet for packet in self.packets 
                if self._validate_packet(packet) is not None
            ]

            data = {
                "packets": valid_packets,
                "anomalies": self.detect_anomalies(),
                "timestamp": datetime.now().isoformat()
            }

            with open(self.output_file, 'w') as f:
                json.dump(data, f, indent=2)
            logging.info(f"Saved {len(valid_packets)} packets to file")
        except Exception as e:
            logging.error(f"Error saving packets to file: {e}")
            # Attempt to recover the file if it exists
            if os.path.exists(self.output_file):
                try:
                    with open(self.output_file, 'r') as f:
                        json.load(f)  # Verify file is valid JSON
                except json.JSONDecodeError:
                    logger.error("Packets file corrupted, reinitializing")
                    self._initialize_packets_file()

    def start_capture(self):
        """Start packet capture"""
        self.is_capturing = True
        
        def capture_packets():
            while self.is_capturing:
                try:
                    scapy.sniff(prn=self.packet_callback, store=False, timeout=10)
                    self.save_to_file()
                    
                    # Keep only last 1000 packets in memory
                    if len(self.packets) > 1000:
                        self.packets = self.packets[-1000:]
                except Exception as e:
                    print(f"Error in packet capture: {str(e)}")
                    time.sleep(1)  # Wait a bit before retrying

        # Start capture in a separate thread
        Thread(target=capture_packets, daemon=True).start()

    def stop_capture(self):
        """Stop packet capture"""
        self.is_capturing = False

if __name__ == '__main__':
    monitor = NetworkMonitor()
    try:
        print("Starting network monitoring...")
        monitor.start_capture()
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping network monitoring...")
        monitor.stop_capture() 