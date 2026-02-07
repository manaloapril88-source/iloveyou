#include "CuteEyesC3.h"

void CuteEyesC3::begin(Adafruit_SH1106G* d) {
  display = d;
}

void CuteEyesC3::setMood(EyeMood m) {
  mood = m;
}

void CuteEyesC3::setBlinkInterval(int ms) {
  blinkInterval = ms;
}

void CuteEyesC3::update() {
  if (millis() - lastBlink > blinkInterval) {
    blinking = true;
    lastBlink = millis();
  }

  display->clearDisplay();

  if (blinking) {
    drawEyes(4);
    if (millis() - lastBlink > 150) blinking = false;
  } else {
    drawEyes(18);
  }

  drawMouth();
  display->display();
}

void CuteEyesC3::drawEyes(int h) {
  int y = 20;
  display->fillRoundRect(20, y, 28, h, 8, 1);
  display->fillRoundRect(80, y, 28, h, 8, 1);
}

void CuteEyesC3::drawMouth() {
  int mx = 64;
  int my = 46;

  switch(mood) {
    case MOOD_HAPPY:
      display->drawCircle(mx, my, 8, 1);
      break;

    case MOOD_SAD:
      display->drawLine(mx-8, my+4, mx+8, my+4, 1);
      break;

    case MOOD_ANGRY:
      display->drawLine(48,18,36,24,1);
      display->drawLine(92,18,104,24,1);
      display->drawRect(mx-6, my-2, 12, 4, 1);
      break;

    case MOOD_SLEEPY:
      display->drawLine(mx-6, my, mx+6, my, 1);
      break;

    default:
      display->drawRect(mx-6, my-2, 12, 4, 1);
      break;
  }
}
