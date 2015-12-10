#include <Arduino.h>
#include <DmxSimple.h>

#define SERIAL_BAUDRATE 57600

#define PIN_DMX_OUT 5
#define PIN_TX_EN 6
#define PIN_RX_INV_EN 7


void setup() {
  Serial.begin(SERIAL_BAUDRATE);
  DmxSimple.usePin(PIN_DMX_OUT);

  // set transceiver into output-mode
  pinMode(PIN_TX_EN, OUTPUT);
  digitalWrite(PIN_TX_EN, HIGH);

  pinMode(PIN_RX_INV_EN, OUTPUT);
  digitalWrite(PIN_RX_INV_EN, HIGH);
}


uint16_t channel;
uint8_t value;


/**
 * receive data from serialport and update the DMX-Universe.
 */
void loop() {
  // wait until at least 3 bytes are available
  while(Serial.available() < 3);

  // read channel (uint16BE) and value (uint8) from the serial-buffer
  channel = (Serial.read() << 8) + Serial.read();
  value = Serial.read();


  #ifdef SERIAL_DEBUG
    Serial.print("RECV: 0x");
    Serial.print(channel, HEX);
    Serial.print(" - ");
    Serial.print(channel & 0x02ff, DEC);
    Serial.print(" - ");
    Serial.print(value, DEC);
    Serial.println();
  #endif


  // if MSB is set, use the given address to set the number of channels.
  if (channel & 0x8000) {
    #ifdef SERIAL_DEBUG
      Serial.print("Set number of channels: ");
      Serial.print(channel & 0x2ff, DEC);
      Serial.println();
    #endif

    DmxSimple.maxChannel(channel & 0x02ff);

    return;
  }

  // otherwise write value to the DMX-Driver
  #ifdef SERIAL_DEBUG
    Serial.print("Set channel value: ");
    Serial.print(channel & 0x2ff, DEC);
    Serial.print(" - ");
    Serial.print(value, DEC);
    Serial.println();
  #endif

  DmxSimple.write(channel & 0x02ff, value);
}
