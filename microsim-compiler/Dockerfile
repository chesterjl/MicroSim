FROM node:20-bookworm-slim

# Install system utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install arduino-cli binary to /usr/local/bin
RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | BINDIR=/usr/local/bin sh

# Pre-fetch AVR platform cores into container layer.
# Only ONE core install block should ever exist in this file -- a second
# `arduino-cli core install arduino:avr` further down does nothing but
# re-run an expensive step and invalidate layer caching for no reason.
RUN arduino-cli core update-index && \
    arduino-cli core install arduino:avr
RUN arduino-cli lib update-index

# Arduino LIBRARY packages -- these are separate from the core above.
# NOTE: some commonly-`#include`d headers are already BUNDLED with
# arduino:avr and need NOTHING here -- adding them again via `lib install`
# risks a "multiple libraries found" conflict between the bundled copy and
# a separately installed one. Bundled already, do NOT add below:
#   Wire.h, SPI.h, EEPROM.h, SoftwareSerial.h, Stepper.h
#
# Only add libraries here that are genuinely NOT part of the core, the
# same way you'd add them via the Arduino IDE's Library Manager for a
# fresh install.
#
# One `arduino-cli lib install` per line keeps Docker's layer caching
# working well -- adding a new library later only re-runs from that new
# line down, instead of invalidating every library already installed
# above it. Keep this list roughly aligned with README.md's part roadmap
# so a newly-added part's sketches compile without a Dockerfile scramble.

# LCD 16x2 (I2C) -- currently building
RUN arduino-cli lib install "LiquidCrystal I2C"

# Servo MG90 -- bundled with arduino:avr in theory, but installing
# explicitly here has proven necessary in practice (see: the fatal error
# we hit before adding this line) -- cheap insurance either way.
RUN arduino-cli lib install "Servo"

# Temperature Sensor -- next on the roadmap. DHT needs its own sensor
# abstraction dependency installed separately, or arduino-cli's dependency
# resolution will fail on #include <Adafruit_Sensor.h> inside DHT.h itself.
RUN arduino-cli lib install "Adafruit Unified Sensor"
RUN arduino-cli lib install "DHT sensor library"

# Ultrasonic HC-SR04 -- we emulate this part with our own manual
# pulseIn()-based cycle-accurate device (see engine/, circuitStore.ts),
# but plenty of real-world sketches people paste in will `#include
# <NewPing.h>` instead of hand-rolling the pulse timing -- install it so
# those compile too, even though our emulation only reacts to the raw
# TRIG/ECHO pins either way.
RUN arduino-cli lib install "NewPing"

# PhotoResistor / analog light sensor sketches occasionally reach for
# this rather than a raw analogRead() -- cheap to have available.
# RUN arduino-cli lib install "Adafruit ADS1X15"
RUN arduino-cli lib list

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]