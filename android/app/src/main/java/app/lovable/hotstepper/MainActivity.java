package app.lovable.hotstepper;

import android.os.Bundle;
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
    }
}
