# Project specific ProGuard rules for Capacitor
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keep class com.getcapacitor.Bridge { *; }
-keep class com.getcapacitor.Bridge$* { *; }

# Keep Cordova plugins if any
-keep class org.apache.cordova.** { *; }

# Preserve line numbers for stack traces
-keepattributes SourceFile,LineNumberTable
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses

