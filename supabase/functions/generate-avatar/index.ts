import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64 } = await req.json()
    if (!imageBase64) {
      throw new Error("Missing imageBase64 payload")
    }

    // Get Auth Context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error(`Unauthorized: ${userError?.message}`)
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY in environment variables")
    }

    // SINGLE-STEP: Pass the selfie DIRECTLY to Gemini's native image generation.
    // The model sees the actual face and reproduces it accurately in 3D Pixar style.
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|webp);base64,/, "");

    const stylePrompt = `Transform this person into a highly detailed 3D Pixar-style character avatar. CRITICAL RULES:
1. The character's face MUST match this exact person - same gender, same skin tone, same facial features, same hair style and color, same facial hair if present, same glasses if wearing any.
2. Show from the waist up in a confident athletic pose (hands on hips or arms crossed).
3. Dress them in stylish athletic sportswear - a fitted track jacket or athletic tank top with bold accent colors (navy blue with orange trim, or black with red trim).
4. Use a solid flat teal-turquoise background color.
5. 3D Pixar/Disney animation quality with big expressive eyes, smooth skin texture, bright soft studio lighting.
6. The face is the PRIMARY focus - it must be immediately recognizable as the same person from the photo.
Generate ONLY the image, no text.`

    console.log("Calling Gemini native image generation...")
    const generateRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: stylePrompt },
            { inline_data: { mime_type: "image/jpeg", data: cleanBase64 } }
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
      console.error("Gemini API Error:", errText);
      throw new Error(`Gemini Generation Error: ${generateRes.status} ${errText}`);
    }

    const generateData = await generateRes.json();
    
    // Gemini native image generation returns parts that can be text or inline_data
    const parts = generateData.candidates?.[0]?.content?.parts || [];
    let generatedBase64 = '';
    let generatedMimeType = 'image/png';
    
    for (const part of parts) {
      if (part.inlineData) {
        generatedBase64 = part.inlineData.data;
        generatedMimeType = part.inlineData.mimeType || 'image/png';
        break;
      }
    }

    if (!generatedBase64) {
      console.error("Full Gemini Response:", JSON.stringify(generateData).substring(0, 500));
      throw new Error("Failed to receive image from Gemini.");
    }

    // Upload to Supabase Storage
    const ext = generatedMimeType === 'image/png' ? 'png' : 'jpg';
    const fileName = `${user.id}_avatar_${Date.now()}.${ext}`;
    const imageBytes = Uint8Array.from(atob(generatedBase64), c => c.charCodeAt(0));

    // Service role admin for upload strictly to avoid user RLS blocking from within Edge Function
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log("Uploading to Supabase Storage avatars bucket...")
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(fileName, imageBytes.buffer, {
        contentType: generatedMimeType,
        upsert: true
      });

    if (uploadError) {
      console.error("Storage Upload Error:", uploadError);
      throw new Error(`Storage Error: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({ success: true, avatarUrl: publicUrl, promptUsed: stylePrompt }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error("Edge function error:", error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
