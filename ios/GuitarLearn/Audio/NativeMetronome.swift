import AVFoundation

// The player loops a whole PCM bar on its sample clock. UI timers never create clicks.
final class NativeMetronome {
    private let engine = AVAudioEngine()
    private let player = AVAudioPlayerNode()
    private var bar: ClickBar?

    func start(bpm: Int) throws {
        let rate = engine.outputNode.outputFormat(forBus: 0).sampleRate
        guard rate > 0, let format = AVAudioFormat(standardFormatWithSampleRate: rate, channels: 1) else {
            throw AudioFailure.noInput
        }
        let bar = ClickBar(bpm: bpm, sampleRate: rate)
        guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(bar.samples.count)),
              let channel = buffer.floatChannelData?[0] else { throw AudioFailure.noInput }
        buffer.frameLength = buffer.frameCapacity
        bar.samples.withUnsafeBufferPointer { channel.update(from: $0.baseAddress!, count: $0.count) }
        self.bar = bar
        engine.attach(player)
        engine.connect(player, to: engine.mainMixerNode, format: format)
        player.scheduleBuffer(buffer, at: nil, options: .loops)
        engine.prepare()
        do { try engine.start(); player.play() } catch { stop(); throw error }
    }

    var beat: Int? {
        guard let bar, let nodeTime = player.lastRenderTime,
              let time = player.playerTime(forNodeTime: nodeTime) else { return nil }
        return bar.beat(at: time.sampleTime)
    }

    func stop() { player.stop(); engine.stop(); bar = nil }
    deinit { stop() }
}
