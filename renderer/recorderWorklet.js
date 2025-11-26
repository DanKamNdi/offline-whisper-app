class RecorderProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const inputChannel = inputs[0]?.[0];
    if (inputChannel) {
      // Copy the buffer because AudioWorklet reuses Float32Array instances
      const clone = new Float32Array(inputChannel.length);
      clone.set(inputChannel);
      this.port.postMessage(clone);
    }
    return true;
  }
}

registerProcessor('recorder-processor', RecorderProcessor);

