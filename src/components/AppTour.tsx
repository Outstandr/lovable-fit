import { useEffect, useCallback, useRef } from 'react';
import { driver, Driver } from 'driver.js';
import { useNavigate, useLocation } from 'react-router-dom';
import 'driver.js/dist/driver.css';

interface AppTourProps {
  isOpen: boolean;
  onComplete: () => void;
  onTabChange?: (tab: 'day' | 'week' | 'month') => void;
}

export const AppTour = ({ isOpen, onComplete, onTabChange }: AppTourProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const driverRef = useRef<Driver | null>(null);
  const isRunningRef = useRef(false);

  const startTour = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    // Ensure we start from the dashboard in day view
    if (location.pathname !== '/') {
      navigate('/');
    }
    onTabChange?.('day');

    // Wait for navigation to complete
    setTimeout(() => {
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
              description: 'Tap here to begin a GPS-tracked walking session with live map.',
            }
          },
          {
            element: '.app-tour-week-tab',
            popover: {
              title: 'View Weekly Progress',
              description: 'Switch to Week view to see your 7-day step history and track your consistency!',
              onNextClick: () => {
                // Switch to week tab, then move to next step after delay
                onTabChange?.('week');
                setTimeout(() => {
                  driverObj.moveNext();
                }, 400);
              }
            }
          },
          {
            element: '.app-tour-week-chart',
            popover: {
              title: 'Weekly Bar Chart',
              description: 'See how your steps stack up each day. The dashed line shows your daily goal.',
              onPrevClick: () => {
                // Go back to day view
                onTabChange?.('day');
                setTimeout(() => {
                  driverObj.movePrevious();
                }, 400);
              },
              onNextClick: () => {
                // Switch to month tab
                onTabChange?.('month');
                setTimeout(() => {
                  driverObj.moveNext();
                }, 400);
              }
            }
          },
          {
            element: '.app-tour-month-tab',
            popover: {
              title: 'Monthly Overview',
              description: 'Switch to Month view for a calendar heatmap showing your entire month at a glance!',
              onPrevClick: () => {
                // Go back to week view
                onTabChange?.('week');
                setTimeout(() => {
                  driverObj.movePrevious();
                }, 400);
              },
              onNextClick: () => {
                // Already on month, move to calendar step
                driverObj.moveNext();
              }
            }
          },
          {
            element: '.app-tour-month-calendar',
            popover: {
              title: 'Calendar Heatmap',
              description: 'Each day shows your steps with color intensity. Green means you hit your goal that day!',
              onPrevClick: () => {
                driverObj.movePrevious();
              },
              onNextClick: () => {
                // Switch back to day view before navigating to leaderboard step
                onTabChange?.('day');
                setTimeout(() => {
                  driverObj.moveNext();
                }, 300);
              }
            }
          },
          {
            element: '.app-tour-leaderboard-nav',
            popover: {
              title: 'Compete with Others',
              description: "Tap here to see the Leaderboard and compete with other walkers!",
              onNextClick: () => {
                // Navigate to leaderboard, then move to next step
                navigate('/leaderboard');
                setTimeout(() => {
                  driverObj.moveNext();
                }, 500);
              }
            }
          },
          {
            element: '.app-tour-leaderboard-podium',
            popover: {
              title: 'The Podium',
              description: 'Top 3 walkers are displayed on the podium. Can you make it to the top?',
              onPrevClick: () => {
                // Go back to dashboard
                navigate('/');
                setTimeout(() => {
                  driverObj.movePrevious();
                }, 400);
              },
              onNextClick: () => {
                // Just move to next step, we're already on leaderboard
                driverObj.moveNext();
              }
            }
          },
          {
            element: '.app-tour-leaderboard-tabs',
            popover: {
              title: 'Time Periods',
              description: "Switch between Today, Week, and Month to see different ranking periods.",
              onPrevClick: () => {
                driverObj.movePrevious();
              },
              onNextClick: () => {
                // Return to dashboard for final step
                navigate('/');
                setTimeout(() => {
                  driverObj.moveNext();
                }, 400);
              }
            }
          },
          {
            element: '.app-tour-bottom-nav',
            popover: {
              title: 'Explore the App',
              description: 'Complete Protocol tasks, view the Leaderboard, and manage your Profile settings.',
              onPrevClick: () => {
                // Go back to leaderboard
                navigate('/leaderboard');
                setTimeout(() => {
                  driverObj.movePrevious();
                }, 400);
              }
            }
          },
        ],
        onDestroyStarted: () => {
          isRunningRef.current = false;
          // Return to dashboard when tour ends
          navigate('/');
          onTabChange?.('day');
          onComplete();
          driverObj.destroy();
        },
      });

      driverRef.current = driverObj;
      driverObj.drive();
    }, 300);
  }, [onComplete, onTabChange, navigate, location.pathname]);

  useEffect(() => {
    if (isOpen && !isRunningRef.current) {
      startTour();
    }
  }, [isOpen, startTour]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
        isRunningRef.current = false;
      }
    };
  }, []);

  return null;
};

export default AppTour;
