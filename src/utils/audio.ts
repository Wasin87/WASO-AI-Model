/**
 * Converts Float32Array PCM audio buffer from AudioContext mic input to 16-bit Int16 Base64 string
 */
export function floatTo16BitPCMBase64(float32Array: Float32Array): string {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true); // Little endian
  }
  
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB chunks to prevent stack overflow
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

/**
 * Decodes Base64 16-bit Int16 PCM string into AudioBuffer for 24kHz playback
 */
export function pcmBase64ToAudioBuffer(
  base64Data: string,
  audioCtx: AudioContext,
  sampleRate: number = 24000
): AudioBuffer {
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const int16View = new Int16Array(bytes.buffer);
  const numSamples = int16View.length;
  const audioBuffer = audioCtx.createBuffer(1, numSamples, sampleRate);
  const channelData = audioBuffer.getChannelData(0);

  for (let i = 0; i < numSamples; i++) {
    channelData[i] = int16View[i] / 32768.0;
  }

  return audioBuffer;
}

/**
 * Calculates audio energy volume level (0.0 to 1.0) from Float32Array for visual avatar animation
 */
export function calculateVolume(dataArray: Float32Array | Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const val = dataArray[i] > 1 ? (dataArray[i] - 128) / 128 : dataArray[i];
    sum += val * val;
  }
  const rms = Math.sqrt(sum / dataArray.length);
  return Math.min(1.0, rms * 4); // Scaled for visual pulse
}
