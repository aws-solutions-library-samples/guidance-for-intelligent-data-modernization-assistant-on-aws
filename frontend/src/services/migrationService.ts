// services/migrationService
import { FormData, WavePlanningData, ApiResponse } from '../components/DatabaseMigration/types';

const API_URL = process.env.REACT_APP_API_URL;

// Format migration strategy text to have proper section breaks
export const formatMigrationStrategy = (strategy: string): string => {
  if (!strategy) return '';
  
  // Define the sections to look for
  const sections = [
    'SOURCE:', 
    'TARGET SERVICE AWS:', 
    'MIGRATION STRATEGY SUGGESTED:', 
    'KEY CONSIDERATIONS:', 
    'SUMMARY:', 
    'KEYWORDS:'
  ];
  
  let formattedStrategy = strategy;
  
  // Replace each section header with a formatted version
  sections.forEach(section => {
    formattedStrategy = formattedStrategy.replace(
      section, 
      `\n\n ${section}\n`
    );
  });
  
  // Handle links at the end
  const linkSectionIndex = formattedStrategy.lastIndexOf('[https://');
  if (linkSectionIndex !== -1) {
    const beforeLinks = formattedStrategy.substring(0, linkSectionIndex);
    const links = formattedStrategy.substring(linkSectionIndex);
    formattedStrategy = `${beforeLinks}\n\n## REFERENCES:\n${links}`;
  }
  
  return formattedStrategy;
};

export const generateMigrationStrategy = async (formData: FormData): Promise<ApiResponse> => {
  try {
    const input_data = formData.uploadedData || [{
      'Application/DB Name': formData.applicationName,
      'Description': formData.description,
      'Business Criticality': formData.businessCriticality,
      'COTS Software': formData.cotsSoftware,
      'Complexity Category': formData.complexityCategory,
      'Database Engine': formData.databaseEngine,
      'Disaster Recovery': formData.disasterRecovery,
      'Size of the DB(GB)': formData.dbSize,
      'Migration Considerations': formData.migrationConsiderations
    }];

    const response = await fetch(`${API_URL}/database-migration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input_data,
        config: {
          knowledge_base_id: process.env.REACT_APP_KNOWLEDGE_BASE_ID,
          model_arn: process.env.REACT_APP_MODEL_ARN,
          bucket_name: process.env.REACT_APP_S3_BUCKET,
          json_key: 'context_data.jsonl'
        },
        action: 'migration_strategy'
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate migration strategy: ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log('Raw Response Data:', responseData);
    const result: ApiResponse = JSON.parse(responseData.body);
    
    // Format the migration strategy text for better display
    if (result.migration_strategy) {
      result.migration_strategy = formatMigrationStrategy(result.migration_strategy);
    }
    
    console.log('Parsed Response Data:', result);
    return result;
  } catch (error) {
    console.error('Migration Strategy Error:', error);
    throw error;
  }
};

export const generateRunbook = async (migrationStrategy: string): Promise<ApiResponse> => {
  const response = await fetch(`${API_URL}/database-migration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input_data: { migrationStrategy},
      config: {
        knowledge_base_id: process.env.REACT_APP_KNOWLEDGE_BASE_ID,
        model_arn: process.env.REACT_APP_MODEL_ARN,
        bucket_name: process.env.REACT_APP_S3_BUCKET,
        json_key: 'context_data.jsonl'
      },
      action: 'runbook'
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate runbook');
  }

  const responseData = await response.json();
  console.log('Raw Response Data:', responseData);
  const result: ApiResponse = JSON.parse(responseData.body);
  console.log('Parsed Response Data:', result);
  return result;
};

export const generateIaC = async (
  migrationStrategy: string, 
  iacType: 'Terraform' | 'CloudFormation'
): Promise<ApiResponse> => {
  const response = await fetch(`${API_URL}/database-migration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input_data: { migrationStrategy, iacType },
      config: {
        knowledge_base_id: process.env.REACT_APP_KNOWLEDGE_BASE_ID,
        model_arn: process.env.REACT_APP_MODEL_ARN,
        bucket_name: process.env.REACT_APP_S3_BUCKET,
        json_key: 'context_data.jsonl'
      },
      action: 'iac'
    }),
  });

  
  if (!response.ok) {
    throw new Error('Failed to generate infrastructure as code');
  }
  const responseData = await response.json();
  console.log('Raw Response Data:', responseData);
  const result: ApiResponse = JSON.parse(responseData.body);
  console.log('Parsed Response Data:', result);
  return result;
};
