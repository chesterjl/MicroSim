import type { SavedProject } from "../components/parts/project/ProjectModal";

export interface CommunityProject {
  id: string;
  title: string;
  description?: string;
  author: string;
  boardType: "arduino" | "esp32" | "raspberry-pi";
  boardLabel: string;
  hearts: number;
  circuitImage: string;
  code: string;
  tags: string[];
}

export const MOCK_PROJECTS: CommunityProject[] = [
  {
    id: "proj-1",
    title: "Ultrasonic Distance Radar & Alarm",
    description:
      "Detects objects with an HC-SR04 sensor and visualizes proximity using an LED scale and dynamic Serial feedback.",
    author: "Chester Lauzon",
    boardType: "arduino",
    boardLabel: "Arduino Uno",
    hearts: 142,
    circuitImage:
      "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&w=800&q=80",
    tags: ["Sensor", "HC-SR04", "LED"],
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
    id: "proj-2",
    title: "ESP32 WiFi Weather Station",
    description:
      "Fetches ambient sensor data and outputs real-time temperature telemetry over serial communication.",
    author: "Elena Rostova",
    boardType: "esp32",
    boardLabel: "ESP32 DevKit",
    hearts: 89,
    circuitImage:
      "https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&w=800&q=80",
    tags: ["IoT", "WiFi", "Telemetry"],
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
    id: "proj-3",
    title: "Raspberry Pi Pico Servo Wave Generator",
    description:
      "Precise PWM signal generation driving multi-servo motors with smooth Interpolated easing curves.",
    author: "DevLab99",
    boardType: "raspberry-pi",
    boardLabel: "Raspberry Pi Pico",
    hearts: 215,
    circuitImage:
      "https://images.unsplash.com/photo-1608564697071-ddf911d81370?auto=format&fit=crop&w=800&q=80",
    tags: ["MicroPython", "PWM", "Robotics"],
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
    id: "proj-4",
    title: "RGB Potentiometer Dimmer Matrix",
    description:
      "Smooth analog voltage sampling mapped across 3 potentiometers controlling multi-color LED output.",
    author: "Marcus Vance",
    boardType: "arduino",
    boardLabel: "Arduino Uno",
    hearts: 64,
    circuitImage:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
    tags: ["Analog", "Potentiometer", "PWM"],
    code: `void setup() {
  pinMode(A0, INPUT);
}

void loop() {
  int val = analogRead(A0);
  Serial.println(val);
  delay(50);
}`,
  },

  // Example project without a description.
  // You can remove this if you don't need it.
  {
    id: "proj-5",
    title: "Basic LED Controller",
    author: "CircuitLab",
    boardType: "arduino",
    boardLabel: "Arduino Uno",
    hearts: 31,
    circuitImage:
      "https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&w=800&q=80",
    tags: ["LED", "Digital"],
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


export const INITIAL_PROJECTS: SavedProject[] = [
  {
    id: "proj-1",
    title: "Obstacle Avoidance Robot",
    description:
      "4WD chassis controller using HC-SR04 ultrasonic sensor and L298N motor driver module.",
    boardType: "Arduino Uno R3",
    updatedAt: "2 hours ago",
    isPublic: true,
    componentsCount: 5,
    circuitImage:
      "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "proj-2",
    title: "4DOF Manipulator Arm",
    boardType: "Arduino Uno R3",
    updatedAt: "Yesterday",
    isPublic: false,
    componentsCount: 8,
  },
  {
    id: "proj-3",
    title: "Smart Temp Monitor",
    description:
      "DHT11 telemetry logger with 16x2 I2C LCD readout and status alert LEDs.",
    boardType: "ESP32",
    updatedAt: "3 days ago",
    isPublic: true,
    componentsCount: 4,
  },
  {
    id: "proj-4",
    title: "Smart PIN Door Lock",
    description: "4x4 Keypad interface connected to servo lock latch.",
    boardType: "Raspberry Pi",
    updatedAt: "4 months ago",
    isPublic: false,
    componentsCount: 6,
  },
];