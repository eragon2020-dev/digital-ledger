@echo off
set JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot
npx expo prebuild --clean
npx expo run:android
