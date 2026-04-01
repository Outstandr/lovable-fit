import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Sparkles, Loader2, Camera as CameraIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIAvatarGeneratorProps {
  onAvatarGenerated: (url: string) => void;
  className?: string;
}

export const AIAvatarGenerator = ({ onAvatarGenerated, className }: AIAvatarGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  const handleGenerate = async () => {
    try {
      // 1. Capture Selfie
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        promptLabelHeader: 'Capture Selfie',
        promptLabelPhoto: 'From Photo Library',
      });

      if (!photo.base64String) {
        throw new Error("Failed to capture image.");
      }

      setIsGenerating(true);
      setLoadingText("Analyzing features...");

      // 2. Invoke Edge Function
      const { data, error } = await supabase.functions.invoke('generate-avatar', {
        body: { imageBase64: photo.base64String },
      });

      if (error) {
        throw new Error(error.message || "Failed to communicate with AI server");
      }

      if (!data?.success) {
        throw new Error(data?.error || "AI generation failed");
      }

      setLoadingText("Finalizing style...");
      
      // 3. Complete
      toast.success("AI Avatar generated successfully!");
      onAvatarGenerated(data.avatarUrl);

    } catch (error: any) {
      console.error("[AIAvatarGenerator]", error);
      toast.error(error.message || "Failed to generate avatar. Try again.");
    } finally {
      setIsGenerating(false);
      setLoadingText('');
    }
  };

  return (
    <div className={`p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col items-center justify-center text-center gap-3 ${className}`}>
      <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-1">
        <Sparkles className="h-6 w-6" />
      </div>
      <div>
        <h4 className="text-sm font-bold uppercase tracking-wider text-foreground">AI Studio Avatar</h4>
        <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
          Take a quick selfie to instantly generate a custom 3D Pixar-style character!
        </p>
      </div>

      <Button 
        onClick={handleGenerate} 
        disabled={isGenerating}
        className="w-full relative overflow-hidden group shadow-glow-sm"
      >
        <div className="absolute inset-0 bg-gradient-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer" />
        <div className="relative z-10 flex items-center justify-center">
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {loadingText}
            </>
          ) : (
            <>
              <CameraIcon className="w-4 h-4 mr-2" />
              Capture Selfie
            </>
          )}
        </div>
      </Button>
    </div>
  );
};
