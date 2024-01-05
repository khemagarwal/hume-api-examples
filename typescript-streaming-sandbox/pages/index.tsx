import React from 'react';
import Link from 'next/link';
import {
  BookOpenText as BookIcon,
  Ear as EarIcon,
  Microphone as MicrophoneIcon,
  SmileySticker as SmileyIcon,
  Eye as GazeIcon // Assuming you're using an eye icon for Gaze Tracking
} from "@phosphor-icons/react";

export default function HomePage() {
  return (
      <div className="px-6 py-10 pb-20 sm:px-10 md:px-14">
        <div className="text-center md:text-left">
          <div className="pb-2 text-4xl font-medium text-neutral-700">Interview Interaction Insights </div>
          <div className="pt-5">Choose between visualizing your emotions through facial expressions and speech, or track your gaze during conversations.  </div>

          <div className="md:px-10 pt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
            <ModelSection name="Facial & Speech Expression" page="/face" iconClass={SmileyIcon} />
            <ModelSection name="Gaze Tracking" page="/gaze" iconClass={GazeIcon} />
          </div>
        </div>
      </div>
  );
}

type ModelSectionProps = {
  iconClass: any;
  name: string;
  page: string;
};

function ModelSection(props: ModelSectionProps) {
  return (
      <Link href={props.page} passHref>
        <div className="hover:border-neutral-400 hover:ease-linear duration-200 flex w-full justify-center items-center rounded-lg border border-neutral-200 bg-white px-14 py-12 shadow cursor-pointer">
          <props.iconClass size={40} />
          <div className="ml-6 text-xl">{props.name}</div>
        </div>
      </Link>
  );
}
