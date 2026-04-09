import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import { Sparkles, Loader2, Camera as CameraIcon, RotateCcw, Wand2, Sun, Smile, Eye } from 'lucide-react';
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
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [rawBase64, setRawBase64] = useState<string | null>(null);

  const captureSelfie = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        direction: CameraDirection.Front,
        correctOrientation: true,
        width: 1024,
        height: 1024,
        promptLabelHeader: 'Take Your Selfie',
        promptLabelPhoto: 'From Library',
      });

      if (!photo.base64String) {
        throw new Error("Failed to capture image.");
      }

      const clean = photo.base64String.replace(/^data:image\/(png|jpeg|webp);base64,/, "");
      setRawBase64(clean);
      // Show original selfie as-is to the user (NO flip)
      setSelfiePreview(`data:image/jpeg;base64,${clean}`);
    } catch (error: any) {
      if (error.message?.includes('cancelled') || error.message?.includes('canceled')) return;
      console.error("[AIAvatarGenerator] Capture error:", error);
      toast.error("Failed to capture selfie. Try again.");
    }
  };

  const handleRetake = () => {
    setSelfiePreview(null);
    setRawBase64(null);
    setTimeout(() => captureSelfie(), 200);
  };

  const handleGenerateFromSelfie = async () => {
    if (!rawBase64) return;

    try {
      setIsGenerating(true);
      setLoadingText("Preparing your selfie...");

      const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      if (!API_KEY) throw new Error("Missing VITE_GEMINI_API_KEY. Please add it to your .env file.");

      // Un-mirror the front camera for AI processing ONLY
      // The user sees the original, but Gemini gets the corrected orientation
      setLoadingText("Generating your 3D avatar...");

      const unmirrorForAI = (base64: string): Promise<string> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(base64); return; }
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0);
            const flipped = canvas.toDataURL('image/jpeg', 0.85).replace(/^data:image\/jpeg;base64,/, '');
            resolve(flipped);
          };
          img.onerror = () => reject(new Error('Failed to process selfie'));
          img.src = `data:image/jpeg;base64,${base64}`;
        });
      };

      const aiBase64 = await unmirrorForAI(rawBase64);

      const stylePrompt = `Look at this photo carefully. This is a real person. Transform this EXACT person into a highly detailed 3D Pixar-style character avatar.

CRITICAL - PRESERVE IDENTITY:
- SAME GENDER as the person in the photo
- SAME skin tone and complexion
- SAME facial hair (beard, stubble, mustache) if present
- SAME hair style, texture, length, and color
- SAME face shape, nose, eyes, eyebrows
- SAME accessories (glasses, chain, earrings) if visible

STYLE RULES:
- Normal front-facing HEADSHOT only — head and shoulders, no posing, no hand gestures
- Natural relaxed expression, slight confident smile
- Wearing a simple crew-neck t-shirt or casual top
- Solid flat teal-turquoise background (#0D9488)
- 3D Pixar/Disney animation quality, big expressive eyes, smooth skin, bright soft studio lighting
- The avatar must be IMMEDIATELY recognizable as the same person

Generate ONLY the image, no text.`;

      const generateRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: stylePrompt },
              { inline_data: { mime_type: "image/jpeg", data: aiBase64 } }
            ]
          }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            temperature: 1.0,
          }
        })
      });

      if (!generateRes.ok) {
        const errText = await generateRes.text();
        throw new Error(`Generation Error: ${generateRes.status} ${errText}`);
      }
      
      const generateData = await generateRes.json();
      const parts = generateData.candidates?.[0]?.content?.parts || [];
      let generatedBase64 = '';
      let mimeType = 'image/png';
      
      for (const part of parts) {
        if (part.inlineData) {
          generatedBase64 = part.inlineData.data;
          mimeType = part.inlineData.mimeType || 'image/png';
          break;
        }
      }
      
      if (!generatedBase64) {
        console.error("Full Gemini Response:", generateData);
        throw new Error(`Google AI failed to generate image. Response: ${JSON.stringify(generateData).substring(0, 150)}...`);
      }

      setLoadingText("Saving avatar...");

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

      toast.success("AI Avatar generated!");
      setSelfiePreview(null);
      setRawBase64(null);
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

      {/* Selfie Guide Dialog */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="sm:max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">📸 Selfie Guide</DialogTitle>
            <DialogDescription className="text-center pt-1 text-xs">
              Follow these tips for the most accurate 3D avatar
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-3 bg-secondary/30 p-3 rounded-lg border border-border/50">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Eye className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">Look straight at the camera</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">Face centered, eyes on the lens. Head and shoulders visible.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-secondary/30 p-3 rounded-lg border border-border/50">
              <div className="h-8 w-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <Sun className="h-4 w-4 text-yellow-400" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">Bright, even lighting</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">Face a window or lamp. No shadows on your face, no backlighting.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-secondary/30 p-3 rounded-lg border border-border/50">
              <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Smile className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">Natural expression</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">Slight smile, relaxed. Keep glasses on if you normally wear them.</p>
              </div>
            </div>
          </div>

          <div className="bg-muted/30 p-2.5 rounded-lg border border-border/30 text-center">
            <p className="text-[11px] text-muted-foreground">💡 <strong>Tip:</strong> Hold the phone at eye level, arm's length away. Plain background works best.</p>
          </div>
          
          <div className="flex flex-col gap-2 mt-2">
            <Button 
              onClick={() => {
                setShowInstructions(false);
                setTimeout(() => captureSelfie(), 100);
              }}
              className="w-full h-12 relative overflow-hidden group shadow-glow-sm text-md font-semibold tracking-wide"
            >
              <div className="absolute inset-0 bg-gradient-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer" />
              <span className="relative z-10 flex items-center">
                <CameraIcon className="w-5 h-5 mr-2" /> I'm Ready — Open Camera
              </span>
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground text-xs" onClick={() => setShowInstructions(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Selfie Preview Dialog — shows ORIGINAL selfie (not flipped) */}
      <Dialog open={!!selfiePreview && !isGenerating} onOpenChange={(open) => { if (!open) { setSelfiePreview(null); setRawBase64(null); } }}>
        <DialogContent className="sm:max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-center">Your Selfie</DialogTitle>
            <DialogDescription className="text-center text-xs">
              Happy with this? Tap Generate to create your 3D avatar.
            </DialogDescription>
          </DialogHeader>
          
          {selfiePreview && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-48 h-48 rounded-2xl overflow-hidden border-2 border-primary/30 shadow-lg">
                <img src={selfiePreview} alt="Your selfie" className="w-full h-full object-cover" />
              </div>
              
              <div className="flex gap-2 w-full">
                <Button variant="outline" onClick={handleRetake} className="flex-1">
                  <RotateCcw className="h-4 w-4 mr-1.5" /> Retake
                </Button>
                <Button onClick={handleGenerateFromSelfie} className="flex-1 bg-gradient-to-r from-primary to-cyan-500">
                  <Wand2 className="h-4 w-4 mr-1.5" /> Generate
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Loading overlay */}
      <Dialog open={isGenerating}>
        <DialogContent className="sm:max-w-xs bg-background border-border" onInteractOutside={(e) => e.preventDefault()}>
          <div className="flex flex-col items-center py-6 gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">{loadingText}</p>
              <p className="text-[11px] text-muted-foreground mt-1">This may take 10-20 seconds</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
