import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import { Sparkles, Loader2, Camera as CameraIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AIAvatarGeneratorProps {
  onAvatarGenerated: (url: string) => void;
  className?: string;
}

export const AIAvatarGenerator = ({ onAvatarGenerated, className }: AIAvatarGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);

  const handleGenerate = async () => {
    try {
      // 1. Capture Selfie
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        direction: CameraDirection.Front,
        promptLabelHeader: 'Capture Selfie',
        promptLabelPhoto: 'From Photo Library',
      });

      if (!photo.base64String) {
        throw new Error("Failed to capture image.");
      }

      setIsGenerating(true);
      setLoadingText("Analyzing features...");

      const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      if (!API_KEY) throw new Error("Missing VITE_GEMINI_API_KEY. Please add it to your .env file.");

      // 2. Vision Extraction (Gemini 1.5 Flash)
      const visionPrompt = "Analyze this portrait selfie carefully. Describe the person's precise facial features, skin tone, hair style (length and texture), hair color, eye color, and any accessories like glasses or facial hair. Do NOT mention identity. Create a highly accurate, concise physical description to be used for character creation.";
      const cleanBase64 = photo.base64String.replace(/^data:image\/(png|jpeg|webp);base64,/, "");

      const visionRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: visionPrompt }, { inline_data: { mime_type: "image/jpeg", data: cleanBase64 } }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 150 }
        })
      });

      if (!visionRes.ok) throw new Error(`Vision Error: ${visionRes.status}`);
      const visionData = await visionRes.json();
      const extractedPrompt = visionData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!extractedPrompt) throw new Error("Failed to extract prompt from selfie.");

      setLoadingText("Generating avatar image...");

      // 3. Image Generation (Imagen 4)
      const finalPrompt = `A close-up waist-up 3D cartoon portrait bust of a friendly person with: ${extractedPrompt.trim()}. They are looking directly forward at the camera. They are wearing a simple, clean, solid-colored casual fitted t-shirt. The background MUST be a simple, solid flat light-teal color. 3D Pixar animation style, big expressive friendly eyes, bright soft studio lighting, cute, simple, and highly detailed.`;
      
      const generateRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: finalPrompt }],
          parameters: { sampleCount: 1, personGeneration: "ALLOW_ADULT" }
        })
      });

      if (!generateRes.ok) {
        const errText = await generateRes.text();
        throw new Error(`Generation Error: ${generateRes.status} ${errText}`);
      }
      
      const generateData = await generateRes.json();
      const generatedBase64 = generateData.predictions?.[0]?.bytesBase64Encoded;
      const mimeType = generateData.predictions?.[0]?.mimeType || 'image/jpeg';
      if (!generatedBase64) {
        console.error("Full Imagen Response:", generateData);
        throw new Error(`Google AI failed to generate image. Response: ${JSON.stringify(generateData).substring(0, 150)}...`);
      }

      setLoadingText("Saving avatar...");

      // 4. Upload to Supabase Storage
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const byteString = atob(generatedBase64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeType });
      const extension = mimeType === 'image/png' ? 'png' : 'jpg';
      const fileName = `${user.id}_avatar_${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, blob, { contentType: mimeType, upsert: true });
      if (uploadError) throw new Error(`Upload Error: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

      // 5. Complete
      toast.success("AI Avatar generated successfully!");
      onAvatarGenerated(publicUrl);

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
        onClick={() => setShowInstructions(true)} 
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

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="sm:max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">Perfect Selfie Guide</DialogTitle>
            <DialogDescription className="text-center pt-2">
              Follow these instructions to get the best 3D Pixar avatar result!
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 bg-secondary/30 p-3 rounded-lg border border-border/50">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary font-bold">1</div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">Face the camera</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Keep your face centered and look directly into the lens.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-secondary/30 p-3 rounded-lg border border-border/50">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary font-bold">2</div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">Good lighting</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Ensure your face is evenly lit. Avoid strong shadows or backlighting.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-secondary/30 p-3 rounded-lg border border-border/50">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary font-bold">3</div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">Natural expression</h4>
                <p className="text-xs text-muted-foreground mt-0.5">A slight smile works best. Your glasses and hairstyle will be captured!</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 mt-4">
            <Button 
              onClick={() => {
                setShowInstructions(false);
                setTimeout(() => handleGenerate(), 100);
              }}
              className="w-full h-12 relative overflow-hidden group shadow-glow-sm text-md font-semibold tracking-wide"
            >
              <div className="absolute inset-0 bg-gradient-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer" />
              <span className="relative z-10 flex items-center">
                <CameraIcon className="w-5 h-5 mr-2" /> Open Camera & Let's Go
              </span>
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setShowInstructions(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
