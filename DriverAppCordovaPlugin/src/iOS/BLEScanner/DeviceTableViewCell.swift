//
//  DeviceTableViewCell.swift
//  BLEScanner
//


import UIKit
import CoreBluetooth

protocol DeviceCellDelegate: class {
	func connectPressed(_ peripheral: CBPeripheral)
}

class DeviceTableViewCell: UITableViewCell {

	@IBOutlet weak var deviceNameLabel: UILabel!
    @IBOutlet weak var deviceIdLabel: UILabel!
    @IBOutlet weak var deviceStateLabel: UILabel!
    @IBOutlet weak var deviceBatteryLabel: UILabel!
    @IBOutlet weak var deviceLastSeenLabel: UILabel!
    @IBOutlet weak var deviceRssiLabel: UILabel!
	
	var delegate: DeviceCellDelegate?
	
	var displayPeripheral: DisplayPeripheral? {
		didSet {
            let lastSeen = Date().currentTimeMillis - displayPeripheral!.lastSeen!.currentTimeMillis
            
            deviceNameLabel.text = displayPeripheral!.peripheral?.name ?? "No device name"
            deviceIdLabel.text = "ID: \(displayPeripheral!.peripheral?.identifier.uuidString ?? "unknown")"
            deviceStateLabel.text = "State: \(displayPeripheral!.nodeState?.rawValue ?? "unknown")"
            deviceBatteryLabel.text = "Battery voltage: \(displayPeripheral!.batteryVoltage ?? 0)mV"
            deviceLastSeenLabel.text = "Last seen: \(lastSeen)ms ago"
            deviceRssiLabel.text = "RSSI: \(displayPeripheral!.lastRSSI ?? 0)dB"
        }
	}
    
	@IBAction func connectButtonPressed(_ sender: AnyObject) {
		delegate?.connectPressed((displayPeripheral?.peripheral)!)
	}
}
