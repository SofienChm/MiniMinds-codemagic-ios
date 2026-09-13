# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Keep Capacitor classes
-keep class com.getcapacitor.** { *; }
-keepclassmembers class com.getcapacitor.** { *; }

# Keep Cordova classes
-keep class org.apache.cordova.** { *; }
-keepclassmembers class org.apache.cordova.** { *; }

# Keep Firebase classes
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Keep WebView JavaScript interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Preserve line numbers for debugging stack traces
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Keep custom plugins
-keep class com.miniminds.app.** { *; }

# AndroidX
-keep class androidx.** { *; }
-keep interface androidx.** { *; }

# Prevent obfuscation of models/data classes if using Gson/Jackson
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

