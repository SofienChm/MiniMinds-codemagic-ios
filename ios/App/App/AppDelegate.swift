import UIKit
import Capacitor
import Firebase
import FirebaseMessaging

// Sends debug logs to the server AND persists them in UserDefaults.
// UserDefaults fallback (key CapacitorStorage.SwiftLogs) lets TypeScript read native logs
// via Preferences.get({ key: 'SwiftLogs' }) even when URLSession fails silently.
func swiftDebugLog(_ step: String, _ message: String) {
    let fullStep = "swift-\(step)"
    print("[MiniMinds] \(fullStep): \(message)")

    // --- Fallback 1: Persist to UserDefaults so TypeScript can read it ---
    let entry = "[\(fullStep)] \(message)\n"
    let key = "CapacitorStorage.SwiftLogs"
    var existing = UserDefaults.standard.string(forKey: key) ?? ""
    // Keep last 4 KB to avoid bloat
    if existing.count > 4000 { existing = String(existing.suffix(3000)) }
    UserDefaults.standard.set(existing + entry, forKey: key)

    // --- Fallback 2: HTTP POST (best-effort, errors are non-fatal) ---
    guard let url = URL(string: "https://app-miniminds.com/api/devicetokens/debug-log") else { return }
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.timeoutInterval = 10
    let body: [String: String] = ["step": fullStep, "message": message]
    guard let bodyData = try? JSONSerialization.data(withJSONObject: body) else { return }
    request.httpBody = bodyData
    URLSession.shared.dataTask(with: request) { _, response, error in
        if let error = error {
            // Persist the URLSession error so TypeScript sees it too
            let errKey = "CapacitorStorage.SwiftNetError"
            UserDefaults.standard.set("[\(fullStep)] URLSession error: \(error.localizedDescription)", forKey: errKey)
            print("[MiniMinds] swiftDebugLog HTTP error for \(step): \(error.localizedDescription)")
        } else if let http = response as? HTTPURLResponse {
            print("[MiniMinds] swiftDebugLog \(step): HTTP \(http.statusCode)")
        }
    }.resume()
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Initialize Firebase
        FirebaseApp.configure()
        // Set Firebase Messaging delegate to receive FCM tokens
        Messaging.messaging().delegate = self
        swiftDebugLog("app-launch", "Firebase configured, delegate set")
        // If Firebase already has a cached FCM token from a previous session, store it now
        // so waitForFcmToken() finds it immediately without waiting
        if let cachedToken = Messaging.messaging().fcmToken {
            UserDefaults.standard.set(cachedToken, forKey: "CapacitorStorage.FCMToken")
            swiftDebugLog("app-launch", "Cached FCM token stored: \(cachedToken.prefix(20))...")
        }
        // Register with APNs so iOS issues a device token.
        // Required because FirebaseAppDelegateProxyEnabled = false disables automatic registration.
        DispatchQueue.main.async {
            application.registerForRemoteNotifications()
            swiftDebugLog("apns-register", "registerForRemoteNotifications called")
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
        let hexToken = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("[MiniMinds] ✅ APNs token received: \(hexToken.prefix(20))...")
        swiftDebugLog("apns-token", "APNs token received: \(hexToken.prefix(20))...")
        Messaging.messaging().apnsToken = deviceToken
        // Proactively request FCM token — more reliable than waiting for delegate callback alone
        Messaging.messaging().token { token, error in
            if let error = error {
                print("[MiniMinds] ❌ FCM token fetch error: \(error.localizedDescription)")
                swiftDebugLog("fcm-fetch-error", error.localizedDescription)
            } else if let token = token {
                print("[MiniMinds] ✅ FCM token fetched: \(token.prefix(20))...")
                swiftDebugLog("fcm-fetch-success", "token=\(token.prefix(20))...")
                UserDefaults.standard.set(token, forKey: "CapacitorStorage.FCMToken")
            }
        }
        NotificationCenter.default.post(
            name: .capacitorDidRegisterForRemoteNotifications,
            object: deviceToken
        )
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        swiftDebugLog("apns-error", "APNs registration FAILED: \(error.localizedDescription)")
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
            swiftDebugLog("fcm-token", "messaging delegate called but token is nil")
            return
        }
        swiftDebugLog("fcm-token", "FCM token received! \(token.prefix(20))...")
        UserDefaults.standard.set(token, forKey: "CapacitorStorage.FCMToken")
        swiftDebugLog("fcm-token", "Stored to CapacitorStorage.FCMToken in UserDefaults")
    }
}
