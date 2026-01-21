package app.lovable.hotstepper;

import android.app.Application;
import com.google.firebase.FirebaseApp;

public class MainApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        // Initialize Firebase at application startup - BEFORE any Activity or Capacitor plugin loads
        // This prevents the "FirebaseApp is not initialized" crash
        FirebaseApp.initializeApp(this);
    }
}
