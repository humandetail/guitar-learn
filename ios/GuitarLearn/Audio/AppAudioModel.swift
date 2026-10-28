import AVFoundation
import Combine
import Foundation

@MainActor
final class AppAudioModel: ObservableObject {
    enum Mode { case idle, requesting, tuning, metronome }
    @Published private(set) var mode: Mode = .idle
    @Published private(set) var reading: PitchReading?
    @Published private(set) var level = 0.0
    @Published private(set) var beat: Int?
    @Published private(set) var notice = ""
    @Published private(set) var permissionDenied = false
    @Published var bpm = 80

    private var microphone: MicrophoneSession?
    private var metronome: NativeMetronome?
    private var ticker: Timer?
    private var lastInput = 0.0
    private var generation = UUID()
    private var observers: [NSObjectProtocol] = []
    private var foreground = true
    private var grantedWhileInactive = false
    private let askPermission: (@escaping (Bool) -> Void) -> Void
    private let makeCapture: (@escaping (Result<PitchObservation, Error>) -> Void) -> MicrophoneSession

    init(
        askPermission: @escaping (@escaping (Bool) -> Void) -> Void = AppAudioModel.requestPermission,
        makeCapture: @escaping (@escaping (Result<PitchObservation, Error>) -> Void) -> MicrophoneSession = { MicrophoneCapture(report: $0) }
    ) {
        self.askPermission = askPermission
        self.makeCapture = makeCapture
        #if os(iOS)
        let center = NotificationCenter.default
        observers.append(center.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] notification in
            guard (notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt) == AVAudioSession.InterruptionType.began.rawValue else { return }
            Task { @MainActor in self?.interrupt("声音被系统中断，请手动重新开始。") }
        })
        observers.append(center.addObserver(forName: AVAudioSession.routeChangeNotification, object: nil, queue: .main) { [weak self] notification in
            guard let reason = notification.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt,
                  [AVAudioSession.RouteChangeReason.oldDeviceUnavailable.rawValue,
                   AVAudioSession.RouteChangeReason.newDeviceAvailable.rawValue].contains(reason) else { return }
            Task { @MainActor in self?.interrupt("音频设备已切换，请手动重新开始。") }
        })
        for name in [AVAudioSession.mediaServicesWereLostNotification, AVAudioSession.mediaServicesWereResetNotification] {
            observers.append(center.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                Task { @MainActor in self?.interrupt("系统音频已重置，请手动重新开始。") }
            })
        }
        #endif
    }

    func startTuning() {
        guard foreground else { return }
        stop()
        permissionDenied = false
        mode = .requesting
        let token = generation
        askPermission { [weak self] granted in
            Task { @MainActor in self?.permissionReturned(granted, token: token) }
        }
    }

    nonisolated private static func requestPermission(_ response: @escaping (Bool) -> Void) {
        #if os(iOS)
        AVAudioApplication.requestRecordPermission(completionHandler: response)
        #else
        response(false)
        #endif
    }

    private func permissionReturned(_ granted: Bool, token: UUID) {
        guard token == generation, mode == .requesting else { return }
        guard granted else {
            stop(message: "麦克风权限未开启，请在设置中允许使用麦克风后重试。")
            permissionDenied = true
            return
        }
        // The permission sheet may briefly make the scene inactive. Only this pending
        // user action may continue on activation; interrupted audio never auto-resumes.
        guard foreground else { grantedWhileInactive = true; return }
        openMicrophone(token: token)
    }

    private func openMicrophone(token: UUID) {
        guard generation == token, mode == .requesting else { return }
        do {
            #if os(iOS)
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .measurement)
            try session.setPreferredIOBufferDuration(0.02)
            try session.setActive(true)
            #endif
            let capture = makeCapture { [weak self] result in
                Task { @MainActor in
                    guard let self, self.generation == token, self.mode == .tuning else { return }
                    switch result {
                    case .success(let observation):
                        self.lastInput = ProcessInfo.processInfo.systemUptime
                        self.reading = observation.reading
                        self.level = min(1, observation.rms * 12)
                    case .failure(let error): self.stop(message: error.localizedDescription)
                    }
                }
            }
            microphone = capture
            try capture.start()
            mode = .tuning
            lastInput = ProcessInfo.processInfo.systemUptime
            ticker = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
                Task { @MainActor in
                    guard let self, self.mode == .tuning else { return }
                    let elapsed = ProcessInfo.processInfo.systemUptime - self.lastInput
                    if elapsed > 0.35 { self.reading = nil; self.level = 0 }
                    if elapsed > 2 { self.stop(message: "麦克风没有继续传入声音，请检查输入设备后重试。") }
                }
            }
        } catch { stop(message: "无法开始收音：\(error.localizedDescription)") }
    }

    func startMetronome() {
        guard foreground, (30...240).contains(bpm) else { return }
        stop()
        do {
            #if os(iOS)
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default)
            try session.setActive(true)
            #endif
            let clock = NativeMetronome()
            metronome = clock
            try clock.start(bpm: bpm)
            mode = .metronome
            ticker = Timer.scheduledTimer(withTimeInterval: 1.0 / 30, repeats: true) { [weak self] _ in
                Task { @MainActor in
                    guard let self, self.mode == .metronome else { return }
                    self.beat = self.metronome?.beat
                }
            }
        } catch { stop(message: "无法播放节拍：\(error.localizedDescription)") }
    }

    func stop(message: String = "") {
        generation = UUID()
        grantedWhileInactive = false
        ticker?.invalidate(); ticker = nil
        microphone?.stop(); microphone = nil
        metronome?.stop(); metronome = nil
        mode = .idle
        reading = nil; level = 0; beat = nil
        notice = message
        #if os(iOS)
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        #endif
    }

    private func interrupt(_ message: String) {
        if mode != .idle { stop(message: message) }
    }

    func sceneChanged(active: Bool, background: Bool) {
        foreground = active
        if background { interrupt("已暂停。回到 App 后，请手动开始。") }
        else if !active, mode != .requesting { interrupt("已暂停，请手动开始。") }
        else if active, grantedWhileInactive {
            grantedWhileInactive = false
            openMicrophone(token: generation)
        }
    }

    deinit {
        ticker?.invalidate()
        for observer in observers { NotificationCenter.default.removeObserver(observer) }
    }
}
