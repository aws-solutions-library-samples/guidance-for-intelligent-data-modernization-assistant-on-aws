import React, { useState } from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  Tabs,
  FormField,
  Input,
  Select,
  Textarea,
  Button,
  Box,
  Alert,
  Table,
  StatusIndicator,
  ColumnLayout
} from '@cloudscape-design/components';
import { t } from '../../utils/textUtils';

interface WavePlan {
    wave_number: number;
    db_count: number;
    start_week: number;
    end_week: number;
    effort_hours: number;
  }
  
interface CostEstimation {
    total_cost: number;
    hourly_rate: number;
    effort_hours: number;
  }

interface FormData {
  applicationName: string;
  description: string;
  businessCriticality: string;
  cotsPackage: string;
  databaseEngine: string;
  disasterRecovery: string;
  dbSize: string;
  migrationConsiderations: string;
}

interface ApiResponse {
  migration_strategy?: string;
  runbook?: string;
  iac_code?: string;
  retrieved_references?: Reference[];
  summarized_input?: string;
  wave_plan?: WavePlan[];
  total_effort?: number;
  person_days?: number;
  cost_estimation?: CostEstimation;
}

interface Reference {
  text: string;
  source: string;
}

interface WavePlan {
  wave_number: number;
  db_count: number;
  start_week: number;
  end_week: number;
  effort_hours: number;
}

interface CostEstimation {
  total_cost: number;
  hourly_rate: number;
  effort_hours: number;
}

const initialFormData: FormData = {
  applicationName: '',
  description: '',
  businessCriticality: '',
  cotsPackage: '',
  databaseEngine: '',
  disasterRecovery: 'No',
  dbSize: '0',
  migrationConsiderations: ''
};

