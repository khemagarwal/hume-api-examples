import React, { useEffect, useState, useRef } from 'react';
import styles from './GazeTrackingWidget.module.css';
import interviewGuy from './interview_guy.jpg';

type GazePoint = {
    x: number;
    y: number;
    duration: number;
};

declare global {
    interface Window {
        GazeCloudAPI: any;
    }
}

const GazeTrackingWidget = () => {
    const [gazePoints, setGazePoints] = useState<GazePoint[]>([]);
    const isCalibratedRef = useRef(false);
    const [showCameraAndMeetingButtons, setShowCameraAndMeetingButtons] = useState(true);
    const [trackingStopped, setTrackingStopped] = useState(false);

    useEffect(() => {
        const handleScriptError = (msg: string) => {
            console.error('Script error:', msg);
        };

        const processGaze = (GazeData: any) => {
            if (!isCalibratedRef.current || trackingStopped) return;

            const x = GazeData.docX;
            const y = GazeData.docY;

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

            const gaze = document.getElementById("gaze");
            if (gaze) {
                gaze.style.left = `${x}px`;
                gaze.style.top = `${y}px`;
                gaze.style.display = 'block';
            }
        };

        if (typeof window !== "undefined") {
            const script = document.createElement('script');
            script.src = 'https://api.gazerecorder.com/GazeCloudAPI.js';
            script.async = true;

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

            document.body.appendChild(script);
        }

        return () => {
            if (window.GazeCloudAPI) {
                window.GazeCloudAPI.StopEyeTracking();
            }
        };
    }, []);

    const startTracking = () => {
        window.GazeCloudAPI.StartEyeTracking();
        setTrackingStopped(false);
    };

    const stopTracking = () => {
        window.GazeCloudAPI.StopEyeTracking();
        setTrackingStopped(true);
    };

    return (
        <div style={{
            position: 'relative',
            height: '100vh',
            width: '100vw',
            backgroundImage: isCalibratedRef.current ? `url(${interviewGuy.src})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 1
        }}>
            {showCameraAndMeetingButtons && (
                <>
                    <button className={styles.fancyButton}>Connect to Camera</button>
                    <button className={styles.fancyButton}>Connect to Zoom/Google Meet</button>
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

            <div id="gaze" style={{
                position: 'absolute',
                display: isCalibratedRef.current && !trackingStopped ? 'block' : 'none', // Show gaze only when calibrated and tracking is ongoing
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                border: 'solid 2px rgba(255, 255, 255, .2)',
                boxShadow: '0 0 100px 3px rgba(125, 125, 125, .5)',
                pointerEvents: 'none',
                zIndex: 999999
            }}></div>

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
