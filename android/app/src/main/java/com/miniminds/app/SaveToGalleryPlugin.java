package com.miniminds.app;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;
import java.io.OutputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "SaveToGallery")
public class SaveToGalleryPlugin extends Plugin {
    private static final String TAG = "SaveToGallery";
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void saveImage(PluginCall call) {
        String base64Data = call.getString("base64Data");
        String fileName = call.getString("fileName", "miniminds_image.jpg");

        Log.d(TAG, "saveImage called with fileName: " + fileName);

        if (base64Data == null || base64Data.isEmpty()) {
            Log.e(TAG, "base64Data is null or empty");
            call.reject("base64Data is required");
            return;
        }

        Log.d(TAG, "base64Data length: " + base64Data.length());

        // Run in background thread to avoid blocking UI
        executor.execute(() -> {
            try {
                // Remove data:image/xxx;base64, prefix if present
                String cleanBase64 = base64Data;
                if (cleanBase64.contains(",")) {
                    cleanBase64 = cleanBase64.split(",")[1];
                    Log.d(TAG, "Removed base64 prefix, new length: " + cleanBase64.length());
                }

                // Decode base64 to bytes
                Log.d(TAG, "Decoding base64...");
                byte[] imageBytes = Base64.decode(cleanBase64, Base64.DEFAULT);
                Log.d(TAG, "Decoded bytes length: " + imageBytes.length);

                // Decode to bitmap with options to handle large images
                BitmapFactory.Options options = new BitmapFactory.Options();
                options.inPreferredConfig = Bitmap.Config.ARGB_8888;

                Bitmap bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.length, options);

                if (bitmap == null) {
                    Log.e(TAG, "Failed to decode bitmap from bytes");
                    getActivity().runOnUiThread(() -> call.reject("Failed to decode image"));
                    return;
                }

                Log.d(TAG, "Bitmap decoded: " + bitmap.getWidth() + "x" + bitmap.getHeight());

                // Save to gallery using MediaStore (scoped storage compliant)
                Uri imageUri = saveImageToGallery(getContext(), bitmap, fileName);

                // Recycle bitmap to free memory
                bitmap.recycle();

                if (imageUri != null) {
                    Log.d(TAG, "Image saved successfully: " + imageUri.toString());
                    JSObject result = new JSObject();
                    result.put("success", true);
                    result.put("message", "Image saved to gallery");
                    result.put("uri", imageUri.toString());
                    getActivity().runOnUiThread(() -> call.resolve(result));
                } else {
                    Log.e(TAG, "saveImageToGallery returned null");
                    getActivity().runOnUiThread(() -> call.reject("Failed to save image to gallery"));
                }

            } catch (IllegalArgumentException e) {
                Log.e(TAG, "Base64 decode error: " + e.getMessage(), e);
                getActivity().runOnUiThread(() -> call.reject("Invalid base64 data: " + e.getMessage()));
            } catch (OutOfMemoryError e) {
                Log.e(TAG, "Out of memory: " + e.getMessage(), e);
                getActivity().runOnUiThread(() -> call.reject("Image too large to process"));
            } catch (Exception e) {
                Log.e(TAG, "Error saving image: " + e.getMessage(), e);
                getActivity().runOnUiThread(() -> call.reject("Error saving image: " + e.getMessage()));
            }
        });
    }

    private Uri saveImageToGallery(Context context, Bitmap bitmap, String fileName) {
        ContentResolver resolver = context.getContentResolver();
        ContentValues contentValues = new ContentValues();

        // Ensure filename has .jpg extension
        if (!fileName.toLowerCase().endsWith(".jpg") && !fileName.toLowerCase().endsWith(".jpeg")) {
            fileName = fileName + ".jpg";
        }

        contentValues.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
        contentValues.put(MediaStore.MediaColumns.MIME_TYPE, "image/jpeg");

        // For Android 10+ (API 29+), use relative path with scoped storage
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            contentValues.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/MiniMinds");
            contentValues.put(MediaStore.MediaColumns.IS_PENDING, 1);
        }

        Log.d(TAG, "Inserting into MediaStore...");
        Uri imageUri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues);

        if (imageUri == null) {
            Log.e(TAG, "MediaStore insert returned null URI");
            return null;
        }

        Log.d(TAG, "MediaStore URI: " + imageUri.toString());

        try (OutputStream outputStream = resolver.openOutputStream(imageUri)) {
            if (outputStream != null) {
                Log.d(TAG, "Compressing and writing bitmap...");
                boolean success = bitmap.compress(Bitmap.CompressFormat.JPEG, 90, outputStream);
                Log.d(TAG, "Compress result: " + success);

                if (success) {
                    // Mark as no longer pending (Android 10+)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        contentValues.clear();
                        contentValues.put(MediaStore.MediaColumns.IS_PENDING, 0);
                        resolver.update(imageUri, contentValues, null, null);
                    }
                    return imageUri;
                }
            } else {
                Log.e(TAG, "OutputStream is null");
            }
        } catch (IOException e) {
            Log.e(TAG, "IOException writing to MediaStore: " + e.getMessage(), e);
        }

        // Clean up on failure
        Log.d(TAG, "Cleaning up failed entry...");
        resolver.delete(imageUri, null, null);
        return null;
    }
}
