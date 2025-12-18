import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, ArrowLeftRight, Heart, Ruler, Scale, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type UnitSystem = 'metric' | 'imperial';

interface HealthProfile {
  height_cm: number | null;
  weight_kg: number | null;
  age: number | null;
  gender: string | null;
}

interface FormErrors {
  height?: string;
  weight?: string;
  age?: string;
  gender?: string;
}

export default function HealthProfileSetup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Unit system
  const [heightUnit, setHeightUnit] = useState<UnitSystem>('metric');
  const [weightUnit, setWeightUnit] = useState<UnitSystem>('metric');
  
  // Form values (stored in metric)
  const [heightCm, setHeightCm] = useState<string>('');
  const [weightKg, setWeightKg] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  
  // Display values for imperial
  const [heightFeet, setHeightFeet] = useState<string>('');
  const [heightInches, setHeightInches] = useState<string>('');
  const [weightLbs, setWeightLbs] = useState<string>('');
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [existingProfile, setExistingProfile] = useState<HealthProfile | null>(null);

  // Load existing profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('height_cm, weight_kg, age, gender')
          .eq('id', user.id)
          .maybeSingle();
        
        if (error) throw error;
        
        if (data) {
          setExistingProfile(data);
          if (data.height_cm) setHeightCm(String(data.height_cm));
          if (data.weight_kg) setWeightKg(String(data.weight_kg));
          if (data.age) setAge(String(data.age));
          if (data.gender) setGender(data.gender);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProfile();
  }, [user]);

  // Convert metric to imperial for display
  useEffect(() => {
    if (heightCm && heightUnit === 'imperial') {
      const totalInches = parseFloat(heightCm) / 2.54;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      setHeightFeet(String(feet));
      setHeightInches(String(inches));
    }
  }, [heightCm, heightUnit]);

  useEffect(() => {
    if (weightKg && weightUnit === 'imperial') {
      const lbs = Math.round(parseFloat(weightKg) * 2.205);
      setWeightLbs(String(lbs));
    }
  }, [weightKg, weightUnit]);

  // Handle unit toggle for height
  const toggleHeightUnit = () => {
    if (heightUnit === 'metric') {
      // Convert to imperial display
      if (heightCm) {
        const totalInches = parseFloat(heightCm) / 2.54;
        const feet = Math.floor(totalInches / 12);
        const inches = Math.round(totalInches % 12);
        setHeightFeet(String(feet));
        setHeightInches(String(inches));
      }
      setHeightUnit('imperial');
    } else {
      // Convert back to metric
      if (heightFeet || heightInches) {
        const totalInches = (parseInt(heightFeet || '0') * 12) + parseInt(heightInches || '0');
        const cm = Math.round(totalInches * 2.54);
        setHeightCm(String(cm));
      }
      setHeightUnit('metric');
    }
  };

  // Handle unit toggle for weight
  const toggleWeightUnit = () => {
    if (weightUnit === 'metric') {
      // Convert to imperial display
      if (weightKg) {
        const lbs = Math.round(parseFloat(weightKg) * 2.205);
        setWeightLbs(String(lbs));
      }
      setWeightUnit('imperial');
    } else {
      // Convert back to metric
      if (weightLbs) {
        const kg = Math.round(parseFloat(weightLbs) / 2.205);
        setWeightKg(String(kg));
      }
      setWeightUnit('metric');
    }
  };

  // Update metric values when imperial changes
  const handleImperialHeightChange = (feet: string, inches: string) => {
    setHeightFeet(feet);
    setHeightInches(inches);
    if (feet || inches) {
      const totalInches = (parseInt(feet || '0') * 12) + parseInt(inches || '0');
      const cm = Math.round(totalInches * 2.54);
      setHeightCm(String(cm));
    }
  };

  const handleImperialWeightChange = (lbs: string) => {
    setWeightLbs(lbs);
    if (lbs) {
      const kg = Math.round(parseFloat(lbs) / 2.205);
      setWeightKg(String(kg));
    }
  };

  // Validation
  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    
    const height = parseFloat(heightCm);
    const weight = parseFloat(weightKg);
    const ageNum = parseInt(age);
    
    if (!heightCm || isNaN(height) || height < 140 || height > 220) {
      newErrors.height = 'Height must be between 140-220 cm';
    }
    
    if (!weightKg || isNaN(weight) || weight < 30 || weight > 200) {
      newErrors.weight = 'Weight must be between 30-200 kg';
    }
    
    if (!age || isNaN(ageNum) || ageNum < 13 || ageNum > 99) {
      newErrors.age = 'Age must be between 13-99';
    }
    
    if (!gender) {
      newErrors.gender = 'Please select a gender';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid = () => {
    const height = parseFloat(heightCm);
    const weight = parseFloat(weightKg);
    const ageNum = parseInt(age);
    
    return (
      heightCm && !isNaN(height) && height >= 140 && height <= 220 &&
      weightKg && !isNaN(weight) && weight >= 30 && weight <= 200 &&
      age && !isNaN(ageNum) && ageNum >= 13 && ageNum <= 99 &&
      gender
    );
  };

  const handleSave = async () => {
    if (!validate() || !user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          height_cm: parseFloat(heightCm),
          weight_kg: parseFloat(weightKg),
          age: parseInt(age),
          gender,
          data_source: 'manual',
          profile_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast.success('Profile saved successfully');
      navigate('/');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => navigate('/')}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold tracking-wide text-foreground">YOUR STATS</h1>
          <button 
            onClick={handleSave}
            disabled={!isFormValid() || isSaving}
            className="p-2 -mr-2 text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
          >
            <Check className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Intro text */}
        <motion.p 
          className="text-sm text-muted-foreground text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Basic health information to personalize your protocol.
        </motion.p>

        {/* Form fields */}
        <div className="space-y-5">
          {/* Height */}
          <motion.div 
            className="space-y-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-primary" />
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Height
              </Label>
            </div>
            <div className="flex items-center gap-2">
              {heightUnit === 'metric' ? (
                <div className="relative flex-1">
                  <Input
                    type="number"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="175"
                    className="pr-12 bg-card border-border/50 focus:border-primary"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    cm
                  </span>
                </div>
              ) : (
                <div className="flex-1 flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      value={heightFeet}
                      onChange={(e) => handleImperialHeightChange(e.target.value, heightInches)}
                      placeholder="5"
                      className="pr-8 bg-card border-border/50 focus:border-primary"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      ft
                    </span>
                  </div>
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      value={heightInches}
                      onChange={(e) => handleImperialHeightChange(heightFeet, e.target.value)}
                      placeholder="9"
                      className="pr-8 bg-card border-border/50 focus:border-primary"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      in
                    </span>
                  </div>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={toggleHeightUnit}
                className="shrink-0 border-border/50 hover:bg-primary/10 hover:border-primary"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
            </div>
            {errors.height && (
              <p className="text-xs text-destructive">{errors.height}</p>
            )}
          </motion.div>

          {/* Weight */}
          <motion.div 
            className="space-y-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Weight
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  type="number"
                  value={weightUnit === 'metric' ? weightKg : weightLbs}
                  onChange={(e) => weightUnit === 'metric' 
                    ? setWeightKg(e.target.value) 
                    : handleImperialWeightChange(e.target.value)
                  }
                  placeholder={weightUnit === 'metric' ? '70' : '154'}
                  className="pr-12 bg-card border-border/50 focus:border-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {weightUnit === 'metric' ? 'kg' : 'lbs'}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={toggleWeightUnit}
                className="shrink-0 border-border/50 hover:bg-primary/10 hover:border-primary"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
            </div>
            {errors.weight && (
              <p className="text-xs text-destructive">{errors.weight}</p>
            )}
          </motion.div>

          {/* Age */}
          <motion.div 
            className="space-y-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Age
              </Label>
            </div>
            <div className="relative">
              <Input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="25"
                className="pr-16 bg-card border-border/50 focus:border-primary"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                years
              </span>
            </div>
            {errors.age && (
              <p className="text-xs text-destructive">{errors.age}</p>
            )}
          </motion.div>

          {/* Gender */}
          <motion.div 
            className="space-y-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Gender
              </Label>
            </div>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="bg-card border-border/50 focus:border-primary">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
            {errors.gender && (
              <p className="text-xs text-destructive">{errors.gender}</p>
            )}
          </motion.div>
        </div>

        {/* Save button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="pt-4 space-y-3"
        >
          <Button
            onClick={handleSave}
            disabled={!isFormValid() || isSaving}
            className="w-full h-12 text-base font-bold tracking-wide bg-primary hover:bg-primary/90"
          >
            {isSaving ? 'SAVING...' : 'SAVE & CONTINUE'}
          </Button>
          
          <button
            onClick={handleSkip}
            className="w-full py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for Now
          </button>
        </motion.div>

        {/* Last updated info */}
        {existingProfile?.height_cm && (
          <motion.p 
            className="text-xs text-muted-foreground text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Last updated: {new Date().toLocaleDateString()}
          </motion.p>
        )}
      </div>
    </div>
  );
}
