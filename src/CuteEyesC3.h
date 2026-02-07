#ifndef CUTE_EYES_C3_H
#define CUTE_EYES_C3_H

#include <Arduino.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>

enum EyeMood {
  MOOD_DEFAULT,
  MOOD_HAPPY,
  MOOD_SAD,
  MOOD_ANGRY,
  MOOD_SLEEPY
};

class CuteEyesC3 {
  public:
    void begin(Adafruit_SH1106G* d);
    void update();
    void setMood(EyeMood m);
    void setBlinkInterval(int ms);

  private:
    Adafruit_SH1106G* display;
    EyeMood mood = MOOD_DEFAULT;

    unsigned long lastBlink = 0;
    unsigned long blinkInterval = 4000;
    bool blinking = false;

    void drawEyes(int h);
    void drawMouth();
};

#endif
