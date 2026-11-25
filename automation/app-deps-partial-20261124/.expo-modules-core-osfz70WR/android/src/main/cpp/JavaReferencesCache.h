// Copyright © 2021-present 650 Industries, Inc. (aka Expo)

#pragma once

#include "ExpoHeader.pch"

namespace jni = facebook::jni;

namespace expo {

class JCache {
public:
  struct ConstructableJClass {
    jclass clazz;
    jmethodID constructor;
  };

  JCache(JNIEnv *env);

  /**
   * Gets a cached Java class entry or loads it to the registry.
   */
  jclass getOrLoadJClass(JNIEnv *env, const std::string &className);

  ConstructableJClass jDouble;
  ConstructableJClass jBoolean;
  ConstructableJClass jInteger;
  ConstructableJClass jLong;
  ConstructableJClass jFloat;

  ConstructableJClass jPromise;

  jclass jDoubleArray;
  jclass jBooleanArray;
  jclass jIntegerArray;
  jclass jLongArray;
  jclass jFloatArray;

  jclass jCollection;
  jclass jMap;

  jclass jObject;
  jclass jString;

  jclass jJavaScriptObject;
  jclass jJavaScriptValue;
  jclass jJavaScriptTypedArray;
  jclass jJavaScriptArrayBuffer;
  jclass jArrayBuffer;
  jclass jNativeArrayBuffer;

  jclass jReadableNativeArray;
  jclass jRea