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
        // Register with APNs so iOS issues a device token.
        // Required because FirebaseAppDelegateProxyEnabled = false disables automatic registration.
        // Without this, didRegisterForRemoteNotificationsWithDeviceToken never fires,
        // Firebase never gets the APNs token, and no FCM token is generated.
        DispatchQueue.main.async {
            application.registerForRemoteNotifications()
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
        print("[MiniMinds] ✅ APNs token received — forwarding to Firebase")
        Messaging.messaging().apnsToken = deviceToken
        // Eagerly store any FCM token Firebase already has before notifying Capacitor,
        // so waitForFcmToken() finds it on the first try instead of waiting
        if let fcmToken = Messaging.messaging().fcmToken {
            print("[MiniMinds] ✅ FCM token already available: \(fcmToken.prefix(20))...")
            UserDefaults.standard.set(fcmToken, forKey: "CapacitorStorage.FCMToken")
        } else {
            print("[MiniMinds] ⏳ FCM token not yet available — waiting for didReceiveRegistrationToken")
        }
        NotificationCenter.default.post(
            name: .capacitorDidRegisterForRemoteNotifications,
            object: deviceToken
        )
    }

    // Forward registration failures to Capacitor so `registrationError` event fires in JavaScript
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[MiniMinds] ❌ APNs registration failed: \(error.localizedDescription)")
        NotificationCenter.default.post(
            name: .capacitorDidFailToRegisterForRemoteNotifications,
            object: error
        )
    }
}

// Receives the FCM registration token from Firebase
extension AppDelegate: MessagingDelegate {
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else {
            print("[MiniMinds] ❌ FCM token is nil")
            return
        }
        print("[MiniMinds] ✅ FCM token received: \(token.prefix(20))...")
        // Store FCM token where Capacitor Preferences can read it (key prefix = "CapacitorStorage.")
        UserDefaults.standard.set(token, forKey: "CapacitorStorage.FCMToken")
    }
}
