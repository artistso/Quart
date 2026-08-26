package app.quart.editor;

import android.app.Activity;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * JS bridge exposed to the web layer as window.QuartAndroid.
 * The web side streams exports in base64 chunks that stay safely under the
 * Binder transaction limit (see src/platform/io.js).
 *
 * API 29+: files land in the system Downloads provider (no permission needed).
 * API 26–28: files land in the app's external exports directory.
 */
public class AndroidSaver {

    private final Activity activity;
    private final Handler main = new Handler(Looper.getMainLooper());

    private String fileName;
    private String mimeType;
    private ByteArrayOutputStream buffer;

    public AndroidSaver(Activity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public void beginFile(String name, String mime, int expectedChunks) {
        fileName = sanitize(name);
        mimeType = (mime == null || mime.isEmpty()) ? "application/octet-stream" : mime;
        buffer = new ByteArrayOutputStream(1024 * 1024);
    }

    @JavascriptInterface
    public void chunk(String base64) {
        if (buffer == null || base64 == null) return;
        try {
            byte[] part = Base64.decode(base64, Base64.DEFAULT);
            buffer.write(part, 0, part.length);
        } catch (Exception ignored) {
        }
    }

    @JavascriptInterface
    public void endFile() {
        if (buffer == null) return;
        final byte[] data = buffer.toByteArray();
        buffer = null;
        new Thread(() -> {
            final String message = save(data);
            main.post(() -> Toast.makeText(activity, message, Toast.LENGTH_LONG).show());
        }).start();
    }

    private String save(byte[] data) {
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
                cv.put(MediaStore.Downloads.MIME_TYPE, mimeType);
                cv.put(MediaStore.Downloads.IS_PENDING, 1);
                Uri uri = activity.getContentResolver()
                        .insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                if (uri == null) throw new IllegalStateException("MediaStore insert failed");
                OutputStream os = activity.getContentResolver().openOutputStream(uri);
                if (os == null) throw new IllegalStateException("stream unavailable");
                os.write(data);
                os.close();
                cv.clear();
                cv.put(MediaStore.Downloads.IS_PENDING, 0);
                activity.getContentResolver().update(uri, cv, null, null);
                return "◈ Saved to Downloads/" + fileName;
            } else {
                File dir = new File(activity.getExternalFilesDir(null), "Exports");
                if (!dir.exists() && !dir.mkdirs()) {
                    return "Save failed: cannot create exports dir";
                }
                File out = new File(dir, fileName);
                FileOutputStream fos = new FileOutputStream(out);
                fos.write(data);
                fos.close();
                return "◈ Saved to " + out.getAbsolutePath();
            }
        } catch (Exception e) {
            return "Save failed: " + e.getMessage();
        }
    }

    private static String sanitize(String n) {
        if (n == null || n.trim().isEmpty()) return "quart-export.bin";
        return n.replaceAll("[\\\\/:*?\"<>|]", "_");
    }
}
