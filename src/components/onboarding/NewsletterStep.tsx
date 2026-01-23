import { forwardRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface NewsletterStepProps {
  onNext: () => void;
}

export const NewsletterStep = forwardRef<HTMLDivElement, NewsletterStepProps>(
  ({ onNext }, ref) => {
    const { user } = useAuth();
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubscribe = async () => {
      setIsSubmitting(true);

      try {
        if (user && isSubscribed) {
          const { error } = await supabase
            .from('profiles')
            .update({
              newsletter_subscribed: true,
              marketing_consent_at: new Date().toISOString(),
            })
            .eq('id', user.id);

          if (error) {
            console.error('[Newsletter] Error saving preference:', error);
          }
        }
      } catch (error) {
        console.error('[Newsletter] Unexpected error:', error);
      }

      setIsSubmitting(false);
      onNext();
    };

    const handleSkip = () => {
      onNext();
    };

    const benefits = [
      'Weekly step tips and motivation',
      'Exclusive challenges and rewards',
      'Health insights and research',
      'Community success stories',
    ];

    return (
      <div
        ref={ref}
        className="flex flex-col h-full bg-background text-foreground overflow-hidden"
      >
        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Header */}
          <div className="px-6 pt-8 pb-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6"
            >
              <Mail className="w-8 h-8 text-primary" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-2xl font-bold text-center mb-2"
            >
              Stay Motivated
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-muted-foreground text-center text-sm"
            >
              Get weekly tips to crush your step goals
            </motion.p>
          </div>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="px-6 pb-6"
          >
            <div className="p-5 rounded-2xl bg-card border border-border mb-6">
              <h3 className="font-semibold text-sm text-foreground mb-4">
                What you'll receive:
              </h3>
              <div className="space-y-3">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 0.4 }}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-sm text-foreground/80">{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Subscription Checkbox */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="p-4 rounded-xl bg-muted/50 border border-border"
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  id="newsletter"
                  checked={isSubscribed}
                  onCheckedChange={(checked) => setIsSubscribed(checked === true)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="newsletter"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Subscribe to our newsletter
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    One email per week. Unsubscribe anytime.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Privacy Notice */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              className="text-xs text-muted-foreground text-center mt-4"
            >
              We respect your privacy. Your email will only be used for this newsletter
              and will never be shared.
            </motion.p>
          </motion.div>
        </div>

        {/* Fixed CTA Buttons - Always Visible */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="flex-shrink-0 px-6 pt-4 space-y-3 safe-area-pb-cta"
        >
          <Button
            onClick={handleSubscribe}
            disabled={isSubmitting}
            size="lg"
            className="w-full h-14 text-lg font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : isSubscribed ? (
              'Subscribe & Continue'
            ) : (
              'Continue'
            )}
          </Button>

          {!isSubscribed && (
            <Button
              onClick={handleSkip}
              variant="ghost"
              size="lg"
              className="w-full h-12 text-muted-foreground"
            >
              Skip for now
            </Button>
          )}
        </motion.div>
      </div>
    );
  }
);

NewsletterStep.displayName = 'NewsletterStep';
