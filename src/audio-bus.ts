let microphone = false
let owner: symbol | null = null
const stopListeners = new Set<() => void>()
const stateListeners = new Set<() => void>()
const referenceStops = new Set<() => void>()
export const isMicrophoneActive = () => microphone
export function subscribeMicrophoneStop(callback: () => void) { stopListeners.add(callback); return () => { stopListeners.delete(callback) } }
export function subscribeAudioState(callback: () => void) { stateListeners.add(callback); return () => { stateListeners.delete(callback) } }
export function registerReferenceStop(callback: () => void) { referenceStops.add(callback); return () => { referenceStops.delete(callback) } }
export function claimMicrophone() {
  stopListeners.forEach(stop => stop())
  referenceStops.forEach(stop => stop())
  const token = Symbol('microphone')
  owner = token; microphone = true
  stateListeners.forEach(listener => listener())
  return () => {
    if (owner !== token) return
    owner = null; microphone = false
    stateListeners.forEach(listener => listener())
  }
}
export function stopMicrophone() { stopListeners.forEach(stop => stop()) }