const DatabaseMigration: React.FC = () => {
  const [activeTabId, setActiveTabId] = useState('userInput');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [iacType, setIacType] = useState<'Terraform' | 'CloudFormation'>('Terraform');
  const [wavePlanningData, setWavePlanningData] = useState<{
    db_type: string;
    category: string;
    rtype: string;
    db_count: number;
  }>({
    db_type: '',
    category: '',
    rtype: '',
    db_count: 1
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateMigrationStrategy = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/database-migration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input_data: [{
            'Application/DB Name': formData.applicationName,
            'Business Criticality': formData.businessCriticality,
            'COTS Software': formData.cotsPackage,
            'Database Engine': formData.databaseEngine,
            'Size of the DB(GB)': formData.dbSize,
            'Migration Considerations': formData.migrationConsiderations
          }],
          config: {
            knowledge_base_id: process.env.REACT_APP_KNOWLEDGE_BASE_ID,
            model_arn: process.env.REACT_APP_MODEL_ARN,
            bucket_name: process.env.REACT_APP_S3_BUCKET,
            json_key: 'context_data.jsonl'
          },
          action: 'migration_strategy'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate migration strategy: ${await response.text()}`);
      }

      const responseData = await response.json();
      const data = JSON.parse(responseData.body);
      console.log(data)
      setResult(data);
      setActiveTabId('strategyOutput');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const generateRunbook = async () => {
    if (!result?.migration_strategy) {
      setError('Please generate migration strategy first');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/database-migration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input_data: {
            migration_strategy: result.migration_strategy
          },
          config: {
            model_arn: process.env.REACT_APP_MODEL_ARN
          },
          action: 'runbook'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate runbook: ${await response.text()}`);
      }

      const data = await response.json();
      setResult(prev => ({ ...prev, ...data }));
      setActiveTabId('runbook');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const generateIaC = async () => {
    if (!result?.migration_strategy) {
      setError('Please generate migration strategy first');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/database-migration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input_data: {
            migration_strategy: result.migration_strategy,
            iac_type: iacType
          },
          config: {
            model_arn: process.env.REACT_APP_MODEL_ARN
          },
          action: 'iac'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate IAC: ${await response.text()}`);
      }

      const data = await response.json();
      setResult(prev => ({ ...prev, ...data }));
      setActiveTabId('iac');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWavePlanningInputChange = (field: keyof typeof wavePlanningData, value: string | number) => {
    setWavePlanningData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateWavePlan = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/database-migration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input_data: wavePlanningData,
          action: 'wave_planning'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate wave plan: ${await response.text()}`);
      }

      const data = await response.json();
      setResult(prev => ({ ...prev, ...data }));
      setActiveTabId('wavePlanning');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SpaceBetween size="l">
      <Container>
        <Header
          variant="h1"
          description="Generate database migration strategy, wave planning, runbook, and infrastructure as code"
        >
          {t('migration.labels.title')}
        </Header>

        {error && (
          <Alert type="error" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Tabs
          activeTabId={activeTabId}
          onChange={({ detail }) => setActiveTabId(detail.activeTabId)}
          tabs={[
            {
              id: 'userInput',
              label: 'User Input',
              content: (
                <SpaceBetween size="l">
                  <FormField label="Application/DB Name">
                    <Input
                      value={formData.applicationName}
                      onChange={({ detail }) => 
                        handleInputChange('applicationName', detail.value)
                      }
                    />
                  </FormField>

                  <FormField label="Description">
                    <Textarea
                      value={formData.description}
                      onChange={({ detail }) => 
                        handleInputChange('description', detail.value)
                      }
                      rows={3}
                    />
                  </FormField>

                  <FormField label="Business Criticality">
                    <Select
                      selectedOption={{ 
                        label: formData.businessCriticality || 'Select criticality',
                        value: formData.businessCriticality 
                      }}
                      onChange={({ detail }) => 
                        handleInputChange('businessCriticality', detail.selectedOption.value || '')
                      }
                      options={[
                        { label: 'High', value: 'High' },
                        { label: 'Medium', value: 'Medium' },
                        { label: 'Low', value: 'Low' }
                      ]}
                    />
                  </FormField>

                  <FormField label="COTS Package">
                    <Select
                      selectedOption={{ 
                        label: formData.cotsPackage || 'Select COTS package',
                        value: formData.cotsPackage 
                      }}
                      onChange={({ detail }) => 
                        handleInputChange('cotsPackage', detail.selectedOption.value || '')
                      }
                      options={[
                        { label: 'Oracle', value: 'Oracle' },
                        { label: 'SAP', value: 'SAP' },
                        { label: 'Microsoft', value: 'Microsoft' },
                        { label: 'Custom', value: 'Custom' },
                        { label: 'None', value: 'None' }
                      ]}
                    />
                  </FormField>

                  <FormField label="Database Engine">
                    <Select
                      selectedOption={{ 
                        label: formData.databaseEngine || 'Select database engine',
                        value: formData.databaseEngine 
                      }}
                      onChange={({ detail }) => 
                        handleInputChange('databaseEngine', detail.selectedOption.value || '')
                      }
                      options={[
                        { label: 'Oracle', value: 'Oracle' },
                        { label: 'SQL Server', value: 'SQL Server' },
                        { label: 'MySQL', value: 'MySQL' },
                        { label: 'PostgreSQL', value: 'PostgreSQL' },
                        { label: 'MongoDB', value: 'MongoDB' },
                        { label: 'DynamoDB', value: 'DynamoDB' },
                        { label: 'Other', value: 'Other' }
                      ]}
                    />
                  </FormField>

                  <FormField label="Disaster Recovery Required">
                    <Select
                      selectedOption={{ 
                        label: formData.disasterRecovery,
                        value: formData.disasterRecovery 
                      }}
                      onChange={({ detail }) => 
                        handleInputChange('disasterRecovery', detail.selectedOption.value || 'No')
                      }
                      options={[
                        { label: 'Yes', value: 'Yes' },
                        { label: 'No', value: 'No' }
                      ]}
                    />
                  </FormField>

                  <FormField label="Database Size (GB)">
                    <Input
                      type="number"
                      value={formData.dbSize}
                      onChange={({ detail }) => 
                        handleInputChange('dbSize', detail.value)
                      }
                    />
                  </FormField>

                  <FormField label="Migration Considerations">
                    <Textarea
                      value={formData.migrationConsiderations}
                      onChange={({ detail }) => 
                        handleInputChange('migrationConsiderations', detail.value)
                      }
                      rows={5}
                      placeholder="Enter any specific migration considerations, constraints, or requirements"
                    />
                  </FormField>

                  <Button 
                    variant="primary" 
                    onClick={generateMigrationStrategy}
                    loading={isLoading}
                  >
                    {t('migration.actions.generateStrategy')}
                  </Button>
                </SpaceBetween>
              )
            },
            {
              id: 'strategyOutput',
              label: 'Migration Strategy',
              content: (
                <SpaceBetween size="l">
                  {result?.migration_strategy ? (
                    <>
                      <Box>
                        <h3>{t('migration.labels.migrationStrategy')}</h3>
                        <div style={{ whiteSpace: 'pre-wrap' }}>
                          {result.migration_strategy}
                        </div>
                      </Box>
                      
                      {result.retrieved_references && result.retrieved_references.length > 0 && (
                        <Box>
                          <h3>{t('common.labels.references')}</h3>
                          <ul>
                            {result.retrieved_references.map((ref, index) => (
                              <li key={index}>
                                <div>{ref.text}</div>
                                <div><small>{t('migration.labels.source')}{ref.source}</small></div>
                              </li>
                            ))}
                          </ul>
                        </Box>
                      )}
                      
                      <SpaceBetween direction="horizontal" size="xs">
                        <Button onClick={generateRunbook}>{t('migration.actions.generateRunbook')}</Button>
                        <Button onClick={generateIaC}>{t('migration.actions.generateIaC')}</Button>
                      </SpaceBetween>
                    </>
                  ) : (
                    <Alert type="info">
                      {t('migration.messages.fillFormFirst')}
                    </Alert>
                  )}
                </SpaceBetween>
              )
            },
            {
              id: 'runbook',
              label: 'Runbook',
              content: (
                <SpaceBetween size="l">
                  {result?.runbook ? (
                    <Box>
                      <h3>{t('migration.labels.migrationRunbook')}</h3>
                      <div style={{ whiteSpace: 'pre-wrap' }}>
                        {result.runbook}
                      </div>
                    </Box>
                  ) : (
                    <Alert type="info">
                      {t('migration.messages.runbookRequired')}
                    </Alert>
                  )}
                </SpaceBetween>
              )
            },
            {
              id: 'iac',
              label: 'Infrastructure as Code',
              content: (
                <SpaceBetween size="l">
                  <FormField label="IaC Type">
                    <Select
                      selectedOption={{ 
                        label: iacType,
                        value: iacType 
                      }}
                      onChange={({ detail }) => 
                        setIacType(detail.selectedOption.value as 'Terraform' | 'CloudFormation')
                      }
                      options={[
                        { label: 'Terraform', value: 'Terraform' },
                        { label: 'CloudFormation', value: 'CloudFormation' }
                      ]}
                    />
                  </FormField>
                  
                  <Button 
                    onClick={generateIaC}
                    loading={isLoading}
                    disabled={!result?.migration_strategy}
                  >
                    {t('migration.actions.generateCode')} {iacType} {t('common.labels.code')}
                  </Button>
                  
                  {result?.iac_code ? (
                    <Box>
                      <h3>{iacType} Code</h3>
                      <pre style={{ 
                        backgroundColor: '#f5f5f5', 
                        padding: '15px', 
                        borderRadius: '4px',
                        overflowX: 'auto' 
                      }}>
                        {result.iac_code}
                      </pre>
                    </Box>
                  ) : (
                    <Alert type="info">
                      {t('migration.messages.generateIaCFirst')}
                    </Alert>
                  )}
                </SpaceBetween>
              )
            },
            {
              id: 'wavePlanning',
              label: 'Wave Planning',
              content: (
                <SpaceBetween size="l">
                  <ColumnLayout columns={2}>
                    <FormField label="Database Type">
                      <Select
                        selectedOption={{ 
                          label: wavePlanningData.db_type || 'Select database type',
                          value: wavePlanningData.db_type 
                        }}
                        onChange={({ detail }) => 
                          handleWavePlanningInputChange('db_type', detail.selectedOption.value || '')
                        }
                        options={[
                          { label: 'Oracle', value: 'Oracle' },
                          { label: 'SQL Server', value: 'SQL Server' },
                          { label: 'MySQL', value: 'MySQL' },
                          { label: 'PostgreSQL', value: 'PostgreSQL' },
                          { label: 'MongoDB', value: 'MongoDB' }
                        ]}
                      />
                    </FormField>
                    
                    <FormField label="Category">
                      <Select
                        selectedOption={{ 
                          label: wavePlanningData.category || 'Select category',
                          value: wavePlanningData.category 
                        }}
                        onChange={({ detail }) => 
                          handleWavePlanningInputChange('category', detail.selectedOption.value || '')
                        }
                        options={[
                          { label: 'Production', value: 'Production' },
                          { label: 'Development', value: 'Development' },
                          { label: 'Test', value: 'Test' }
                        ]}
                      />
                    </FormField>
                    
                    <FormField label="Resource Type">
                      <Select
                        selectedOption={{ 
                          label: wavePlanningData.rtype || 'Select resource type',
                          value: wavePlanningData.rtype 
                        }}
                        onChange={({ detail }) => 
                          handleWavePlanningInputChange('rtype', detail.selectedOption.value || '')
                        }
                        options={[
                          { label: 'RDS', value: 'RDS' },
                          { label: 'Aurora', value: 'Aurora' },
                          { label: 'DocumentDB', value: 'DocumentDB' },
                          { label: 'DynamoDB', value: 'DynamoDB' }
                        ]}
                      />
                    </FormField>
                    
                    <FormField label="Database Count">
                      <Input
                        type="number"
                        value={wavePlanningData.db_count.toString()}
                        onChange={({ detail }) => 
                          handleWavePlanningInputChange('db_count', parseInt(detail.value) || 1)
                        }
                      />
                    </FormField>
                  </ColumnLayout>
                  
                  <Button 
                    onClick={generateWavePlan}
                    loading={isLoading}
                  >
                    {t('migration.actions.generateWavePlan')}
                  </Button>
                  
                  {result?.wave_plan && result.wave_plan.length > 0 ? (
                    <>
                      <Box>
                        <h3>{t('migration.labels.wavePlan')}</h3>
                        <Table
                          columnDefinitions={[
                            {
                              id: 'wave_number',
                              header: 'Wave',
                              cell: item => `Wave ${item.wave_number}`
                            },
                            {
                              id: 'db_count',
                              header: 'DB Count',
                              cell: item => item.db_count
                            },
                            {
                              id: 'timeline',
                              header: 'Timeline',
                              cell: item => `Week ${item.start_week} - Week ${item.end_week}`
                            },
                            {
                              id: 'effort_hours',
                              header: 'Effort (Hours)',
                              cell: item => item.effort_hours
                            }
                          ]}
                          items={result.wave_plan}
                          loadingText="Loading wave plan"
                          trackBy="wave_number"
                          empty={
                            <Box textAlign="center" color="inherit">
                              <b>{t('migration.messages.noWavePlanData')}</b>
                              <Box padding={{ bottom: "s" }} variant="p" color="inherit">
                                {t('migration.messages.generateWavePlanFirst')}
                              </Box>
                            </Box>
                          }
                        />
                      </Box>
                      
                      {result.cost_estimation && (
                        <Box>
                          <h3>{t('migration.labels.costEstimation')}</h3>
                          <ColumnLayout columns={3}>
                            <div>
                              <h4>{t('migration.labels.totalEffort')}</h4>
                              <p>{result.total_effort} hours</p>
                            </div>
                            <div>
                              <h4>{t('migration.labels.personDays')}</h4>
                              <p>{result.person_days} days</p>
                            </div>
                            <div>
                              <h4>{t('migration.labels.estimatedCost')}</h4>
                              <p>${result.cost_estimation.total_cost.toLocaleString()}</p>
                              <small>(at ${result.cost_estimation.hourly_rate}/hour)</small>
                            </div>
                          </ColumnLayout>
                        </Box>
                      )}
                    </>
                  ) : (
                    <Alert type="info">
                      {t('migration.messages.generateWavePlanFirst')}
                    </Alert>
                  )}
                </SpaceBetween>
              )
            }
          ]}
        />
      </Container>
    </SpaceBetween>
  );
};

export default DatabaseMigration; 