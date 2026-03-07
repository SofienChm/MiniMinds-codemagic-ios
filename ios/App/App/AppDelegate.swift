import UIKit
import Capacitor
import Firebase
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Initialize Firebase
        FirebaseApp.configure()
        // Set Firebase Messaging delegate to receive FCM tokens
        Messaging.messaging().delegate = self
        // If Firebase already has a cached FCM token from a previous session, store it now
        // so waitForFcmToken() finds it immediately without waiting
        if let cachedToken = Messaging.messaging().fcmToken {
            UserDefaults.standard.set(cachedToken, forKey: "CapacitorStorage.FCMToken")
        }
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {}

    func applicationDidEnterBackground(_ application: UIApplication) {}

    func applicationWillEnterForeground(_ application: UIApplication) {}

    func applicationDidBecomeActive(_ application: UIApplication) {}

    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // Required when FirebaseAppDelegateProxyEnabled = false:
    // Manually forward APNs token to Firebase so it can generate FCM token.
    // Also notify Capacitor's PushNotifications plugin via NotificationCenter
    // (Capacitor 7 uses NotificationCenter instead of ApplicationDelegateProxy for APNs).
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
        NotificationCenter.default.post(
            name: .capacitorDidRegisterForRemoteNotifications,
            object: deviceToken
        )
    }

    // Forward registration failures to Capacitor so `registrationError` event fires in JavaScript
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(
            name: .capacitorDidFailToRegisterForRemoteNotifications,
            object: error
        )
    }
}

// Receives the FCM registration token from Firebase
extension AppDelegate: MessagingDelegate {
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        // Store FCM token where Capacitor Preferences can read it (key prefix = "CapacitorStorage.")
        UserDefaults.standard.set(token, forKey: "CapacitorStorage.FCMToken")
    }
}
