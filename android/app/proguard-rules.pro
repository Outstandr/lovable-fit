# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in C:/Users/Public/Android/Sdk/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# attribute in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Keep the Capacitor BridgeActivity and its methods
-keep class com.getcapacitor.BridgeActivity { *; }

# Keep the FirebaseApp and its methods
-keep class com.google.firebase.FirebaseApp { *; }

# Keep all classes in the app's package
-keep class app.lovable.hotstepper.** { *; }

# Keep all public classes and methods that are part of the Android Support Library
-keep public class * extends android.support.v4.app.Fragment
-keep public class * extends android.support.v4.app.FragmentActivity
-keep public class * extends android.support.v7.app.AppCompatActivity
-keep public class * extends android.support.v7.app.AppCompatDialogFragment

# Keep all public classes and methods that are part of the AndroidX Library
-keep public class * extends androidx.fragment.app.Fragment
-keep public class * extends androidx.fragment.app.FragmentActivity
-keep public class * extends androidx.appcompat.app.AppCompatActivity
-keep public class * extends androidx.appcompat.app.AppCompatDialogFragment

# Keep all public classes and methods that are part of the Material Components Library
-keep public class * extends com.google.android.material.bottomsheet.BottomSheetDialogFragment
-keep public class * extends com.google.android.material.card.MaterialCardView
-keep public class * extends com.google.android.material.chip.Chip
-keep public class * extends com.google.android.material.floatingactionbutton.FloatingActionButton
-keep public class * extends com.google.android.material.navigation.NavigationView
-keep public class * extends com.google.android.material.textfield.TextInputLayout
-keep public class * extends com.google.android.material.appbar.AppBarLayout
-keep public class * extends com.google.android.material.appbar.CollapsingToolbarLayout
-keep public class * extends com.google.android.material.tabs.TabLayout
-keep public class * extends com.google.android.material.bottomnavigation.BottomNavigationView

# Keep the R class and its inner classes
-keep class **.R$* { *; }

# Keep all native methods
-keepclasseswithmembernames,includedescriptorclasses class * {
    native <methods>;
}

# Keep all enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep all Parcelable creators
-keep class * implements android.os.Parcelable {
  public static final android.os.Parcelable$Creator *;
}

# Keep all custom view constructors
-keep public class * extends android.view.View {
    public <init>(android.content.Context);
    public <init>(android.content.Context, android.util.AttributeSet);
    public <init>(android.content.Context, android.util.AttributeSet, int);
}
