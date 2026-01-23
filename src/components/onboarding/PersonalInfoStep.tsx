import { forwardRef, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { validatePhoneNumber, formatPhoneE164 } from '@/lib/utils';

interface PersonalInfoStepProps {
  onNext: () => void;
}

export const PersonalInfoStep = forwardRef<HTMLDivElement, PersonalInfoStepProps>(
  ({ onNext }, ref) => {
    const { user } = useAuth();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [countryCode, setCountryCode] = useState('+1');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validateForm = (): boolean => {
      const newErrors: Record<string, string> = {};

      if (!firstName.trim()) {
        newErrors.firstName = 'First name is required';
      } else if (firstName.trim().length < 2) {
        newErrors.firstName = 'First name must be at least 2 characters';
      } else if (firstName.trim().length > 50) {
        newErrors.firstName = 'First name must be less than 50 characters';
      }

      if (!lastName.trim()) {
        newErrors.lastName = 'Last name is required';
      } else if (lastName.trim().length < 2) {
        newErrors.lastName = 'Last name must be at least 2 characters';
      } else if (lastName.trim().length > 50) {
        newErrors.lastName = 'Last name must be less than 50 characters';
      }

      // Phone is optional, but validate format if provided
      if (phoneNumber.trim()) {
        const fullPhone = formatPhoneE164(phoneNumber, countryCode);
        if (!validatePhoneNumber(fullPhone)) {
          newErrors.phoneNumber = 'Please enter a valid phone number';
        }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleContinue = async () => {
      if (!validateForm()) return;

      setIsSubmitting(true);

      try {
        if (user) {
          const formattedPhone = phoneNumber.trim()
            ? formatPhoneE164(phoneNumber, countryCode)
            : null;

          const displayName = `${firstName.trim().toUpperCase()} ${lastName.trim().charAt(0).toUpperCase()}`;
          const avatarInitials = `${firstName.trim().charAt(0).toUpperCase()}${lastName.trim().charAt(0).toUpperCase()}`;

          const { error } = await supabase
            .from('profiles')
            .update({
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              phone_number: formattedPhone,
              display_name: displayName,
              avatar_initials: avatarInitials,
            })
            .eq('id', user.id);

          if (error) {
            console.error('[PersonalInfo] Error saving profile:', error);
          }
        }
      } catch (error) {
        console.error('[PersonalInfo] Unexpected error:', error);
      }

      setIsSubmitting(false);
      onNext();
    };

    return (
      <div
        ref={ref}
        className="flex flex-col min-h-screen bg-background text-foreground"
      >
        {/* Header */}
        <div className="px-6 pt-12 pb-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6"
          >
            <User className="w-8 h-8 text-primary" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-2xl font-bold text-center mb-2"
          >
            Tell us about yourself
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-muted-foreground text-center text-sm"
          >
            Your name will appear on the leaderboard
          </motion.p>
        </div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex-1 px-6 space-y-5"
        >
          {/* First Name */}
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-sm font-medium">
              First Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="firstName"
              type="text"
              placeholder="John"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                if (errors.firstName) {
                  setErrors((prev) => ({ ...prev, firstName: '' }));
                }
              }}
              className={errors.firstName ? 'border-destructive' : ''}
              autoComplete="given-name"
              maxLength={50}
            />
            {errors.firstName && (
              <p className="text-xs text-destructive">{errors.firstName}</p>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-sm font-medium">
              Last Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Smith"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                if (errors.lastName) {
                  setErrors((prev) => ({ ...prev, lastName: '' }));
                }
              }}
              className={errors.lastName ? 'border-destructive' : ''}
              autoComplete="family-name"
              maxLength={50}
            />
            {errors.lastName && (
              <p className="text-xs text-destructive">{errors.lastName}</p>
            )}
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="text-sm font-medium">
              Phone Number <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-24 h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="+1">+1 🇺🇸</option>
                <option value="+44">+44 🇬🇧</option>
                <option value="+61">+61 🇦🇺</option>
                <option value="+91">+91 🇮🇳</option>
                <option value="+49">+49 🇩🇪</option>
                <option value="+33">+33 🇫🇷</option>
                <option value="+81">+81 🇯🇵</option>
                <option value="+86">+86 🇨🇳</option>
                <option value="+55">+55 🇧🇷</option>
                <option value="+52">+52 🇲🇽</option>
              </select>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="555 123 4567"
                value={phoneNumber}
                onChange={(e) => {
                  // Only allow digits and spaces
                  const cleaned = e.target.value.replace(/[^\d\s]/g, '');
                  setPhoneNumber(cleaned);
                  if (errors.phoneNumber) {
                    setErrors((prev) => ({ ...prev, phoneNumber: '' }));
                  }
                }}
                className={`flex-1 ${errors.phoneNumber ? 'border-destructive' : ''}`}
                autoComplete="tel-national"
                maxLength={15}
              />
            </div>
            {errors.phoneNumber && (
              <p className="text-xs text-destructive">{errors.phoneNumber}</p>
            )}
          </div>

          {/* Privacy Notice */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border"
          >
            <Phone className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Your phone number is used only for account recovery. We never share your
              personal information with third parties.
            </p>
          </motion.div>
        </motion.div>

        {/* Privacy Badge & CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="px-6 pb-12 pt-6 space-y-4"
        >
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Your data is encrypted and secure</span>
          </div>

          <Button
            onClick={handleContinue}
            disabled={isSubmitting}
            size="lg"
            className="w-full h-14 text-lg font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </motion.div>
      </div>
    );
  }
);

PersonalInfoStep.displayName = 'PersonalInfoStep';
