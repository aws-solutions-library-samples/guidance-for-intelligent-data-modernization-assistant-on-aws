// WavePlanningTab.tsx
import React, { useState, useEffect } from 'react';
import { t } from '../../../utils/textUtils';
import {
  Container,
  Header,
  SpaceBetween,
  FormField,
  Select,
  Input,
  Box,
  ColumnLayout,
  RadioGroup,
  Tabs,
  Table,
  Toggle
} from '@cloudscape-design/components';
import { useMigrationContext } from '../context/MigrationContext';
import Chart from 'react-apexcharts';
import { 
  WaveJsonData, 
  WavePlan, 
  PortfolioHours, 
  WaveMetrics,
  WavePlanningData,
  WaveFormData,
  MigrationContext
} from '../types';

const PERSON_DAY_HOURS = 8;
const WEEKS_PER_MONTH = 4;
const MAX_DEVELOPER = 50;
const MAX_DB_SERVER = 50;
const PER_WEEK_EFFORT = 40;

interface WavePlanningTabProps {
  onError: (error: string | null) => void;
}

const WavePlanningTab: React.FC<WavePlanningTabProps> = ({ onError }) => {
  const { isStrategyGenerated, result } = useMigrationContext() as MigrationContext;
  const [activeSubTabId, setActiveSubTabId] = useState('wave');
  const [wavePlanningData, setWavePlanningData] = useState<WavePlanningData>({
    db_type: '',
    category: '',
    rtype: '',
    db_count: 1
  });

  const [formData, setFormData] = useState<WaveFormData>({
    duration: 3,
    developers: 6,
    developerCharge: 138.0,
    showTimeline: false
  });

  const [waveMetrics, setWaveMetrics] = useState<WaveMetrics | null>(null);
  const [portfolioHours, setPortfolioHours] = useState<PortfolioHours[]>([]);
  const waveJsonData = result?.wave_json;

  useEffect(() => {
    if (waveJsonData && wavePlanningData.db_type && wavePlanningData.category && wavePlanningData.rtype) {
      const baseEffort = waveJsonData[wavePlanningData.db_type]?.[wavePlanningData.category]?.[wavePlanningData.rtype]?.RTYPE_HOURS;
      
      if (baseEffort) {
        const metrics = calculateMetrics(baseEffort);
        setWaveMetrics(metrics);
        
        const portfolioHour: PortfolioHours = {
          SourceDB: wavePlanningData.db_type,
          Category: wavePlanningData.category,
          Rtype: wavePlanningData.rtype,
          Time_Per_DB_hours: baseEffort,
          Time_all_db: baseEffort * wavePlanningData.db_count,
          Time_all_db_discount: metrics.total_effort,
          Time_all_db_person_days: metrics.person_days
        };
        setPortfolioHours([portfolioHour]);
      }
    }
  }, [wavePlanningData, formData, waveJsonData]);

  if (!isStrategyGenerated) {
    return (
      <Container>
        <Box textAlign="center" margin={{ top: 'xxxl' }}>
          <SpaceBetween size="m">
            <Box variant="h2">
              {t('migration.messages.generateStrategyFirst')}
            </Box>
            <Box variant="p">
              {t('migration.messages.wavePlanningAvailable')}
            </Box>
          </SpaceBetween>
        </Box>
      </Container>
    );
  }

  const calculateDiscountedHours = (totalEffort: number, dbCount: number): number => {
    if (dbCount <= 5) {
      return totalEffort * dbCount;
    }
    const baseEffort = totalEffort * 5;
    const discountedEffort = (totalEffort * 0.7) * (dbCount - 5);
    return Math.round(baseEffort + discountedEffort);
  };

  const calculateWavePlan = (totalEffort: number, duration: number, developers: number): WavePlan[] => {
    const totalWeeks = duration * WEEKS_PER_MONTH;
    // Maximum effort per week for all developers combined
    const maxWeeklyEffort = developers * PER_WEEK_EFFORT;
    const wavePlan: WavePlan[] = [];
    let remainingEffort = totalEffort;
    let currentWeek = 0;

    // Continue until all effort is allocated
    while (remainingEffort > 0) {
      // Each week, allocate up to the maximum weekly effort
      const weekEffort = Math.min(maxWeeklyEffort, remainingEffort);
      // Calculate effort per developer (capped at PER_WEEK_EFFORT)
      const effortPerDeveloper = Math.min(weekEffort / developers, PER_WEEK_EFFORT);
      
      wavePlan.push({
        wave_number: currentWeek + 1,
        db_count: Math.ceil(wavePlanningData.db_count / totalWeeks),
        start_week: currentWeek,
        end_week: currentWeek + 1,
        effort_hours: effortPerDeveloper
      });
      
      remainingEffort -= weekEffort;
      currentWeek++;
    }

    // If we need more weeks than planned, fill the rest with zeros to maintain chart width
    if (currentWeek < totalWeeks) {
      for (let i = currentWeek; i < totalWeeks; i++) {
        wavePlan.push({
          wave_number: i + 1,
          db_count: 0,
          start_week: i,
          end_week: i + 1,
          effort_hours: 0
        });
      }
    }

    return wavePlan;
  }

  // const calculateWavePlan = (totalEffort: number, duration: number, developers: number): WavePlan[] => {
  //   const totalWeeks = duration * WEEKS_PER_MONTH;
  //   // Calculate effort per week per developer
  //   const effortPerWeekPerDeveloper = totalEffort / totalWeeks / developers;
  //   const wavePlan: WavePlan[] = [];
  //   let remainingEffort = totalEffort;
  //   let currentWeek = 0;

  //   while (remainingEffort > 0 && currentWeek < totalWeeks) {
  //     // Each developer contributes effort each week
  //     const weekEffort = Math.min(effortPerWeekPerDeveloper * developers, remainingEffort);
  //     wavePlan.push({
  //       wave_number: currentWeek + 1,
  //       db_count: Math.ceil(wavePlanningData.db_count / totalWeeks),
  //       start_week: currentWeek,
  //       end_week: currentWeek + 1,
  //       // This is the effort per developer
  //       effort_hours: weekEffort / developers
  //     });
  //     remainingEffort -= weekEffort;
  //     currentWeek++;
  //   }

  //   return wavePlan;
  // };

  const calculateMetrics = (effort: number): WaveMetrics => {
    const totalEffort = calculateDiscountedHours(effort, wavePlanningData.db_count);
    const personDays = Math.ceil(totalEffort / PERSON_DAY_HOURS);
    const wavePlan = calculateWavePlan(totalEffort, formData.duration, formData.developers);
    
    const totalWeeks = Math.ceil(totalEffort / PER_WEEK_EFFORT);
    const maxWeeks = Math.ceil(totalWeeks / formData.developers);
    const minWeeks = Math.ceil(totalWeeks / (formData.developers + 10));

    return {
      total_effort: totalEffort,
      person_days: personDays,
      wave_plan: wavePlan,
      total_cost: totalEffort * formData.developerCharge,
      max_weeks: maxWeeks,
      min_weeks: minWeeks
    };
  };

  const handleInputChange = (field: keyof WavePlanningData, value: any) => {
    setWavePlanningData(prev => ({ ...prev, [field]: value }));
  };

  const renderWaveTimeline = () => {
  if (!waveMetrics?.wave_plan) return null;

  // Create series data for each developer
  const series = [];
  for (let i = 0; i < formData.developers; i++) {
    series.push({
      name: `Developer ${i + 1}`,
      data: waveMetrics.wave_plan.map(wave => {
        // If this is the last developer and there's remaining effort less than PER_WEEK_EFFORT
        if (i === formData.developers - 1 && wave.effort_hours * formData.developers % PER_WEEK_EFFORT !== 0) {
          return wave.effort_hours * formData.developers % PER_WEEK_EFFORT;
        }
        // For all other developers, show their full allocation (up to PER_WEEK_EFFORT)
        return wave.effort_hours > 0 ? PER_WEEK_EFFORT : 0;
      })
    });
  }

  const chartOptions = {
    chart: {
      type: 'bar' as const,
      height: 350,
      stacked: true
    },
    xaxis: {
      categories: waveMetrics.wave_plan.map(wave => `Wave ${wave.wave_number}`)
    },
    plotOptions: {
      bar: {
        horizontal: false
      }
    },
    dataLabels: {
      enabled: false
    },
    legend: {
      position: 'top' as const
    },
    tooltip: {
      y: {
        formatter: (val: number) => `${val} hours`
      }
    }
  };

  return (
    <Box padding="l">
      <Chart
        options={chartOptions}
        series={series}
        type="bar"
        height={350}
      />
    </Box>
  );
};


  const renderWaveTab = () => (
    <SpaceBetween size="l">
      {waveMetrics && (
        <Header variant="h2">
          {t('migration.labels.effort')}{waveMetrics.person_days} Person-Days ({waveMetrics.total_effort} hours)
        </Header>
      )}

      <ColumnLayout columns={4}>
        <FormField label="Source Database Server">
          <Select
            selectedOption={{ label: wavePlanningData.db_type, value: wavePlanningData.db_type }}
            onChange={({ detail }) => handleInputChange('db_type', detail.selectedOption.value)}
            options={waveJsonData ? Object.keys(waveJsonData).map(key => ({ label: key, value: key })) : []}
          />
        </FormField>

        <FormField label="Category">
          <Select
            selectedOption={{ label: wavePlanningData.category, value: wavePlanningData.category }}
            onChange={({ detail }) => handleInputChange('category', detail.selectedOption.value)}
            options={
              wavePlanningData.db_type && waveJsonData
                ? Object.keys(waveJsonData[wavePlanningData.db_type] || {}).map(key => ({ label: key, value: key }))
                : []
            }
          />
        </FormField>

        <FormField label="Migration Type">
          <Select
            selectedOption={{ label: wavePlanningData.rtype, value: wavePlanningData.rtype }}
            onChange={({ detail }) => handleInputChange('rtype', detail.selectedOption.value)}
            options={
              wavePlanningData.db_type && wavePlanningData.category && waveJsonData
                ? Object.keys(waveJsonData[wavePlanningData.db_type]?.[wavePlanningData.category] || {}).map(key => ({
                    label: key,
                    value: key
                  }))
                : []
            }
          />
        </FormField>

        <FormField label="Number of Databases">
          <Input
            type="number"
            value={wavePlanningData.db_count.toString()}
            onChange={({ detail }) => handleInputChange('db_count', parseInt(detail.value) || 1)}
          />
        </FormField>
      </ColumnLayout>

      <ColumnLayout columns={3}>
        <FormField label="Duration (months)">
          <RadioGroup
            value={formData.duration.toString()}
            items={[
              { value: "3", label: "3" },
              { value: "6", label: "6" },
              { value: "12", label: "12" }
            ]}
            onChange={({ detail }) => setFormData(prev => ({ ...prev, duration: parseInt(detail.value) }))}
          />
        </FormField>

        <FormField label="Number of Developers">
          <Input
            type="number"
            value={formData.developers.toString()}
            onChange={({ detail }) => setFormData(prev => ({ ...prev, developers: parseInt(detail.value) || 1 }))}
          />
        </FormField>

        <FormField label="Developer Rate ($/hour)">
          <Input
            type="number"
            value={formData.developerCharge.toString()}
            onChange={({ detail }) => setFormData(prev => ({ ...prev, developerCharge: parseFloat(detail.value) || 0 }))}
          />
        </FormField>
      </ColumnLayout>

      {waveMetrics && (
        <ColumnLayout columns={3}>
          <Box>{t('migration.labels.totalEffortsMax')}{waveMetrics.max_weeks} Min: {waveMetrics.min_weeks}</Box>
          <Box>{t('migration.labels.costHourlyMax')}{(formData.developers + 10) * formData.developerCharge} Min: ${formData.developers * formData.developerCharge}</Box>
          <Box>{t('migration.labels.totalCost')}{waveMetrics.total_cost.toFixed(2)}</Box>
        </ColumnLayout>
      )}

      <Toggle
        onChange={({ detail }) => setFormData(prev => ({ ...prev, showTimeline: detail.checked }))}
        checked={formData.showTimeline}
      >
        {t('migration.actions.showTimeline')}
      </Toggle>

      {formData.showTimeline && renderWaveTimeline()}
    </SpaceBetween>
  );

  const renderWaveFullTab = () => (
    <Table
      columnDefinitions={[
        { header: "Source DB", cell: item => item.SourceDB },
        { header: "Category", cell: item => item.Category },
        { header: "Migration Type", cell: item => item.Rtype },
        { header: "Time Per DB (hrs)", cell: item => item.Time_Per_DB_hours },
        { header: "Total Time (hrs)", cell: item => item.Time_all_db },
        { header: "Discounted Time (hrs)", cell: item => item.Time_all_db_discount },
        { header: "{t('migration.labels.personDays')}", cell: item => item.Time_all_db_person_days }
      ]}
      items={portfolioHours}
      loadingText="Loading wave planning data..."
      empty={
        <Box textAlign="center" color="inherit">
          <b>{t('common.messages.noDataAvailable')}</b>
          <Box padding="s">{t('migration.messages.selectDatabaseParams')}</Box>
        </Box>
      }
    />
  );

  return (
    <Container>
      <SpaceBetween size="l">
        <Header variant="h1">{t('migration.headers.wavePlanning')}</Header>
        <Tabs
          activeTabId={activeSubTabId}
          onChange={({ detail }) => setActiveSubTabId(detail.activeTabId)}
          tabs={[
            {
              id: "wave",
              label: "Wave",
              content: renderWaveTab()
            },
            {
              id: "wave-full",
              label: "Wave-Full",
              content: renderWaveFullTab()
            }
          ]}
        />
      </SpaceBetween>
    </Container>
  );
};

export default WavePlanningTab;
