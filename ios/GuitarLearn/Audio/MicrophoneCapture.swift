import AVFoundation
import Foundation

protocol MicrophoneSession: AnyObject {
    func start() throws
    func stop()
}

final class MicrophoneCapture: MicrophoneSession {
    private let engine = AVAudioEngine()
    private let queue = DispatchQueue(label: "guitar.pitch", qos: .userInitiated)
    private let lock = NSLock()
    private var busy = false
    private var stopped = false
    private var tapped = false
    private var windows = PCMWindows()
    private var bridge: PitchBridge?
    private let report: (Result<PitchObservation, Error>) -> Void

    init(report: @escaping (Result<PitchObservation, Error>) -> Void) { self.report = report }

    func start() throws {
        let input = engine.inputNode
        let format = input.outputFormat(forBus: 0)
        guard format.sampleRate > 0, format.channelCount > 0 else { throw AudioFailure.noInput }
        guard let url = Bundle.main.url(forResource: "PitchDetector", withExtension: "js") else {
            throw AudioFailure.detectorUnavailable
        }
        let script = try String(contentsOf: url, encoding: .utf8)
        try queue.sync { bridge = try PitchBridge(sampleRate: format.sampleRate, script: script) }
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, time in
            guard let self, let channel = buffer.floatChannelData?[0], time.isSampleTimeValid else { return }
            // At most one job: a slow detector must never build a queue of stale sound.
            self.lock.lock()
            let accept = !self.busy && !self.stopped
            if accept { self.busy = true }
            self.lock.unlock()
            guard accept else { return }
            let samples = Array(UnsafeBufferPointer(start: channel, count: Int(buffer.frameLength)))
            let capturedAt = ProcessInfo.processInfo.systemUptime
            let frame = time.sampleTime
            self.queue.async { [weak self] in
                guard let self else { return }
                defer { self.lock.lock(); self.busy = false; self.lock.unlock() }
                self.lock.lock()
                let cancelled = self.stopped
                self.lock.unlock()
                guard !cancelled, ProcessInfo.processInfo.systemUptime - capturedAt < 0.15 else { return }
                let batch = self.windows.append(samples, at: frame, sampleRate: format.sampleRate)
                if batch.reset { self.bridge?.reset() }
                do {
                    var latest: PitchObservation?
                    for window in batch.windows { latest = try self.bridge?.analyze(window) }
                    if let latest {
                        // Don't present a stable result from a stalled analysis job.
                        if ProcessInfo.processInfo.systemUptime - capturedAt < 0.15 {
                            self.report(.success(latest))
                        } else {
                            self.bridge?.reset()
                            self.report(.success(PitchObservation(rms: 0, reading: nil)))
                        }
                    }
                } catch { self.report(.failure(error)) }
            }
        }
        tapped = true
        engine.prepare()
        do { try engine.start() } catch { stop(); throw error }
    }

    func stop() {
        lock.lock(); stopped = true; lock.unlock()
        engine.stop()
        if tapped { engine.inputNode.removeTap(onBus: 0); tapped = false }
    }

    deinit { stop() }
}
