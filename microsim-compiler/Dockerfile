FROM node:20-bookworm-slim

# Install system utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install arduino-cli binary to /usr/local/bin
RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | BINDIR=/usr/local/bin sh

# Pre-fetch AVR platform cores into container layer
RUN arduino-cli core update-index && \
    arduino-cli core install arduino:avr

# Arduino LIBRARY packages -- these are separate from the core above.
# NOTE: some commonly-`#include`d headers (Servo.h, Wire.h, SPI.h,
# EEPROM.h, SoftwareSerial.h) are already BUNDLED with arduino:avr and
# need nothing here -- adding them again via `lib install` risks a
# "multiple libraries found" conflict between the bundled copy and a
# separately installed one. Only add libraries here that are genuinely
# NOT part of the core, the same way you'd add them via the Arduino IDE's
# Library Manager for a fresh install.
#
# One `arduino-cli lib install` per line keeps Docker's layer caching
# working well -- adding a new library later only re-runs from that new
# line down, instead of invalidating every library already installed
# above it.
RUN arduino-cli lib install "LiquidCrystal I2C"
# RUN arduino-cli lib install "DHT sensor library"      # for #include <DHT.h>
# RUN arduino-cli lib install "Adafruit Unified Sensor"  # DHT library's own dependency
# RUN arduino-cli lib install "NewPing"                  # alternate HC-SR04 library some sketches expect

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]