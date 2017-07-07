//
//  UIViewController+Alert.swift
//  BLEScanner
//


import Foundation
import UIKit

extension UIViewController {
    
    func presentAlertController(title: String, message: String) {
        let alertController = UIAlertController(title: title, message: message, preferredStyle: .alert)
        let defaultAction = UIAlertAction(title: "OK", style: .default, handler: nil)
        alertController.addAction(defaultAction)
        self.present(alertController, animated: true, completion: nil)
    }
}
