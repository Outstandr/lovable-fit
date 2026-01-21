package app.lovable.hotstepper;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Native plugin to directly query Android OS permission state.
 * Bypasses Capacitor/Pedometer plugin abstractions for ground-truth permission status.
 */
@CapacitorPlugin(name = "PermissionProbe")
public class PermissionProbePlugin extends Plugin {

    @PluginMethod
    public void checkActivityRecognition(PluginCall call) {
        Context context = getContext();
        JSObject result = new JSObject();
        
        // SDK version info
        result.put("sdkVersion", Build.VERSION.SDK_INT);
        result.put("sdkCodename", Build.VERSION.CODENAME);
        result.put("manufacturer", Build.MANUFACTURER);
        result.put("model", Build.MODEL);
        
        // ACTIVITY_RECOGNITION permission was added in API 29 (Android 10)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            int permissionState = ContextCompat.checkSelfPermission(
                context, 
                Manifest.permission.ACTIVITY_RECOGNITION
            );
            
            boolean isGranted = permissionState == PackageManager.PERMISSION_GRANTED;
            result.put("activityRecognitionGranted", isGranted);
            result.put("permissionState", permissionState);
            result.put("permissionStateText", isGranted ? "GRANTED" : "DENIED");
            
            // Check if we should show rationale (user denied before but not permanently)
            boolean shouldShowRationale = getActivity() != null && 
                getActivity().shouldShowRequestPermissionRationale(Manifest.permission.ACTIVITY_RECOGNITION);
            result.put("shouldShowRationale", shouldShowRationale);
            
        } else {
            // Pre-Android 10: permission not required
            result.put("activityRecognitionGranted", true);
            result.put("permissionState", PackageManager.PERMISSION_GRANTED);
            result.put("permissionStateText", "GRANTED (pre-Q)");
            result.put("shouldShowRationale", false);
        }
        
        // Check BODY_SENSORS if available (useful for some step implementations)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) {
            int bodySensors = ContextCompat.checkSelfPermission(
                context, 
                Manifest.permission.BODY_SENSORS
            );
            result.put("bodySensorsGranted", bodySensors == PackageManager.PERMISSION_GRANTED);
        }
        
        call.resolve(result);
    }
}
