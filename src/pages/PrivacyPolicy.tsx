import { motion } from "framer-motion";
import { Shield, Lock, Eye, Trash2, Mail, Smartphone, Activity, MapPin } from "lucide-react";
import { RubberBandScroll } from "@/components/ui/RubberBandScroll";
import { StandardHeader } from "@/components/StandardHeader";

const PrivacyPolicy = () => {
  const sections = [
    {
      icon: Shield,
      title: "Data We Collect",
      content: `We collect the following information to provide our services:
      
• Email address (for account authentication)
• Display name (for leaderboards)
• Step count, distance, and calories (READ-only from Health Connect/Apple Health)
• GPS location (foreground only, during active tracking sessions)
• Device push notification tokens (for reminders)

All data is stored securely and encrypted in transit.`
    },
    {
      icon: Activity,
      title: "Health Data (Read-Only)",
      content: `We integrate with Health Connect (Android) and Apple Health (iOS) to READ the following data:

• Step Count (READ only)
• Distance (READ only)  
• Active Calories Burned (READ only)

What we DO NOT access:
• ❌ Heart rate data
• ❌ Weight or body measurements
• ❌ Sleep data
• ❌ Any WRITE permissions

We never write data back to your health apps.`
    },
    {
      icon: MapPin,
      title: "Location Data (Foreground Only)",
      content: `GPS location is collected ONLY during active walking sessions when the app is open.

• GPS tracking pauses if you minimize the app or lock the screen
• We do NOT track location in the background
• Route data is retained for 90 days, then automatically deleted

Permissions requested:
• ACCESS_FINE_LOCATION (foreground only)
• ACCESS_COARSE_LOCATION (foreground only)

We do NOT request ACCESS_BACKGROUND_LOCATION.`
    },
    {
      icon: Eye,
      title: "How We Use Your Data",
      content: `Your data is used exclusively for:

• Displaying your step counts and progress
• Recording GPS routes during active sessions
• Calculating streaks and achievements
• Showing your position on leaderboards
• Sending goal reminders (if enabled)

We never sell your data or share it with third parties for advertising.`
    },
    {
      icon: Lock,
      title: "Data Security",
      content: `We take security seriously:

• All data is encrypted in transit using TLS
• Data is stored on secure, encrypted servers
• Authentication uses industry-standard protocols
• Row-Level Security (RLS) enforces data isolation
• We regularly audit our security practices`
    },
    {
      icon: Smartphone,
      title: "Android Permissions",
      content: `Permissions we request and why:

✅ ACCESS_FINE_LOCATION - GPS route tracking (foreground only)
✅ ACTIVITY_RECOGNITION - Step counting
✅ health.READ_STEPS - Read steps from Health Connect
✅ health.READ_DISTANCE - Read distance
✅ health.READ_ACTIVE_CALORIES_BURNED - Read calories
✅ POST_NOTIFICATIONS - Send reminders

Permissions we DO NOT request:
❌ ACCESS_BACKGROUND_LOCATION
❌ Any health WRITE permissions
❌ CAMERA, MICROPHONE, CONTACTS`
    },
    {
      icon: Trash2,
      title: "Data Deletion",
      content: `You have full control over your data:

• You can delete your account at any time
• Account deletion removes all your data from our servers
• Location data is automatically deleted after 90 days
• To delete your account, go to Privacy & Security settings
• You can also email us at info@outstandr.com for assistance`
    },
    {
      icon: Mail,
      title: "Contact Us",
      content: `If you have questions about this privacy policy or your data:

Organization: LEADERS PERFORMANCE MANAGEMENT CONSULTANCIES L.L.C
Address: Office 0363, Oud Al Muteena 3, Dubai, UAE
Email: info@outstandr.com

We aim to respond within 48 hours.`
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <RubberBandScroll className="h-screen" contentClassName="pb-8">

        {/* Standard Header */}
        <StandardHeader
          title="Privacy Policy"
          showBack={true}
        />

        {/* Content */}
        <div className="px-4 py-6 space-y-6">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-muted-foreground text-sm"
          >
            Last updated: January 2026
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="tactical-card p-4"
          >
            <p className="text-foreground text-sm leading-relaxed">
              LEADERS PERFORMANCE MANAGEMENT CONSULTANCIES L.L.C ("we", "our", or "us") is committed to protecting your privacy.
              This policy explains how we collect, use, and safeguard your information when
              you use our Hotstepper mobile application.
            </p>
          </motion.div>

          {sections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              className="tactical-card p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <section.icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
              </div>
              <p className="text-muted-foreground text-sm whitespace-pre-line leading-relaxed">
                {section.content}
              </p>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="pt-4 border-t border-border"
          >
            <p className="text-xs text-muted-foreground text-center">
              By using Hotstepper, you agree to this privacy policy. Hotstepper is developed by LEADERS PERFORMANCE MANAGEMENT CONSULTANCIES L.L.C.
            </p>
          </motion.div>
        </div>
      </RubberBandScroll>
    </div>
  );
};

export default PrivacyPolicy;
