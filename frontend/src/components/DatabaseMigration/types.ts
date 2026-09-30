// types.ts
export interface FormData {
    applicationName: string;
    description: string;
    businessCriticality: string;
    cotsSoftware: string;
    complexityCategory: string;
    databaseEngine: string;
    disasterRecovery: string;
    dbSize: string;
    migrationConsiderations: string;
    uploadedData?: Array<{
      "Application/DB Name": string;
      "Description": string;
      "Business Criticality": string;
      "COTS Software": string;
      "Complexity Category": string;
      "Database Engine": string;
      "Disaster Recovery": string;
      "Size of the DB(GB)": string;
      "Migration Considerations": string;
    }>;
}

export interface WaveFormData {
    duration: number;
    developers: number;
    developerCharge: number;
    showTimeline: boolean;
}

export type FormFieldKey = keyof FormData;

export interface WavePlan {
    wave_number: number;
    db_count: number;
    start_week: number;
    end_week: number;
    effort_hours: number;
}

export interface WaveJsonData {
    [key: string]: {
      [category: string]: {
        [rtype: string]: {
          RTYPE_HOURS: number;
        };
      };
    };
}

export interface WavePlanningData {
    db_type: string;
    category: string;
    rtype: string;
    db_count: number;
}

export interface PortfolioHours {
    SourceDB: string;
    Category: string;
    Rtype: string;
    Time_Per_DB_hours: number;
    Time_all_db: number;
    Time_all_db_discount: number;
    Time_all_db_person_days: number;
}

export interface WaveMetrics {
    total_effort: number;
    person_days: number;
    wave_plan: WavePlan[];
    total_cost: number;
    max_weeks: number;
    min_weeks: number;
}

export interface ApiResponse {
    migration_strategy?: string;
    runbook?: string;
    iac_code?: string;
    retrieved_references?: Array<{
        text: string;
        source?: string;
    }>;
    summarized_input?: string;
    wave_plan?: WavePlan[];
    total_effort?: number;
    person_days?: number;
    cost_estimation?: CostEstimation;
    wave_json?: WaveJsonData;
    portfolio_hours?: PortfolioHours[];
}

export interface CostEstimation {
    total_cost: number;
    hourly_rate: number;
    effort_hours: number;
}

export interface MigrationContext {
    isStrategyGenerated: boolean;
    result?: ApiResponse;
}

export interface SampleDataItem {
  'Application/DB Name*': string;
  'Description': string;
  'Business Criticality': string;
  'COTS Software': string;
  'Complexity Category(1 to 4)': number;
  'Database Engine': string;
  'Disaster Recovery (Y/N)': string;
  'Migration Considerations': string;
  'Size of the DB(GB)': number;
  'EOL License Expiration': string;
}