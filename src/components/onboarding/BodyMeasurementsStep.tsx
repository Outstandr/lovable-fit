import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Ruler, Scale, Calendar } from 'lucide-react';
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
      // Convert imperial to metric
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
    <div className="min-h-screen-safe flex flex-col px-6 py-8">
      {/* Icon */}
      <div className="flex items-center justify-center mb-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="relative"
        >
          <div className="w-20 h-32 flex flex-col items-center">
            {/* Person icon */}
            <div className="w-4 h-4 rounded-full border-2 border-foreground mb-1" />
            <div className="w-8 h-px bg-foreground" />
            <div className="w-px h-10 bg-foreground" />
            <div className="flex">
              <div className="w-px h-8 bg-foreground transform -rotate-12 origin-top" />
              <div className="w-4" />
              <div className="w-px h-8 bg-foreground transform rotate-12 origin-top" />
            </div>
          </div>
          {/* Measurement lines */}
          <div className="absolute -left-4 top-0 w-px h-full bg-muted-foreground/50" />
          <div className="absolute -right-4 top-0 w-px h-full bg-muted-foreground/50" />
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
        className="text-muted-foreground text-center text-sm mb-8"
      >
        Your body measurements are important for accurate steps, distance, and calories tracking.
      </motion.p>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex-1 space-y-5"
      >
        {/* Units */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Ruler className="w-5 h-5 text-primary" />
            <span className="text-foreground">Units</span>
          </div>
          <div className="flex rounded-full bg-secondary p-1">
            <button
              onClick={() => setUnits('metric')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                units === 'metric'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              Metric
            </button>
            <button
              onClick={() => setUnits('imperial')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                units === 'imperial'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              Imperial
            </button>
          </div>
        </div>

        {/* Gender */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-primary" />
            <span className="text-foreground">Sex</span>
          </div>
          <div className="flex rounded-full bg-secondary p-1">
            <button
              onClick={() => setGender('male')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                gender === 'male'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              Male
            </button>
            <button
              onClick={() => setGender('female')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                gender === 'female'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              Female
            </button>
          </div>
        </div>

        {/* Height */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Ruler className="w-5 h-5 text-primary" />
            <div>
              <span className="text-foreground block">Height</span>
              <span className="text-muted-foreground text-sm">
                {units === 'metric' ? `${heightCm} cm` : `${heightFt}'${heightIn}"`}
              </span>
            </div>
          </div>
          <input
            type="range"
            min={units === 'metric' ? 140 : 0}
            max={units === 'metric' ? 220 : 11}
            value={units === 'metric' ? heightCm : heightIn}
            onChange={(e) => handleHeightChange(parseInt(e.target.value))}
            className="w-32 accent-primary"
          />
        </div>

        {/* Weight */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scale className="w-5 h-5 text-primary" />
            <div>
              <span className="text-foreground block">Body Weight</span>
              <span className="text-muted-foreground text-sm">
                {units === 'metric' ? `${weightKg} kg` : `${weightLbs} lbs`}
              </span>
            </div>
          </div>
          <input
            type="range"
            min={units === 'metric' ? 30 : 66}
            max={units === 'metric' ? 200 : 440}
            value={units === 'metric' ? weightKg : weightLbs}
            onChange={(e) => handleWeightChange(parseInt(e.target.value))}
            className="w-32 accent-primary"
          />
        </div>

        {/* Birth Year */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary" />
            <div>
              <span className="text-foreground block">Year of birth</span>
              <span className="text-muted-foreground text-sm">{birthYear}</span>
            </div>
          </div>
          <input
            type="range"
            min={1930}
            max={2015}
            value={birthYear}
            onChange={(e) => setBirthYear(parseInt(e.target.value))}
            className="w-32 accent-primary"
          />
        </div>
      </motion.div>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="safe-area-pb mt-6"
      >
        <Button
          onClick={handleContinue}
          disabled={isSaving}
          className="w-full h-14 rounded-full bg-primary text-primary-foreground font-semibold text-base"
        >
          {isSaving ? 'Saving...' : 'Continue'}
        </Button>
      </motion.div>
    </div>
  );
}
