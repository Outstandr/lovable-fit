import { useState } from "react";
import { motion } from "framer-motion";
import { Ruler, Scale, User, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface BodyMeasurementsStepProps {
  onNext: () => void;
}

export function BodyMeasurementsStep({ onNext }: BodyMeasurementsStepProps) {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  const [gender, setGender] = useState<string>('');

  // Metric values (always stored in metric)
  const [heightCm, setHeightCm] = useState<string>('170');
  const [weightKg, setWeightKg] = useState<string>('70');
  const [birthYear, setBirthYear] = useState<string>('2000');

  // Imperial display values
  const [heightFt, setHeightFt] = useState<string>('5');
  const [heightIn, setHeightIn] = useState<string>('7');
  const [weightLbs, setWeightLbs] = useState<string>('154');

  // Convert metric to imperial for display
  const updateImperialFromMetric = () => {
    if (heightCm) {
      const totalInches = parseFloat(heightCm) / 2.54;
      setHeightFt(Math.floor(totalInches / 12).toString());
      setHeightIn(Math.round(totalInches % 12).toString());
    }
    if (weightKg) {
      setWeightLbs(Math.round(parseFloat(weightKg) * 2.205).toString());
    }
  };

  // Convert imperial to metric for storage
  const updateMetricFromImperial = () => {
    if (heightFt && heightIn) {
      const totalInches = (parseInt(heightFt) * 12) + parseInt(heightIn);
      setHeightCm(Math.round(totalInches * 2.54).toString());
    }
    if (weightLbs) {
      setWeightKg(Math.round(parseFloat(weightLbs) / 2.205).toString());
    }
  };

  // Handle unit toggle
  const handleUnitsChange = (newUnits: 'metric' | 'imperial') => {
    if (newUnits === 'imperial' && units === 'metric') {
      updateImperialFromMetric();
    } else if (newUnits === 'metric' && units === 'imperial') {
      updateMetricFromImperial();
    }
    setUnits(newUnits);
  };

  // Handle imperial height change
  const handleImperialHeightChange = (feet: string, inches: string) => {
    setHeightFt(feet);
    setHeightIn(inches);
    if (feet && inches) {
      const totalInches = (parseInt(feet || '0') * 12) + parseInt(inches || '0');
      setHeightCm(Math.round(totalInches * 2.54).toString());
    }
  };

  // Handle imperial weight change
  const handleImperialWeightChange = (lbs: string) => {
    setWeightLbs(lbs);
    if (lbs) {
      setWeightKg(Math.round(parseFloat(lbs) / 2.205).toString());
    }
  };

  // Add error state
  const [error, setError] = useState<string | null>(null);

  const handleContinue = () => {
    setError(null);

    // Validate gender selection
    if (!gender) {
      setError("Please select your gender to continue");
      return;
    }

    // Validate inputs
    const height = parseFloat(heightCm);
    const weight = parseFloat(weightKg);
    const year = parseInt(birthYear);
    const currentYear = new Date().getFullYear();

    if (isNaN(height) || height < 140 || height > 220) {
      setError("Please enter a valid height (140-220 cm)");
      return;
    }

    if (isNaN(weight) || weight < 30 || weight > 200) {
      setError("Please enter a valid weight (30-200 kg)");
      return;
    }

    if (isNaN(year) || year < 1930 || year > currentYear - 13) {
      setError("Please enter a valid birth year");
      return;
    }

    // If no user, just proceed to next step
    if (!user) {
      onNext();
      return;
    }

    // OPTIMISTIC NAVIGATION: Proceed immediately
    onNext();

    // Fire and forget save operation
    const saveProfile = async () => {
      try {
        const age = currentYear - year;

        const { error: saveError } = await supabase
          .from('profiles')
          .update({
            height_cm: height,
            weight_kg: weight,
            age,
            gender,
            unit_preference: units,
          })
          .eq('id', user.id);

        if (saveError) {
          console.error('[BodyMeasurements] Error saving:', saveError);
        } else {
          console.log("Profile saved successfully!");
        }
      } catch (err) {
        console.error('[BodyMeasurements] Exception:', err);
      }
    };

    saveProfile();
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-8 pb-4">
        <div className="flex items-center justify-center mb-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="p-4 rounded-full bg-primary/10"
          >
            <User className="w-12 h-12 text-primary" />
          </motion.div>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold text-foreground text-center mb-2"
        >
          Body Measurements
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground text-center text-sm"
        >
          Help us personalize your fitness tracking
        </motion.p>
      </div>

      {/* Scrollable Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex-1 min-h-0 overflow-y-auto px-6"
      >
        <div className="space-y-6 pb-4">
          {/* Units Toggle */}
          <div className="tactical-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Unit System</span>
              </div>
            </div>
            <div className="flex rounded-lg bg-secondary p-1">
              <button
                onClick={() => handleUnitsChange('metric')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${units === 'metric'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Metric
              </button>
              <button
                onClick={() => handleUnitsChange('imperial')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${units === 'imperial'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Imperial
              </button>
            </div>
          </div>

          {/* Gender */}
          <div className="tactical-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Sex</span>
            </div>
            <div className="flex rounded-lg bg-secondary p-1">
              <button
                onClick={() => setGender('male')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${gender === 'male'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Male
              </button>
              <button
                onClick={() => setGender('female')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${gender === 'female'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Female
              </button>
            </div>
          </div>

          {/* Height */}
          <div className="tactical-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Ruler className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Height</span>
            </div>
            {units === 'metric' ? (
              <div className="relative">
                <Input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="170"
                  className="pr-12 h-12 text-lg bg-secondary border-border/50 focus:border-primary"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                  cm
                </span>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type="number"
                    value={heightFt}
                    onChange={(e) => handleImperialHeightChange(e.target.value, heightIn)}
                    placeholder="5"
                    className="pr-10 h-12 text-lg bg-secondary border-border/50 focus:border-primary"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                    ft
                  </span>
                </div>
                <div className="relative flex-1">
                  <Input
                    type="number"
                    value={heightIn}
                    onChange={(e) => handleImperialHeightChange(heightFt, e.target.value)}
                    placeholder="7"
                    className="pr-10 h-12 text-lg bg-secondary border-border/50 focus:border-primary"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                    in
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Weight */}
          <div className="tactical-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Scale className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Weight</span>
            </div>
            <div className="relative">
              <Input
                type="number"
                value={units === 'metric' ? weightKg : weightLbs}
                onChange={(e) =>
                  units === 'metric'
                    ? setWeightKg(e.target.value)
                    : handleImperialWeightChange(e.target.value)
                }
                placeholder={units === 'metric' ? '70' : '154'}
                className="pr-14 h-12 text-lg bg-secondary border-border/50 focus:border-primary"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                {units === 'metric' ? 'kg' : 'lbs'}
              </span>
            </div>
          </div>

          {/* Birth Year */}
          <div className="tactical-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Year of Birth</span>
            </div>
            <div className="relative">
              <Input
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder="2000"
                className="h-12 text-lg bg-secondary border-border/50 focus:border-primary"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Fixed Continue Button - Always Visible */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex-shrink-0 px-6 pt-4 safe-area-pb-cta"
      >
        <div className="text-center mb-4">
          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
        </div>
        <Button
          onClick={handleContinue}
          disabled={isSaving || !gender}
          className="w-full h-14 rounded-full bg-primary text-primary-foreground font-semibold text-base shadow-glow-sm hover:shadow-glow-md transition-all disabled:opacity-50"
        >
          {isSaving ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Saving...</span>
            </div>
          ) : (
            'Continue'
          )}
        </Button>
      </motion.div>
    </div>
  );
}
