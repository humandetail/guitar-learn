import SwiftUI
#if os(iOS)
import UIKit
#endif

struct ContentView: View {
    @StateObject private var audio = AppAudioModel()
    @Environment(\.scenePhase) private var scenePhase
    @State private var tab = 0

    var body: some View {
        TabView(selection: $tab) {
            NavigationStack { TunerView(audio: audio) }
                .tabItem { Label("调音", systemImage: "waveform") }.tag(0)
            NavigationStack { MetronomeView(audio: audio) }
                .tabItem { Label("节拍", systemImage: "metronome") }.tag(1)
            NavigationStack { AboutView() }
                .tabItem { Label("使用说明", systemImage: "info.circle") }.tag(2)
        }
        .tint(Color(red: 0.17, green: 0.32, blue: 0.83))
        .onChange(of: tab) { _, _ in audio.stop() }
        .onChange(of: scenePhase) { _, phase in
            audio.sceneChanged(active: phase == .active, background: phase == .background)
        }
    }
}

struct TunerView: View {
    @ObservedObject var audio: AppAudioModel
    @Environment(\.openURL) private var openURL
    private var running: Bool { audio.mode == .requesting || audio.mode == .tuning }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("先拨最粗的那根弦").font(.title2.bold())
                    Text("第 6 弦 · E2 · 标准调弦").foregroundStyle(.secondary)
                }
                VStack(spacing: 16) {
                    Text(audio.reading?.note ?? "—")
                        .font(.system(size: 72, weight: .semibold, design: .rounded))
                        .accessibilityLabel("当前音高 \(audio.reading?.note ?? "未检测")")
                    if let reading = audio.reading {
                        Text(String(format: "%+.0f 音分 · %.1f Hz", reading.cents, reading.frequency))
                            .font(.title3.monospacedDigit())
                    } else {
                        Text("目标 82.41 Hz").font(.title3.monospacedDigit()).foregroundStyle(.secondary)
                    }
                    CentsMeter(cents: audio.reading?.cents)
                    Text(audio.reading?.instruction ?? (audio.mode == .requesting ? "等待麦克风授权" : audio.mode == .tuning ? "等待稳定琴音" : "准备调音"))
                        .font(.title2.bold())
                        .foregroundStyle(audio.reading?.isInTune == true ? Color.green : Color.primary)
                }
                .frame(maxWidth: .infinity).padding(24)
                .background(.quaternary.opacity(0.5), in: RoundedRectangle(cornerRadius: 24))

                if audio.mode == .tuning {
                    VStack(alignment: .leading, spacing: 8) {
                        ProgressView(value: audio.level).accessibilityLabel("麦克风输入音量")
                        Text("按住其他琴弦，只拨第 6 弦空弦，让声音自然延续。")
                            .foregroundStyle(.secondary)
                    }
                }
                if !audio.notice.isEmpty { Text(audio.notice).foregroundStyle(.secondary) }
                if audio.permissionDenied {
                    #if os(iOS)
                    Button("打开麦克风设置") {
                        if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                    }.buttonStyle(.bordered)
                    #endif
                }
                Text("轻转弦钮，一次只调整一点。偏差过大时先核对琴弦；本版只验证 E2，不判断其他弦是否调准。")
                    .font(.callout).foregroundStyle(.secondary)
                Text("识别精度仍待真机验收，暂不替代独立调音器。")
                    .font(.footnote).foregroundStyle(.secondary)
            }.padding(20)
        }
        .navigationTitle("调音")
        .safeAreaInset(edge: .bottom) {
            Button {
                if running { audio.stop(message: "调音已停止，麦克风已释放。") }
                else { audio.startTuning() }
            } label: {
                Label(audio.mode == .requesting ? "取消启动" : running ? "停止调音" : "开始调音",
                      systemImage: running ? "stop.fill" : "mic.fill")
                    .frame(maxWidth: .infinity).padding(.vertical, 8)
            }
            .buttonStyle(.borderedProminent).controlSize(.large)
            .padding().background(.regularMaterial)
        }
    }
}

struct CentsMeter: View {
    let cents: Double?
    var body: some View {
        VStack(spacing: 8) {
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule().fill(.secondary.opacity(0.2)).frame(height: 6)
                    Rectangle().fill(.green.opacity(0.4))
                        .frame(width: geometry.size.width * 0.1, height: 20)
                        .offset(x: geometry.size.width * 0.45)
                    if let cents {
                        Circle().fill(Color.accentColor).frame(width: 16, height: 16)
                            .offset(x: (geometry.size.width - 16) * (max(-50, min(50, cents)) + 50) / 100)
                    }
                }.frame(height: 24)
            }.frame(height: 24)
            HStack { Text("偏低"); Spacer(); Text("±5 音分"); Spacer(); Text("偏高") }
                .font(.caption).foregroundStyle(.secondary)
        }.accessibilityElement(children: .ignore)
            .accessibilityLabel(cents.map { String(format: "偏差 %+.0f 音分", $0) } ?? "等待音高")
    }
}

