import Foundation

var checks = 0
func check(_ condition: @autoclosure () -> Bool, _ message: String) {
    precondition(condition(), message)
    checks += 1
}

// Arbitrary tap buffers must yield overlapping, continuous 4096-frame windows.
for chunkSize in [256, 1024, 2048, 4096, 4800] {
    var assembler = PCMWindows()
    var all: [PCMWindow] = []
    let input = (0..<24000).map { Float($0) }
    var frame = 0
    while frame < input.count {
        let end = min(frame + chunkSize, input.count)
        let batch = assembler.append(Array(input[frame..<end]), at: Int64(frame), sampleRate: 48000)
        check(!batch.reset, "Continuous capture was reset")
        all += batch.windows
        frame = end
    }
    check(all.count == 10, "Wrong window count for chunk size \(chunkSize)")
    for (index, window) in all.enumerated() {
        check(window.samples == Array(input[(index * 2048)..<(index * 2048 + 4096)]), "Window has a gap or duplicate frames")
        check(abs(window.endTime - Double(index * 2048 + 4096) / 48000) < 1e-10, "Audio timestamp drift")
    }
    let discontinuous = assembler.append(Array(repeating: 0, count: 4096), at: 30000, sampleRate: 48000)
    check(discontinuous.reset, "Dropped capture must reset stability")
    check(discontinuous.windows[0].samples.allSatisfy { $0 == 0 }, "Old audio leaked across capture gap")
}

// PCM math, not a claim about actual speaker timing or latency.
for sampleRate in [44100.0, 48000.0] {
    for bpm in 30...240 {
        let bar = ClickBar(bpm: bpm, sampleRate: sampleRate)
        let idealDuration = 240.0 / Double(bpm)
        let actualDuration = Double(bar.samples.count) / sampleRate
        let driftOver60Seconds = abs(actualDuration - idealDuration) * 60 / idealDuration
        check(driftOver60Seconds < 0.001, "PCM rounding drift exceeds 1 ms/minute")
        check(bar.samples.allSatisfy { $0.isFinite && abs($0) <= 0.18 }, "Invalid click waveform")
        check(bar.samples.first == 0 && bar.samples.last == 0, "Loop has a discontinuity")
        for beat in 0..<4 {
            let position = bar.beatFrames[beat]
            check(bar.beat(at: Int64(position)) == beat, "Visual beat has wrong boundary")
            check(bar.samples[position..<(position + 100)].contains { abs($0) > 0.01 }, "Missing audible click")
        }
        check(bar.beat(at: Int64(bar.samples.count)) == 0, "Loop does not return to beat one")
    }
}

// Execute the actual generated resource with Apple's JavaScriptCore, not only Node.
let resource = CommandLine.arguments[1]
let script = try String(contentsOfFile: resource, encoding: .utf8)
for rate in [44100.0, 48000.0] {
    let bridge = try PitchBridge(sampleRate: rate, script: script)
    var result: PitchObservation?
    for index in 0..<12 {
        let samples = (0..<4096).map { Float(0.35 * sin(2 * .pi * 82.4068892282175 * Double($0 + index * 2048) / rate)) }
        result = try bridge.analyze(PCMWindow(samples: samples, endTime: Double(index * 2048 + 4096) / rate))
        if index == 0 { check(result?.reading == nil, "Stability accepted too early") }
    }
    check(result?.reading?.note == "E2", "JavaScriptCore bridge did not detect E2")
    // These are the unmodified library's independently reproduced Node outputs for
    // this moving-phase fixture. Matching them verifies the bridge, NOT accuracy.
    let expectedLibraryFrequency = rate == 44100 ? 82.7 : 82.9
    check(abs(result!.reading!.frequency - expectedLibraryFrequency) < 1e-8, "Native bridge differs from the installed library")
    print(String(format: "JavaScriptCore E2 @ %.0f Hz sample rate: %+.2f cents (synthetic only)", rate, result!.reading!.cents))
    if !result!.reading!.isInTune { print("ACCURACY GATE FAILED: exceeds ±5 cents; original library behavior, not waived.") }
    bridge.reset()
    let silence = try bridge.analyze(PCMWindow(samples: Array(repeating: 0, count: 4096), endTime: 1))
    check(silence.reading == nil && silence.rms == 0, "Silence not cleared")
}
for value in [-5.0, 5.0] { check(PitchReading(frequency: 82, cents: value, note: "E2").isInTune, "Inclusive tuning boundary") }
check(PitchReading(frequency: 82, cents: 101, note: "E2").instruction == "先核对琴弦", "Do not direct tuning far from target")
print("Passed \(checks) native core assertions. No microphone, speaker, signing, or iPhone UI was exercised.")
