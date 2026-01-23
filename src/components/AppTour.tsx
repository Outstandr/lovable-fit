import { useEffect, useCallback } from 'react';
import { driver, Driver } from 'driver.js';
import 'driver.js/dist/driver.css';

interface AppTourProps {
  isOpen: boolean;
  onComplete: () => void;
}

const tourSteps = [
  {
    element: '.app-tour-progress-ring',
    popover: {
      title: 'Your Daily Progress',
      description: 'This ring fills up as you walk. Complete the circle to hit your daily step goal!',
    }
  },
  {
    element: '.app-tour-stats-row',
    popover: {
      title: 'Track Your Stats',
      description: 'Monitor your streak, calories burned, distance walked, and active time at a glance.',
    }
  },
  {
    element: '.app-tour-start-session',
    popover: {
      title: 'Start an Active Session',
      description: 'Tap here to begin a GPS-tracked walking session with live map and audiobook controls.',
    }
  },
  {
    element: '.app-tour-bottom-nav',
    popover: {
      title: 'Explore the App',
      description: 'Check the Leaderboard to compete, listen to the Audiobook while walking, complete Protocol tasks, and manage your Profile.',
    }
  },
  {
    element: '.app-tour-trend-chart',
    popover: {
      title: 'Your Weekly Progress',
      description: 'See how your steps compare across the week. The dotted line shows your daily goal. Keep it up!',
    }
  },
];

export const AppTour = ({ isOpen, onComplete }: AppTourProps) => {
  const startTour = useCallback(() => {
    const driverObj: Driver = driver({
      showProgress: true,
      animate: true,
      overlayColor: 'rgba(0, 0, 0, 0.8)',
      popoverClass: 'app-tour-popover',
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: "Let's Go!",
      progressText: '{{current}} of {{total}}',
      allowClose: true,
      steps: tourSteps,
      onDestroyStarted: () => {
        onComplete();
        driverObj.destroy();
      },
    });

    driverObj.drive();
  }, [onComplete]);

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure elements are rendered
      const timer = setTimeout(() => {
        startTour();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, startTour]);

  return null;
};

export default AppTour;