struct MetronomeView: View {
    @ObservedObject var audio: AppAudioModel
    private var running: Bool { audio.mode == .metronome }
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text("先跟着节拍数：1、2、3、4").font(.title2.bold())
                Text("每小节 4 拍，第一拍重音。初学可从 60 BPM 开始。")
                    .foregroundStyle(.secondary)
                VStack(spacing: 24) {
                    Text("\(audio.bpm)").font(.system(size: 72, weight: .semibold, design: .rounded)).monospacedDigit()
                    Text("BPM · 每分钟拍数").foregroundStyle(.secondary)
                    HStack(spacing: 12) {
                        ForEach(0..<4) { beat in
                            Text("\(beat + 1)").font(.title2.bold())
                                .frame(maxWidth: .infinity).frame(height: 52)
                                .background(audio.beat == beat ? Color.accentColor : Color.secondary.opacity(0.12), in: Circle())
                                .foregroundStyle(audio.beat == beat ? Color.white : Color.primary)
                        }
                    }.accessibilityElement(children: .ignore).accessibilityLabel("四拍节奏")
                }.frame(maxWidth: .infinity).padding(24)
                    .background(.quaternary.opacity(0.5), in: RoundedRectangle(cornerRadius: 24))
                Stepper("速度 \(audio.bpm) BPM", value: $audio.bpm, in: 30...240)
                    .disabled(running)
                HStack {
                    ForEach([60, 80, 100], id: \.self) { bpm in
                        Button("\(bpm) BPM") { audio.bpm = bpm }
                            .buttonStyle(.bordered).frame(maxWidth: .infinity)
                    }
                }.disabled(running)
                Text(running ? "停止后可以调整速度。" : "拍手跟上四拍，再尝试每拍拨一次空弦。")
                    .foregroundStyle(.secondary)
                if !audio.notice.isEmpty { Text(audio.notice).foregroundStyle(.secondary) }
                Text("切换页面或锁屏会停止播放；回到 App 后请手动开始。")
                    .font(.footnote).foregroundStyle(.secondary)
            }.padding(20)
        }
        .navigationTitle("节拍器")
        .safeAreaInset(edge: .bottom) {
            Button {
                if running { audio.stop(message: "节拍器已停止。") } else { audio.startMetronome() }
            } label: {
                Label(running ? "停止节拍" : "开始节拍", systemImage: running ? "stop.fill" : "play.fill")
                    .frame(maxWidth: .infinity).padding(.vertical, 8)
            }.buttonStyle(.borderedProminent).controlSize(.large)
                .padding().background(.regularMaterial)
        }
    }
}

struct AboutView: View {
    var body: some View {
        List {
            Section("六弦 · iPhone 首版") {
                Text("先验证手机收音与节拍，再逐步加入零基础课程、分级曲库和练习记录。")
                Text("本版支持第 6 弦 E2 调音和 4/4 四分音符节拍。基准音固定 A4 = 440 Hz。")
            }
            Section("第一次练习") {
                Text("1. 在安静的地方，把 iPhone 放在琴旁。")
                Text("2. 点击「开始调音」，允许麦克风，只拨最粗的第 6 弦。")
                Text("3. 停止调音，打开节拍器，从 60 BPM 跟拍开始。")
            }
            Section("收音与隐私") {
                Text("声音只在设备内用于判断音高，不保存录音，不上传。离开调音页或锁屏后释放麦克风。")
                Text("目前的识别库存在已知误差，尚未通过 iPhone 真琴精度与响应验收。")
            }
            Section("开源许可") {
                NavigationLink("guitar-audio-kit · 0.0.2 · MIT") {
                    ScrollView {
                        Text(license).font(.footnote).textSelection(.enabled).padding()
                    }.navigationTitle("开源许可")
                }
            }
        }.navigationTitle("使用说明")
    }

    private var license: String {
        guard let url = Bundle.main.url(forResource: "GuitarAudioKit-LICENSE", withExtension: "txt"),
              let text = try? String(contentsOf: url, encoding: .utf8) else { return "MIT · Copyright (c) 2026 Kretov Artem" }
        return text
    }
}
