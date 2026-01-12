package app.lovable.hotstepper;

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.FirebaseApp;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Apply the AppTheme to the activity
        setTheme(R.style.AppTheme);
        
        // Initialize Firebase BEFORE super.onCreate()
        FirebaseApp.initializeApp(getApplicationContext());
        super.onCreate(savedInstanceState);
        
        // Android 15+ Edge-to-Edge Compliance
        // Content extends behind system bars, CSS handles safe-area-insets
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        
        // Display cutout mode - required for Android 15 (LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode = 
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS;
        }
    }
}
