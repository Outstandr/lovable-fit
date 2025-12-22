import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, Eye, Download, Trash2, Loader2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";

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
      toast.success("Privacy settings updated");
    },
  });

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
      a.download = `hotstepper-data-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Data exported successfully");
    } catch (error) {
      console.error("Failed to export data:", error);
      toast.error("Failed to export data");
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
        toast.error("Failed to delete account. Please try again or contact support.");
        setIsDeleting(false);
        return;
      }

      console.log("Account deletion result:", data);
      toast.success("Account deleted successfully");
      
      // Sign out and navigate to auth
      await signOut();
      navigate("/auth");
    } catch (error) {
      console.error("Failed to delete account:", error);
      toast.error("Failed to delete account. Please contact support.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen-safe bg-background safe-area-pb">
      {/* Header */}
      <motion.header 
        className="flex items-center gap-4 p-4 border-b border-border header-safe"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button 
          onClick={() => navigate("/profile")}
          className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-smooth"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold uppercase tracking-wider text-foreground">
          Privacy & Security
        </h1>
      </motion.header>

      <div className="p-4 space-y-4">
        {/* Medical Disclaimer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <MedicalDisclaimer variant="full" />
        </motion.div>

        {/* Leaderboard Visibility */}
        <motion.div 
          className="tactical-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Show on Leaderboard</p>
                <p className="text-xs text-muted-foreground">Let others see your progress</p>
              </div>
            </div>
            <Switch
              checked={profile?.show_on_leaderboard ?? true}
              onCheckedChange={(checked) => updatePrivacyMutation.mutate(checked)}
            />
          </div>
        </motion.div>

        {/* Export Data */}
        <motion.div 
          className="tactical-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-primary" />
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

        {/* Privacy Policy Link */}
        <motion.div 
          className="tactical-card p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <a 
            href="/privacypolicy.html" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Privacy Policy</p>
                <p className="text-xs text-muted-foreground">View our full privacy policy</p>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        </motion.div>

        {/* Delete Account */}
        <motion.div 
          className="tactical-card p-4 border-destructive/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-destructive" />
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
                For support or data inquiries, contact: <a href="mailto:support@hotstepper.app" className="text-primary hover:underline">support@hotstepper.app</a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PrivacySettings;
