export interface Project {
  id: string;
  title: string;
  description?: string;
  authorId: number;
  author: string;
  boardType: "arduino" | "esp32" | "raspberry-pi";
  boardLabel: string;
  hearts: number;
  circuitImage: string;
  isPublic: boolean;
  code: string;
  createdAt: string;
}

export const COMMUNITY_PROJECTS: Project[] = [
  {
    id: "proj-c1",
    title: "Ultrasonic Distance Radar & Alarm",
    description:
      "Detects objects with an HC-SR04 sensor and visualizes proximity using an LED scale and dynamic Serial feedback.",
    authorId: 101,
    author: "Chester Lauzon",
    boardType: "arduino",
    boardLabel: "Arduino Uno",
    hearts: 142,
    circuitImage:
      "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&w=800&q=80",
    isPublic: true,
    createdAt: "2026-08-15T10:00:00.000Z",
    code: `// Ultrasonic Distance Radar
const int TRIG_PIN = 9;
const int ECHO_PIN = 10;

void setup() {
  Serial.begin(9600);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
}

void loop() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);

  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);

  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH);
  int distance = duration * 0.034 / 2;

  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");

  delay(200);
}`,
  },
  {
    id: "proj-c2",
    title: "ESP32 WiFi Weather Station",
    description:
      "Fetches ambient sensor data and outputs real-time temperature telemetry over serial communication.",
    authorId: 102,
    author: "Elena Rostova",
    boardType: "esp32",
    boardLabel: "ESP32 DevKit",
    hearts: 89,
    circuitImage:
      "https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&w=800&q=80",
    isPublic: true,
    createdAt: "2026-08-18T14:30:00.000Z",
    code: `void setup() {
  Serial.begin(115200);
  Serial.println("Initializing ESP32 Station...");
}

void loop() {
  Serial.println("Telemetry packet sent!");
  delay(1000);
}`,
  },
  {
    id: "proj-c3",
    title: "Raspberry Pi Pico Servo Wave Generator",
    description:
      "Precise PWM signal generation driving multi-servo motors with smooth Interpolated easing curves.",
    authorId: 103,
    author: "DevLab99",
    boardType: "raspberry-pi",
    boardLabel: "Raspberry Pi Pico",
    hearts: 215,
    circuitImage:
      "https://images.unsplash.com/photo-1608564697071-ddf911d81370?auto=format&fit=crop&w=800&q=80",
    isPublic: true,
    createdAt: "2026-08-20T09:15:00.000Z",
    code: `from machine import Pin, PWM
import time

pwm = PWM(Pin(15))
pwm.freq(50)

while True:
    for duty in range(1000, 9000, 100):
        pwm.duty_u16(duty)
        time.sleep(0.01)`,
  },
  {
    id: "proj-c4",
    title: "RGB Potentiometer Dimmer Matrix",
    description:
      "Smooth analog voltage sampling mapped across 3 potentiometers controlling multi-color LED output.",
    authorId: 104,
    author: "Marcus Vance",
    boardType: "arduino",
    boardLabel: "Arduino Uno",
    hearts: 64,
    circuitImage:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
    isPublic: true,
    createdAt: "2026-08-21T18:45:00.000Z",
    code: `void setup() {
  pinMode(A0, INPUT);
}

void loop() {
  int val = analogRead(A0);
  Serial.println(val);
  delay(50);
}`,
  },
  {
    id: "proj-c5",
    title: "Basic LED Controller",
    description: "Simple single-LED blinking circuit with standardized delays.",
    authorId: 105,
    author: "CircuitLab",
    boardType: "arduino",
    boardLabel: "Arduino Uno",
    hearts: 31,
    circuitImage:
      "https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&w=800&q=80",
    isPublic: true,
    createdAt: "2026-08-22T11:20:00.000Z",
    code: `const int LED_PIN = 13;

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  delay(500);

  digitalWrite(LED_PIN, LOW);
  delay(500);
}`,
  },
];

export const MY_PROJECTS: Project[] = [
  {
    id: "my-proj-1",
    title: "Obstacle Avoidance Robot",
    description:
      "4WD chassis controller using HC-SR04 ultrasonic sensor and L298N motor driver module.",
    authorId: 101,
    author: "Chester Lauzon",
    boardType: "arduino",
    boardLabel: "Arduino Uno",
    hearts: 12,
    circuitImage:
      "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&w=600&q=80",
    isPublic: true,
    createdAt: "2026-08-22T22:00:00.000Z",
    code: `// Obstacle Avoidance Controller
const int TRIG = 9;
const int ECHO = 10;

void setup() {
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
}

void loop() {
  // Avoidance logic here
}`,
  },
  {
    id: "my-proj-2",
    title: "4DOF Manipulator Arm",
    description: "Multi-servo robotic arm controller with position kinemactics.",
    authorId: 101,
    author: "Chester Lauzon",
    boardType: "arduino",
    boardLabel: "Arduino Uno",
    hearts: 5,
    circuitImage:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
    isPublic: false,
    createdAt: "2026-08-21T15:30:00.000Z",
    code: `#include <Servo.h>

Servo base;
void setup() {
  base.attach(9);
}

void loop() {
  base.write(90);
}`,
  },
  {
    id: "my-proj-3",
    title: "Smart Temp Monitor",
    description:
      "DHT11 telemetry logger with 16x2 I2C LCD readout and status alert LEDs.",
    authorId: 101,
    author: "Chester Lauzon",
    boardType: "esp32",
    boardLabel: "ESP32 DevKit",
    hearts: 8,
    circuitImage:
      "https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&w=800&q=80",
    isPublic: true,
    createdAt: "2026-08-19T08:00:00.000Z",
    code: `void setup() {
  Serial.begin(115200);
}

void loop() {
  // Read sensor
}`,
  },
  {
    id: "my-proj-4",
    title: "Smart PIN Door Lock",
    description: "4x4 Keypad interface connected to servo lock latch.",
    authorId: 101,
    author: "Chester Lauzon",
    boardType: "raspberry-pi",
    boardLabel: "Raspberry Pi Pico",
    hearts: 2,
    circuitImage:
      "https://images.unsplash.com/photo-1608564697071-ddf911d81370?auto=format&fit=crop&w=800&q=80",
    isPublic: false,
    createdAt: "2026-04-10T12:00:00.000Z",
    code: `import time
print("Security System Active")`,
  },
];