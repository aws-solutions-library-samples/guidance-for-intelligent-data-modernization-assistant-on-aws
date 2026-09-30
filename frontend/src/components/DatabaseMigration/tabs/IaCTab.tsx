import React, { useState } from 'react';
import { t } from '../../../utils/textUtils';
import {
  SpaceBetween,
  Box,
  Select,
  Button,
  TextContent,
} from '@cloudscape-design/components';
import { useMigrationContext } from '../context/MigrationContext';
import { generateIaC } from '../../../services/migrationService';
import { ApiResponse } from '../types';
import { formatLLMResponse, convertLinksToAnchors } from '../../../utils/formatUtils';

interface IaCTabProps {
  onError: (error: string | null) => void;
}

const IaCTab: React.FC<IaCTabProps> = ({ onError }) => {
  const { result, setResult } = useMigrationContext();
  const [isLoading, setIsLoading] = useState(false);
  const [iacType, setIacType] = useState<'Terraform' | 'CloudFormation'>('Terraform');

  const handleGenerateIaC = async () => {
    if (!result?.migration_strategy) {
      onError("No migration strategy available to generate Infrastructure as Code");
      return;
    }

    try {
      setIsLoading(true);
      onError(null);
      const iacResult = await generateIaC(result.migration_strategy, iacType);
      setResult((prevResult: ApiResponse | null) => ({
        ...(prevResult || {}),
        iac_code: iacResult.iac_code
      } as ApiResponse));
    } catch (err) {
      onError(err instanceof Error ? err.message : 'An error occurred while generating Infrastructure as Code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SpaceBetween size="l">
      <Select
        selectedOption={{ label: iacType, value: iacType }}
        onChange={({ detail }) => 
          setIacType(detail.selectedOption.value as 'Terraform' | 'CloudFormation')
        }
        options={[
          { label: 'Terraform', value: 'Terraform' },
          { label: 'CloudFormation', value: 'CloudFormation' },
        ]}
      />

      <Button
        variant="primary"
        onClick={handleGenerateIaC}
        loading={isLoading}
        disabled={isLoading}
      >
        {t('migration.actions.generateIaC')}
      </Button>

      {result?.iac_code && (
        <TextContent>
          <h2>{t('migration.labels.infrastructureAsCode')}{iacType})</h2>
          <div 
            style={{ lineHeight: '1.5', fontSize: '14px' }}
            dangerouslySetInnerHTML={{ __html: formatLLMResponse(result.iac_code || '') }} 
          />
        </TextContent>
      )}
    </SpaceBetween>
  );
};

export default IaCTab;