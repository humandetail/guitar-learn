import Foundation

struct PCMWindow {
    let samples: [Float]
    let endTime: Double
}

// Tap sizes vary by device. Always feed the detector 4096 samples, at 2048-frame hops.
struct PCMWindows {
    private var samples: [Float] = []
    private var startFrame: Int64 = 0
    private var expectedFrame: Int64?

    mutating func append(_ chunk: [Float], at frame: Int64, sampleRate: Double) -> (reset: Bool, windows: [PCMWindow]) {
        let discontinuity = expectedFrame.map { $0 != frame } ?? false
        if discontinuity { samples.removeAll(keepingCapacity: true) }
        if samples.isEmpty { startFrame = frame }
        expectedFrame = frame + Int64(chunk.count)
        samples.append(contentsOf: chunk)
        var windows: [PCMWindow] = []
        while samples.count >= 4096 {
            windows.append(PCMWindow(samples: Array(samples.prefix(4096)), endTime: Double(startFrame + 4096) / sampleRate))
            samples.removeFirst(2048)
            startFrame += 2048
        }
        return (discontinuity, windows)
    }
}

struct ClickBar {
    let samples: [Float]
    let beatFrames: [Int]

    init(bpm: Int, sampleRate: Double) {
        precondition((30...240).contains(bpm) && sampleRate > 0)
        let framesPerBeat = sampleRate * 60 / Double(bpm)
        let length = Int((framesPerBeat * 4).rounded())
        beatFrames = (0..<4).map { Int((Double($0) * framesPerBeat).rounded()) }
        var result = [Float](repeating: 0, count: length)
        let clickLength = Int(sampleRate * 0.03)
        for (beat, start) in beatFrames.enumerated() {
            let frequency = beat == 0 ? 1200.0 : 800.0
            let volume = beat == 0 ? 0.18 : 0.12
            for offset in 0..<min(clickLength, length - start) {
                let t = Double(offset) / sampleRate
                // Short attack and decay avoid discontinuities at loop boundaries.
                let attack = min(1, t / 0.001)
                let release = max(0, 1 - t / 0.03)
                result[start + offset] = Float(sin(2 * .pi * frequency * t) * volume * attack * release * exp(-t * 110))
            }
        }
        samples = result
    }

    func beat(at frame: Int64) -> Int {
        let position = Int(max(0, frame) % Int64(samples.count))
        return beatFrames.lastIndex(where: { $0 <= position }) ?? 0
    }
}

struct PitchReading {
    let frequency: Double
    let cents: Double
    let note: String
    var isInTune: Bool { abs(cents) <= 5 + 1e-8 }
    var instruction: String {
        if isInTune { return "已调准" }
        if abs(cents) > 100 + 1e-8 { return "先核对琴弦" }
        return cents < 0 ? "稍微调高" : "稍微调低"
    }
}

struct PitchObservation {
    let rms: Double
    let reading: PitchReading?
}
