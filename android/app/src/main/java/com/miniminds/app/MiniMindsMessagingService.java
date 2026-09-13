package com.miniminds.app;

import android.app.ActivityManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.List;
import java.util.Map;

public class MiniMindsMessagingService extends FirebaseMessagingService {

    private static final String CHANNEL_ID = "miniminds_notifications";

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Map<String, String> data = remoteMessage.getData();
        String title = data.get("title");
        String body = data.get("body");

        RemoteMessage.Notification notification = remoteMessage.getNotification();
        if (title == null && notification != null) {
            title = notification.getTitle();
        }
        if (body == null && notification != null) {
            body = notification.getBody();
        }

        if (!isAppInForeground()) {
            showNotification(remoteMessage, title != null ? title : "", body != null ? body : "", data);
        }

        PushNotificationsPlugin.sendRemoteMessage(remoteMessage);
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        PushNotificationsPlugin.onNewToken(token);
    }

    private boolean isAppInForeground() {
        Context context = getApplicationContext();
        ActivityManager manager = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
        if (manager == null) {
            return false;
        }
        try {
            List<ActivityManager.RunningAppProcessInfo> processes = manager.getRunningAppProcesses();
            if (processes == null) {
                return false;
            }
            for (ActivityManager.RunningAppProcessInfo processInfo : processes) {
                if (processInfo.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND) {
                    for (String pkg : processInfo.pkgList) {
                        if (pkg.equals(context.getPackageName())) {
                            return true;
                        }
                    }
                }
            }
        } catch (Exception ignored) {
            // Never fail message delivery due to a foreground check issue.
        }
        return false;
    }

    private void showNotification(RemoteMessage remoteMessage, String title, String body, Map<String, String> data) {
        Context context = getApplicationContext();
        ensureChannel(context);

        int smallIcon = context.getApplicationInfo().icon;
        if (smallIcon == 0) {
            smallIcon = android.R.drawable.sym_def_app_icon;
        }

        Bundle extras = new Bundle();
        if (remoteMessage.getMessageId() != null) {
            extras.putString("google.message_id", remoteMessage.getMessageId());
        }
        for (Map.Entry<String, String> entry : data.entrySet()) {
            extras.putString(entry.getKey(), entry.getValue());
        }

        Intent intent = new Intent(context, MainActivity.class);
        intent.putExtras(extras);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int pendingIntentFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingIntentFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent contentIntent = PendingIntent.getActivity(context, 0, intent, pendingIntentFlags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(smallIcon)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(contentIntent)
            .setWhen(System.currentTimeMillis())
            .setShowWhen(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setColor(Color.parseColor("#4CAF50"));

        Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        if (soundUri != null) {
            builder.setSound(soundUri);
        }

        String notificationId = data.get("notificationId");
        int id = (notificationId != null && !notificationId.isEmpty())
            ? notificationId.hashCode()
            : (int) (System.currentTimeMillis() & Integer.MAX_VALUE);

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(String.valueOf(id), id, builder.build());
        }
    }

    private void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                NotificationChannel channel = manager.getNotificationChannel(CHANNEL_ID);
                if (channel == null) {
                    NotificationChannel newChannel = new NotificationChannel(
                        CHANNEL_ID,
                        "miniminds",
                        NotificationManager.IMPORTANCE_HIGH
                    );
                    newChannel.setDescription("miniminds notifications");
                    newChannel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), Notification.AUDIO_ATTRIBUTES_DEFAULT);
                    newChannel.enableVibration(true);
                    manager.createNotificationChannel(newChannel);
                }
            }
        }
    }
}