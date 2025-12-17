import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FIREBASE_PROJECT_ID = 'hotstepper'

interface Notification {
  title: string
  body: string
}

interface PushToken {
  user_id: string
  push_token: string
  device_type: string
}

// Get OAuth2 access token using Service Account
async function getAccessToken(): Promise<string> {
  const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || '{}')
  
  const jwtHeader = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const jwtClaimSet = btoa(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }))
  
  const signatureInput = `${jwtHeader}.${jwtClaimSet}`
  
  // Import private key for signing
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signatureInput)
  )
  
  const jwt = `${signatureInput}.${arrayBufferToBase64Url(signature)}`
  
  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  })
  
  const tokenData = await tokenResponse.json()
  if (!tokenData.access_token) {
    console.error('Failed to get access token:', tokenData)
    throw new Error('Failed to get Firebase access token')
  }
  return tokenData.access_token
}

// Helper function to convert PEM to ArrayBuffer
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '')
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// Helper function for base64url encoding
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function sendFCMv1Notification(
  token: string,
  notification: Notification
): Promise<boolean> {
  try {
    const accessToken = await getAccessToken()
    
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`
    
    const response = await fetch(fcmUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          token: token,
          notification: {
            title: notification.title,
            body: notification.body
          },
          android: {
            notification: {
              channel_id: 'daily_reminders',
              priority: 'high',
              sound: 'default'
            }
          }
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`FCM error for token ${token.substring(0, 20)}...:`, error)
      return false
    }

    console.log(`✅ Notification sent successfully`)
    return true
  } catch (error) {
    console.error(`Error sending notification:`, error)
    return false
  }
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('📬 Starting send-daily-reminders function...')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all active push tokens
    const { data: tokens, error } = await supabase
      .from('user_push_tokens')
      .select('user_id, push_token, device_type')
      .eq('device_type', 'android')

    if (error) {
      console.error('Error fetching tokens:', error)
      throw error
    }

    console.log(`Found ${tokens?.length || 0} Android tokens`)

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No tokens found', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Get current hour for contextual message
    const hour = new Date().getUTCHours()
    let notification: Notification

    if (hour >= 6 && hour < 12) {
      notification = {
        title: '🌅 Good Morning!',
        body: "Time to start your step count! Let's crush today's goal! 💪"
      }
    } else if (hour >= 12 && hour < 18) {
      notification = {
        title: '☀️ Midday Check-in',
        body: "How's your step count looking? A quick walk can boost your energy! 🚶"
      }
    } else {
      notification = {
        title: '🌙 Evening Reminder',
        body: "Don't forget to hit your step goal today! A short walk before bed? 🌟"
      }
    }

    console.log(`Sending notification: ${notification.title}`)

    // Send notifications to all tokens
    const results = await Promise.all(
      tokens.map((tokenData: PushToken) =>
        sendFCMv1Notification(tokenData.push_token, notification)
      )
    )

    const successCount = results.filter((r) => r).length
    const failureCount = results.length - successCount

    console.log(`📊 Results: ${successCount} success, ${failureCount} failed`)

    return new Response(
      JSON.stringify({
        message: 'Notifications sent',
        total: tokens.length,
        successful: successCount,
        failed: failureCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: unknown) {
    console.error('Error in send-daily-reminders:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
