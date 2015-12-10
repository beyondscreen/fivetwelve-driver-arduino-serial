/**
 * Simple serial to DMX driver that only sends changes to the serialport.
 */
export default class DmxSerialDriver {
  constructor(serialport, numChannels = 512) {
    this.serialport = serialport;
    this.dmxBuffer = new Buffer(numChannels);
    this.dmxBuffer.fill(0);

    /**
     * Will be set to true once the first packet has been sent.
     * @type {boolean}
     */
    this.initialized = false;
    this.ready = this.openSerialport();
  }

  openSerialport() {
    if (this.serialport.isOpen()) {
      return Promise.resolve(this.serialport);
    }

    return new Promise((resolve, reject) => {
      this.serialport.on('open', error => {
        if (error) {
          return reject(error);
        }

        return resolve(this.serialport);
      });
    });
  }

  /**
   * sends the given values to the dmx-interface over the serialport
   * @param {Buffer} values A buffer with the dmx-values to be sent.
   * @return {Promise} A promise that will be resolved when the buffer is
   *   completely sent.
   */
  send(values) {
    let diff = [],
      n = Math.min(values.length, this.dmxBuffer.length);

    // determine changes and update local state
    for (let i = 0; i < n; i++) {
      if (!this.initialized || this.dmxBuffer[i] !== values[i]) {
        diff.push([i + 1, values[i]]);
        this.dmxBuffer[i] = values[i];
      }
    }
    this.initialized = true;

    if (diff.length === 0) {
      return Promise.resolve();
    }

    // bring diff into binary format
    let msgBuf = new Buffer(diff.length * 3);
    for (let i = 0; i < diff.length; i++) {
      msgBuf.writeUInt16BE(diff[i][0], i * 3);
      msgBuf.writeUInt8(diff[i][1], i * 3 + 2);
    }

    return this.write(msgBuf);
  }

  /**
   * Writes the raw data to the serialport.
   * @param {Buffer} buffer A buffer to be sent to the serialport.
   * @returns {Promise} a promise that is resolved when the buffer was
   *                    completely sent.
   * @private
   */
  write(buffer) {
    return this.ready.then(serialport => {
      return new Promise(resolve => {
        serialport.write(buffer,
          () => serialport.drain(() => resolve()));
      });
    });
  }
}
