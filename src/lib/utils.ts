import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns the date in YYYY-MM-DD format using LOCAL timezone.
 * Critical for step tracking where "today" must match the user's calendar day, not UTC.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validates phone number in E.164 format.
 * E.164 format: + followed by country code and subscriber number (max 15 digits total)
 */
export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/\s/g, '');
  const e164Regex = /^\+[1-9]\d{6,14}$/;
  return e164Regex.test(cleaned);
}

/**
 * Formats a phone number to E.164 format.
 * @param phone - The phone number digits
 * @param countryCode - The country code with + prefix (e.g., "+1")
 */
export function formatPhoneE164(phone: string, countryCode: string): string {
  const digits = phone.replace(/\D/g, '');
  const cleanCountryCode = countryCode.startsWith('+') 
    ? countryCode 
    : `+${countryCode}`;
  return `${cleanCountryCode}${digits}`;
}
