import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Ruler, Scale, Calendar, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface BodyMeasurementsStepProps {
  onNext: () => void;
}

type UnitSystem = 'metric' | 'imperial';
type Gender = 'male' | 'female' | 'other' | null;

export function BodyMeasurementsStep({ onNext }: BodyMeasurementsStepProps) {
  const { user } = useAuth();
  const [units, setUnits] = useState<UnitSystem>('metric');
  const [gender, setGender] = useState<Gender>(null);
  const [heightCm, setHeightCm] = useState<number>(170);
  const [weightKg, setWeightKg] = useState<number>(70);
  const [birthYear, setBirthYear] = useState<number>(1990);
  const [isSaving, setIsSaving] = useState(false);

  // Imperial display values
  const [heightFt, setHeightFt] = useState<number>(5);
  const [heightIn, setHeightIn] = useState<number>(7);
  const [weightLbs, setWeightLbs] = useState<number>(154);

  // Convert metric to imperial for display
  useEffect(() => {
    const totalInches = heightCm / 2.54;
    setHeightFt(Math.floor(totalInches / 12));
    setHeightIn(Math.round(totalInches % 12));
    setWeightLbs(Math.round(weightKg * 2.205));
  }, [heightCm, weightKg]);

  const handleHeightChange = (value: number) => {
    if (units === 'metric') {
      setHeightCm(value);
    } else {
      const totalInches = heightFt * 12 + value;
      setHeightCm(Math.round(totalInches * 2.54));
      setHeightIn(value);
    }
  };

  const handleWeightChange = (value: number) => {
    if (units === 'metric') {
      setWeightKg(value);
    } else {
      setWeightKg(Math.round(value / 2.205));
      setWeightLbs(value);
    }
  };

  const handleContinue = async () => {
    if (!user) return;
    
    setIsSaving(true);
    
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;

    await supabase
      .from('profiles')
      .update({
        height_cm: heightCm,
        weight_kg: weightKg,
        age,
        gender: gender || undefined,
        unit_preference: units,
      })
      .eq('id', user.id);

    setIsSaving(false);
    onNext();
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Progress indicator */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="h-1 flex-1 rounded-full bg-primary" />
          <div className="h-1 flex-1 rounded-full bg-primary" />
          <div className="h-1 flex-1 rounded-full bg-border" />
          <div className="h-1 flex-1 rounded-full bg-border" />
          <div className="h-1 flex-1 rounded-full bg-border" />
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">Step 2 of 5</p>
      </div>

      {/* Main content - scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-foreground text-center mb-2"
        >
          Body Measurements
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground text-center text-sm mb-6"
        >
          For accurate calorie and distance calculations
        </motion.p>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {/* Units */}
          <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Ruler className="w-5 h-5 text-primary" />
                <span className="text-foreground font-medium">Units</span>
              </div>
              <div className="flex rounded-full bg-background p-1">
                <button
                  onClick={() => setUnits('metric')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    units === 'metric'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  Metric
                </button>
                <button
                  onClick={() => setUnits('imperial')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    units === 'imperial'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  Imperial
                </button>
              </div>
            </div>
          </div>

          {/* Gender */}
          <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-primary" />
                <span className="text-foreground font-medium">Sex</span>
              </div>
              <div className="flex rounded-full bg-background p-1">
                <button
                  onClick={() => setGender('male')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    gender === 'male'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  Male
                </button>
                <button
                  onClick={() => setGender('female')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    gender === 'female'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  Female
                </button>
              </div>
            </div>
          </div>

          {/* Height */}
          <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Ruler className="w-5 h-5 text-primary" />
                <span className="text-foreground font-medium">Height</span>
              </div>
              <span className="text-primary font-bold">
                {units === 'metric' ? `${heightCm} cm` : `${heightFt}'${heightIn}"`}
              </span>
            </div>
            <input
              type="range"
              min={units === 'metric' ? 140 : 0}
              max={units === 'metric' ? 220 : 11}
              value={units === 'metric' ? heightCm : heightIn}
              onChange={(e) => handleHeightChange(parseInt(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-border accent-primary"
            />
          </div>

          {/* Weight */}
          <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Scale className="w-5 h-5 text-primary" />
                <span className="text-foreground font-medium">Weight</span>
              </div>
              <span className="text-primary font-bold">
                {units === 'metric' ? `${weightKg} kg` : `${weightLbs} lbs`}
              </span>
            </div>
            <input
              type="range"
              min={units === 'metric' ? 30 : 66}
              max={units === 'metric' ? 200 : 440}
              value={units === 'metric' ? weightKg : weightLbs}
              onChange={(e) => handleWeightChange(parseInt(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-border accent-primary"
            />
          </div>

          {/* Birth Year */}
          <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="text-foreground font-medium">Birth Year</span>
              </div>
              <span className="text-primary font-bold">{birthYear}</span>
            </div>
            <input
              type="range"
              min={1930}
              max={2015}
              value={birthYear}
              onChange={(e) => setBirthYear(parseInt(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-border accent-primary"
            />
          </div>
        </motion.div>
      </div>

      {/* Fixed bottom button */}
      <div className="px-6 pb-6 pt-4 border-t border-border/30 bg-background">
        <Button
          onClick={handleContinue}
          disabled={isSaving}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-base"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Continue
              <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
