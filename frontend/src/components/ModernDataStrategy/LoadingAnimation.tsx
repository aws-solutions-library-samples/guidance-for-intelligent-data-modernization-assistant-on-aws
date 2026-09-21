import React from 'react';
import { useLottie } from 'lottie-react';
import animationData from '../../animations/animation_buffer2.json';

export const LoadingAnimation: React.FC = () => {
  const options = {
    animationData,
    loop: true,
    autoplay: true,
  };

  const { View } = useLottie(options);

  return (
    <div style={{ width: 200, height: 200, margin: '0 auto' }}>
      {View}
    </div>
  );
};
