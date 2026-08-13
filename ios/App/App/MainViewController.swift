import UIKit
import Capacitor

/// Subclass of Capacitor's stock bridge view controller, used solely to
/// enable the native edge swipe-back gesture. `allowsBackForwardNavigationGestures`
/// is a property on `WKWebView` itself, and the webview doesn't exist yet at
/// `AppDelegate.didFinishLaunchingWithOptions` time — it's created inside
/// `CAPBridgeViewController.viewDidLoad()` — so this has to be set from here,
/// after the webview has been instantiated by `super.viewDidLoad()`.
///
/// Main.storyboard's root view controller is repointed at this class
/// (instead of `CAPBridgeViewController` directly) to wire this in.
class MainViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        webView?.allowsBackForwardNavigationGestures = true
    }
}
