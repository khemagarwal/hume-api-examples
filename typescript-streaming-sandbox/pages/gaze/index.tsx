import React from 'react';
import GazeTrackingWidget from '../../components/widgets/GazeTrackingWidget';

export default function GazePage() {
    return (
        <div className="px-6 pt-10 pb-20 sm:px-10 md:px-14">
            <div className="pb-6 text-2xl font-medium text-neutral-800">Gaze Tracking</div>
            <GazeTrackingWidget />
        </div>
    );
}
