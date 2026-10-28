import Foundation
import JavaScriptCore

enum AudioFailure: LocalizedError {
    case detectorUnavailable
    case noInput
    case invalidSamples
    var errorDescription: String? {
        switch self {
        case .detectorUnavailable: return "调音组件加载失败，请重新安装 App。"
        case .noInput: return "没有可用的麦克风，请断开耳机后重试。"
        case .invalidSamples: return "收音已中断，请重新开始。"
        }
    }
}

// One context per capture session, used only on that session's serial processing queue.
final class PitchBridge {
    private let context: JSContext
    private let detector: JSValue

    init(sampleRate: Double, script: String) throws {
        guard sampleRate.isFinite, sampleRate > 0, let context = JSContext() else {
            throw AudioFailure.detectorUnavailable
        }
        context.evaluateScript(script)
        guard context.exception == nil,
              let factory = context.objectForKeyedSubscript("createGuitarDetector"), !factory.isUndefined,
              let detector = factory.call(withArguments: [sampleRate]), !detector.isUndefined,
              context.exception == nil else { throw AudioFailure.detectorUnavailable }
        self.context = context
        self.detector = detector
    }

    func reset() {
        context.exception = nil
        detector.invokeMethod("reset", withArguments: [])
    }

    func analyze(_ window: PCMWindow) throws -> PitchObservation {
        context.exception = nil
        guard let value = detector.invokeMethod("analyze", withArguments: [window.samples, window.endTime]),
              context.exception == nil, let result = value.toDictionary(),
              let rms = result["rms"] as? Double, rms.isFinite else { throw AudioFailure.invalidSamples }
        guard let frequency = result["frequency"] as? Double else { return PitchObservation(rms: rms, reading: nil) }
        guard let cents = result["cents"] as? Double, let note = result["note"] as? String,
              frequency.isFinite, frequency > 0, cents.isFinite else { throw AudioFailure.invalidSamples }
        return PitchObservation(rms: rms, reading: PitchReading(frequency: frequency, cents: cents, note: note))
    }
}
