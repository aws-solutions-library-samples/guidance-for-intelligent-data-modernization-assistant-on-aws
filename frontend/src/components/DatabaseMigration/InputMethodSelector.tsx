import React from 'react';
import { SegmentedControl } from '@cloudscape-design/components';

interface InputMethodSelectorProps {
  selectedMethod: 'manual' | 'upload';
  onChange: (method: 'manual' | 'upload') => void;
}

const InputMethodSelector: React.FC<InputMethodSelectorProps> = ({ selectedMethod, onChange }) => {
  return (
    <SegmentedControl
      selectedId={selectedMethod}
      onChange={({ detail }) => onChange(detail.selectedId as 'manual' | 'upload')}
      label="Choose Input Method"
      options={[
        { text: 'Manual Entry', id: 'manual' },
        { text: 'Upload File', id: 'upload' },
      ]}
    />
  );
};

export default InputMethodSelector;