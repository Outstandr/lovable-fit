/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

const SITE_NAME = 'Lionel X'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  token: string
}

export const RecoveryEmail = ({
  siteName = SITE_NAME,
  confirmationUrl,
  token,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your password for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>LIONEL <span style={{ color: '#00c8ff' }}>X</span></Text>
        <Heading style={h1}>Reset Your Password</Heading>
        <Text style={text}>
          Enter this code in the app to reset your password:
        </Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={text}>This code expires in 1 hour.</Text>
        <Text style={textSmall}>Or click the button below to reset via link:</Text>
        <Button style={button} href={confirmationUrl}>
          Reset Password
        </Button>
        <Text style={footer}>
          If you didn't request this, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { padding: '20px 25px' }
const brand = { fontSize: '28px', fontWeight: 'bold' as const, letterSpacing: '4px', color: '#0f172a', margin: '0 0 30px', textAlign: 'center' as const }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 25px' }
const textSmall = { fontSize: '13px', color: '#888888', lineHeight: '1.5', margin: '0 0 15px' }
const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '36px', fontWeight: 'bold' as const, letterSpacing: '8px', color: '#00c8ff', backgroundColor: '#1a2332', padding: '16px 24px', borderRadius: '12px', textAlign: 'center' as const, margin: '0 0 25px' }
const button = { backgroundColor: '#00c8ff', color: '#0f172a', fontSize: '14px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '12px 24px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
