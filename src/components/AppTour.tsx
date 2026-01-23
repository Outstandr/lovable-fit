import { useEffect, useCallback, useRef } from 'react';
import { driver, Driver } from 'driver.js';
import { useNavigate } from 'react-router-dom';
import 'driver.js/dist/driver.css';

interface AppTourProps {
  isOpen: boolean;
  onComplete: () => void;
  onTabChange?: (tab: 'day' | 'week' | 'month') => void;
}

export const AppTour = ({ isOpen, onComplete, onTabChange }: AppTourProps) => {
  const navigate = useNavigate();
  const driverRef = useRef<Driver | null>(null);

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
      steps: [
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
          element: '.app-tour-week-tab',
          popover: {
            title: 'View Weekly Progress',
            description: 'Switch to Week view to see your 7-day step history and track your consistency!',
          },
          onHighlightStarted: () => {
            // Make sure we're on the dashboard
            navigate('/');
          }
        },
        {
          element: '.app-tour-week-chart',
          popover: {
            title: 'Weekly Bar Chart',
            description: 'See how your steps stack up each day. The dashed line shows your daily goal.',
          },
          onHighlightStarted: () => {
            // Switch to week tab
            onTabChange?.('week');
          }
        },
        {
          element: '.app-tour-leaderboard-nav',
          popover: {
            title: 'Compete with Others',
            description: "Tap here to see the Leaderboard and compete with other walkers!",
          },
          onHighlightStarted: () => {
            // Switch back to day view first
            onTabChange?.('day');
          }
        },
        {
          element: '.app-tour-leaderboard-podium',
          popover: {
            title: 'The Podium',
            description: 'Top 3 walkers are displayed on the podium. Can you make it to the top?',
          },
          onHighlightStarted: () => {
            // Navigate to leaderboard
            navigate('/leaderboard');
          }
        },
        {
          element: '.app-tour-leaderboard-tabs',
          popover: {
            title: 'Time Periods',
            description: "Switch between Today, Week, and Month to see different ranking periods.",
          }
        },
        {
          element: '.app-tour-bottom-nav',
          popover: {
            title: 'Explore the App',
            description: 'Check the Leaderboard to compete, listen to the Audiobook while walking, complete Protocol tasks, and manage your Profile.',
          }
        },
      ],
      onDestroyStarted: () => {
        // Return to dashboard when tour ends
        navigate('/');
        onTabChange?.('day');
        onComplete();
        driverObj.destroy();
      },
    });

    driverRef.current = driverObj;
    driverObj.drive();
  }, [onComplete, onTabChange, navigate]);

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
