import React, { useEffect, useState, useRef } from 'react';
import styles from './GazeTrackingWidget.module.css';
import interviewGuy from './interview_guy.jpg';

// Define the type for a gaze point with x, y coordinates and duration.
type GazePoint = {
    x: number;
    y: number;
    duration: number;
};

// Extending the global window object to include GazeCloudAPI.
declare global {
    interface Window {
        GazeCloudAPI: any;
    }
}

const GazeTrackingWidget = () => {
    // State to store gaze points.
    const [gazePoints, setGazePoints] = useState<GazePoint[]>([]);
    // Ref to track if the system has been calibrated.
    const isCalibratedRef = useRef(false);
    // State to control the visibility of camera and meeting buttons.
    const [showCameraAndMeetingButtons, setShowCameraAndMeetingButtons] = useState(true);
    // State to track if the gaze tracking has been stopped.
    const [trackingStopped, setTrackingStopped] = useState(false);

    // Effect hook to load and setup the GazeCloudAPI script.
    useEffect(() => {
        // Handler for script errors.
        const handleScriptError = (msg: string) => {
            console.error('Script error:', msg);
        };

        // Function to process gaze data.
        const processGaze = (GazeData: any) => {
            if (!isCalibratedRef.current || trackingStopped) return;

            const x = GazeData.docX;
            const y = GazeData.docY;

            // Update gaze points state by adding new points or updating existing ones.
            setGazePoints(prevPoints => {
                let pointUpdated = false;
                const updatedPoints = prevPoints.map(point => {
                    if (Math.abs(point.x - x) < 50 && Math.abs(point.y - y) < 50) {
                        pointUpdated = true;
                        return { ...point, duration: point.duration + 1 };
                    }
                    return point;
                });

                if (!pointUpdated) {
                    updatedPoints.push({ x, y, duration: 1 });
                }

                return updatedPoints;
            });

            // Update the gaze element's position on the screen.
            const gaze = document.getElementById("gaze");
            if (gaze) {
                gaze.style.left = `${x}px`;
                gaze.style.top = `${y}px`;
                gaze.style.display = 'block';
            }
        };

        // Load the GazeCloudAPI script dynamically if window is defined.
        if (typeof window !== "undefined") {
            const script = document.createElement('script');
            script.src = 'https://api.gazerecorder.com/GazeCloudAPI.js';
            script.async = true;

            // Setup event handlers for the GazeCloudAPI script.
            script.onload = () => {
                window.GazeCloudAPI.OnCalibrationComplete = () => {
                    isCalibratedRef.current = true;
                    setShowCameraAndMeetingButtons(false);
                    setTrackingStopped(false); // Resume tracking after calibration
                };
                window.GazeCloudAPI.OnCamDenied = () => console.log('Camera access denied');
                window.GazeCloudAPI.OnError = (msg: any) => console.log('Error: ', msg);
                window.GazeCloudAPI.OnResult = processGaze;
            };

            script.onerror = () => handleScriptError('Script loading error!');

            // Append the script to the body of the document.
            document.body.appendChild(script);
        }

        // Cleanup function to stop eye tracking when the component unmounts.
        return () => {
            if (window.GazeCloudAPI) {
                window.GazeCloudAPI.StopEyeTracking();
            }
        };
    }, []);

    // Function to start gaze tracking.
    const startTracking = () => {
        window.GazeCloudAPI.StartEyeTracking();
        setTrackingStopped(false);
    };

    // Function to stop gaze tracking.
    const stopTracking = () => {
        window.GazeCloudAPI.StopEyeTracking();
        setTrackingStopped(true);
    };

    // Main component rendering.
    return (
        <div style={{
            position: 'relative',
            height: '80vh',
            width: '90vw',
            backgroundImage: isCalibratedRef.current ? `url(${interviewGuy.src})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 1
        }}>
            {showCameraAndMeetingButtons && (
                <>
                    <button className={styles.fancyButton}>Connect to Camera</button>
                    {/* <button className={styles.fancyButton}>Connect to Zoom/Google Meet</button> */}
                </>
            )}

            {!trackingStopped && (
                <button
                    className={styles.fancyButton}
                    onClick={startTracking}
                >
                    {isCalibratedRef.current ? "Calibrate Again" : "Just Practicing"}
                </button>
            )}

            {isCalibratedRef.current && !trackingStopped && (
                <button
                    className={styles.fancyButton}
                    onClick={stopTracking}
                >
                    Stop Tracking
                </button>
            )}

            {/* Gaze indicator element */}
            <div id="gaze" style={{
                position: 'absolute',
                display: isCalibratedRef.current && !trackingStopped ? 'block' : 'none',
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                border: 'solid 2px rgba(255, 255, 255, .2)',
                boxShadow: '0 0 100px 3px rgba(125, 125, 125, .5)',
                pointerEvents: 'none',
                zIndex: 999999
            }}></div>

            {/* Render gaze points */}
            {isCalibratedRef.current && gazePoints.map((point, index) => (
                <div key={index} style={{
                    position: 'absolute',
                    left: `${point.x - 6.5}px`,
                    top: `${point.y - 6.5}px`,
                    width: `${13 + point.duration * 2.6}px`,
                    height: `${13 + point.duration * 2.6}px`,
                    borderRadius: '50%',
                    backgroundColor: `rgba(255, 100, 100, ${Math.min(point.duration / 10, 0.6)})`,
                    pointerEvents: 'none',
                    zIndex: 998
                }} />
            ))}
        </div>
    );
};

export default GazeTrackingWidget;
