import Foundation

final class FakeMicrophone: MicrophoneSession {
    var starts = 0
    var stops = 0
    func start() throws { starts += 1 }
    func stop() { stops += 1 }
}

@main
struct LifecycleChecks {
    @MainActor
    static func main() async {
        var permission: ((Bool) -> Void)?
        var report: ((Result<PitchObservation, Error>) -> Void)?
        let fake = FakeMicrophone()
        let model = AppAudioModel(askPermission: { permission = $0 }, makeCapture: { report = $0; return fake })

        // Flush permission/report tasks on the main actor without touching hardware.
        func settle() async { for _ in 0..<20 { await Task.yield() } }
        model.startTuning()
        precondition(model.mode == .requesting)
        let oldGrant = permission!
        model.stop()
        oldGrant(true)
        await settle()
        precondition(fake.starts == 0 && model.mode == .idle, "Late grant reopened stopped microphone")

        model.startTuning()
        permission!(false)
        await settle()
        precondition(model.permissionDenied && model.mode == .idle && fake.starts == 0, "Denial did not return to idle")

        model.startTuning()
        model.sceneChanged(active: false, background: false) // System permission sheet.
        permission!(true)
        await settle()
        precondition(fake.starts == 0 && model.mode == .requesting, "Opened while inactive")
        model.sceneChanged(active: true, background: false)
        precondition(fake.starts == 1 && model.mode == .tuning, "Grant could not finish after permission sheet")
        report!(.success(PitchObservation(rms: 0.1, reading: PitchReading(frequency: 82.4, cents: 0, note: "E2"))))
        await settle()
        precondition(model.reading?.note == "E2", "Reading was not delivered")
        model.sceneChanged(active: false, background: true)
        precondition(fake.stops == 1 && model.mode == .idle && model.reading == nil, "Background did not release microphone")
        report!(.success(PitchObservation(rms: 0.1, reading: PitchReading(frequency: 82.4, cents: 0, note: "E2"))))
        model.sceneChanged(active: true, background: false)
        await settle()
        precondition(model.reading == nil && fake.starts == 1, "Stale reading or automatic audio resume")

        model.startTuning()
        let backgroundGrant = permission!
        model.sceneChanged(active: false, background: true)
        backgroundGrant(true)
        await settle()
        model.sceneChanged(active: true, background: false)
        precondition(fake.starts == 1 && model.mode == .idle, "Background permission request resumed")

        model.startTuning()
        let supersededGrant = permission!
        model.stop()
        model.startTuning()
        supersededGrant(true)
        await settle()
        precondition(fake.starts == 1, "Superseded request started a newer session")
        permission!(true)
        await settle()
        precondition(fake.starts == 2 && model.mode == .tuning)
        report!(.failure(AudioFailure.invalidSamples))
        await settle()
        precondition(fake.stops == 2 && model.mode == .idle && !model.notice.isEmpty, "Capture failure did not clean up")
        print("Passed native lifecycle checks: late/cancelled grants, denial, permission-sheet activation, background, stale readings, superseded requests, capture failure. Hardware is faked.")
    }
}
