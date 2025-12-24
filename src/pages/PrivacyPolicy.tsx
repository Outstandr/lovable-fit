import { motion } from "framer-motion";
import { ArrowLeft, Shield, Lock, Eye, Trash2, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RubberBandScroll } from "@/components/ui/RubberBandScroll";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  const sections = [
    {
      icon: Shield,
      title: "Data We Collect",
      content: `We collect the following information to provide our services:
      
• Email address (for account authentication)
• Step count and activity data (from Health Connect/Apple Health)
• GPS location (only during active tracking sessions)
• Device push notification tokens (for reminders)

All data is stored securely and encrypted in transit.`
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
• We regularly audit our security practices`
    },
    {
      icon: Trash2,
      title: "Data Deletion",
      content: `You have full control over your data:

• You can delete your account at any time
• Account deletion removes all your data from our servers
• To delete your account, go to Privacy & Security settings
• You can also email us at support@hotstepper.app for assistance`
    },
    {
      icon: Mail,
      title: "Contact Us",
      content: `If you have questions about this privacy policy or your data:

Email: support@hotstepper.app

We aim to respond within 48 hours.`
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <RubberBandScroll className="h-screen" contentClassName="pb-8">
        {/* Header */}
        <motion.header 
          className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4 px-4 py-4 header-safe">
            <button 
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-foreground">Privacy Policy</h1>
          </div>
        </motion.header>

        {/* Content */}
        <div className="px-4 py-6 space-y-6">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-muted-foreground text-sm"
          >
            Last updated: December 2025
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="tactical-card p-4"
          >
            <p className="text-foreground text-sm leading-relaxed">
              Hotstepper ("we", "our", or "us") is committed to protecting your privacy. 
              This policy explains how we collect, use, and safeguard your information when 
              you use our mobile application.
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
            transition={{ delay: 0.6 }}
            className="pt-4 border-t border-border"
          >
            <p className="text-xs text-muted-foreground text-center">
              By using Hotstepper, you agree to this privacy policy.
            </p>
          </motion.div>
        </div>
      </RubberBandScroll>
    </div>
  );
};

export default PrivacyPolicy;
