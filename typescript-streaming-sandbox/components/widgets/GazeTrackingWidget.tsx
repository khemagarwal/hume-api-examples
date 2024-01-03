import React, { useEffect, useState, useRef } from 'react';
import styles from './GazeTrackingWidget.module.css';

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

    useEffect(() => {
        const handleScriptError = (msg: string) => {
            console.log(msg);
        };

        const processGaze = (GazeData: any) => {
            if (!isCalibratedRef.current) return;

            const x = GazeData.docX;
            const y = GazeData.docY;
            const newPoint: GazePoint = { x, y, duration: 1 };

            // Update the gaze indicator position
            const gaze = document.getElementById("gaze");
            if (gaze) {
                gaze.style.left = `${x - gaze.clientWidth / 2}px`;
                gaze.style.top = `${y - gaze.clientHeight / 2}px`;
                gaze.style.display = 'block'; // Make the gaze indicator visible
            }

            // Update the heatmap points
            setGazePoints(prevPoints => {
                let lastPoint = prevPoints[prevPoints.length - 1];
                if (lastPoint && Math.abs(lastPoint.x - x) < 50 && Math.abs(lastPoint.y - y) < 50) {
                    lastPoint = { ...lastPoint, duration: lastPoint.duration + 1 };
                    return [...prevPoints.slice(0, -1), lastPoint];
                } else {
                    return [...prevPoints, newPoint];
                }
            });
        };

        if (typeof window !== "undefined") {
            const script = document.createElement('script');
            script.src = 'https://api.gazerecorder.com/GazeCloudAPI.js';
            script.async = true;

            script.onload = () => {
                window.GazeCloudAPI.OnCalibrationComplete = () => {
                    console.log('Gaze Calibration Complete');
                    isCalibratedRef.current = true;
                };
                window.GazeCloudAPI.OnCamDenied = () => console.log('Camera access denied');
                window.GazeCloudAPI.OnError = (msg: any) => console.log('Error: ' + msg);
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

    return (
        <div>
            <button className={styles.fancyButton} onClick={() => window.GazeCloudAPI.StartEyeTracking()}>Calibrate</button>
            <button className={styles.fancyButton} onClick={() => window.GazeCloudAPI.StopEyeTracking()}>Stop Tracking</button>
            <div id="gaze" style={{
                position: 'absolute',
                display: 'none',
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
