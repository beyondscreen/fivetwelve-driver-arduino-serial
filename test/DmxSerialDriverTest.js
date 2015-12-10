import expect from 'expect.js';
import stream from 'stream';

import DmxSerialDriver from '../lib/DmxSerialDriver';

describe('DmxSerialDriver', () => {
  var serialport;

  beforeEach(() => {
    serialport = new stream.Writable();
    serialport.isOpen = function() {};
    serialport.data = null;
    serialport._write = function(chunk, encoding, callback) {
      if (!serialport.data) {
        serialport.data = chunk;
      } else {
        serialport.data = Buffer.concat(
          [serialport.data, chunk],
          serialport.data.length + chunk.length
        );
      }
      callback();
    };
    serialport.drain = (callback) => process.nextTick(callback);
  });


  describe('constructor()', () => {
    it('will initialize the serialport', () => {
      var dmx = new DmxSerialDriver(serialport);

      expect(dmx).to.be.a(DmxSerialDriver);
    });
  });


  describe('send()', () => {
    var dmxSerial, dmxBuffer;

    beforeEach(() => {
      dmxSerial = new DmxSerialDriver(serialport);
      serialport.emit('open');

      dmxBuffer = new Buffer(512);
      dmxBuffer.fill(0);
    });


    it('initially sends all values to ensure a defined state', done => {
      dmxBuffer[0] = 0xbc;
      dmxSerial.send(dmxBuffer)
        .then(() => {
          let dmxData = serialport.data;

          expect(dmxData).to.have.length(3 * 512);
          expect(dmxData.readUInt16BE(0)).to.equal(1);
          expect(dmxData.readUInt8(2)).to.equal(0xbc);
        })
        .then(done).catch(done);
    });


    it('sends only changed values after that', done => {
      dmxSerial.send(dmxBuffer)
        .then(() => {
          serialport.data = null;
          dmxBuffer[31] = 0xab;
          dmxBuffer[255] = 0xcd;

          return dmxSerial.send(dmxBuffer);
        })

        .then(() => {
          let dmxData = serialport.data;

          expect(dmxData).to.have.length(6);
          // check channels
          expect(dmxData.readUInt16BE(0)).to.equal(32);
          expect(dmxData.readUInt16BE(3)).to.equal(256);
          // check values
          expect(dmxData.readUInt8(2)).to.equal(0xab);
          expect(dmxData.readUInt8(5)).to.equal(0xcd);
        })
        .then(done).catch(done);
    });
  });
});
