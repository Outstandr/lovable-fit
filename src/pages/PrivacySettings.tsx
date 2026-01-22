import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Eye, Download, Trash2, Loader2, ExternalLink, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { Browser } from '@capacitor/browser';
import { StandardHeader } from "@/components/StandardHeader";
import { RubberBandScroll } from "@/components/ui/RubberBandScroll";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const PrivacySettings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("show_on_leaderboard")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const updatePrivacyMutation = useMutation({
    mutationFn: async (showOnLeaderboard: boolean) => {
      const { error } = await supabase
        .from("profiles")
        .update({ show_on_leaderboard: showOnLeaderboard })
        .eq("id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      console.log("Privacy settings updated");
    },
  });

  const openPrivacyPolicy = async () => {
    try {
      // ⚠️ REPLACE WITH YOUR ACTUAL PRIVACY POLICY URL
      await Browser.open({ 
        url: 'https://outstandr.github.io/lionelx-legal/privacy.html', // Update this!
        presentationStyle: 'popover',
        toolbarColor: '#0a0a0a'
      });
    } catch (error) {
      console.error('Error opening privacy policy:', error);
      // Fallback to window.open if Browser plugin fails
      window.open('/privacypolicy.html', '_blank');
    }
  };

  const openTermsOfService = async () => {
    try {
      // ⚠️ REPLACE WITH YOUR ACTUAL TERMS URL
      await Browser.open({ 
        url: 'https://outstandr.github.io/lionelx-legal/terms.html', // Update this!
        presentationStyle: 'popover',
        toolbarColor: '#0a0a0a'
      });
    } catch (error) {
      console.error('Error opening terms:', error);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      // Fetch all user data
      const [profileRes, stepsRes, sessionsRes, streakRes, tasksRes, bookmarksRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user?.id).single(),
        supabase.from("daily_steps").select("*").eq("user_id", user?.id),
        supabase.from("active_sessions").select("*").eq("user_id", user?.id),
        supabase.from("streaks").select("*").eq("user_id", user?.id).single(),
        supabase.from("protocol_tasks").select("*").eq("user_id", user?.id),
        supabase.from("audiobook_bookmarks").select("*").eq("user_id", user?.id),
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        exportedBy: user?.email,
        profile: profileRes.data,
        dailySteps: stepsRes.data,
        sessions: sessionsRes.data,
        streak: streakRes.data,
        protocolTasks: tasksRes.data,
        audiobookBookmarks: bookmarksRes.data,
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lionelx-data-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log("Data exported successfully");
    } catch (error) {
      console.error("Failed to export data:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      // Call the edge function to delete all user data
      const { data, error } = await supabase.functions.invoke('delete-user-data');

      if (error) {
        console.error("Delete account error:", error);
        setIsDeleting(false);
        return;
      }

      console.log("Account deletion result:", data);

      // Sign out and navigate to auth
      await signOut();
      navigate("/auth");
    } catch (error) {
      console.error("Failed to delete account:", error);
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <StandardHeader
        title="Privacy & Security"
        showBack={true}
        backTo="/profile"
      />

      <RubberBandScroll className="flex-1 pt-20" contentClassName="p-4 space-y-4 pb-32">
        {/* Medical Disclaimer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <MedicalDisclaimer variant="full" />
        </motion.div>

        {/* Leaderboard Visibility */}
        <motion.div
          className="tactical-card p-4 hover:border-primary/30 transition-colors"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Show on Leaderboard</p>
                <p className="text-xs text-muted-foreground">Let others see your progress</p>
              </div>
            </div>
            <Switch
              checked={profile?.show_on_leaderboard ?? true}
              onCheckedChange={(checked) => updatePrivacyMutation.mutate(checked)}
              aria-label="Toggle Leaderboard Visibility"
            />
          </div>
        </motion.div>

        {/* Export Data */}
        <motion.div
          className="tactical-card p-4 hover:border-primary/30 transition-colors"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Export My Data</p>
                <p className="text-xs text-muted-foreground">Download all your data as JSON</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportData}
              disabled={isExporting}
              aria-label="Export Data"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Exporting
                </>
              ) : (
                "Export"
              )}
            </Button>
          </div>
        </motion.div>

        {/* Legal Documents Section */}
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-2">
            Legal Documents
          </h3>

          {/* Privacy Policy Link */}
          <motion.button
            onClick={openPrivacyPolicy}
            className="w-full tactical-card p-4 flex items-center justify-between hover:bg-secondary/30 hover:border-primary/30 transition-all text-left group"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Privacy Policy</p>
                <p className="text-xs text-muted-foreground">View our full privacy policy</p>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </motion.button>

          {/* Terms of Service Link */}
          <motion.button
            onClick={openTermsOfService}
            className="w-full tactical-card p-4 flex items-center justify-between hover:bg-secondary/30 hover:border-primary/30 transition-all text-left group"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Terms of Service</p>
                <p className="text-xs text-muted-foreground">View terms and conditions</p>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </motion.button>
        </motion.div>

        {/* Delete Account */}
        <motion.div
          className="tactical-card p-4 border-destructive/30 hover:border-destructive/60 transition-colors"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Delete Account</p>
                <p className="text-xs text-muted-foreground">Permanently delete all data</p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Deleting
                    </>
                  ) : (
                    "Delete"
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Account?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>
                      This action <strong>cannot be undone</strong>. The following will be permanently deleted:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                      <li>Your profile and account</li>
                      <li>All step history and daily records</li>
                      <li>All walking sessions and routes</li>
                      <li>Your streak data</li>
                      <li>Audiobook bookmarks</li>
                      <li>Notification preferences</li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete Account"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </motion.div>

        {/* Security Info */}
        <motion.div
          className="p-4 rounded-lg bg-secondary/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                Your data is encrypted and stored securely. We never share your personal
                information with third parties for marketing purposes.
              </p>
              <p className="text-xs text-muted-foreground">
                For support or data inquiries, contact: <a href="mailto:info@outstandr.com" className="text-primary hover:underline">info@outstandr.com</a>
              </p>
            </div>
          </div>
        </motion.div>
      </RubberBandScroll>
    </div>
  );
};

export default PrivacySettings;