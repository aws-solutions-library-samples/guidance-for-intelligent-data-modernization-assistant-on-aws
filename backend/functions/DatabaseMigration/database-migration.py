import json
import boto3
import re
import logging
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import math
from datetime import datetime, date

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
bedrock_runtime = boto3.client('bedrock-runtime')
bedrock_kb = boto3.client('bedrock-agent-runtime')
s3_client = boto3.client('s3')

# Constants from your Streamlit code
WAVE_JSON = {
    "DB2": {
        "Category-1": {
            "REHOST": {"RTYPE_HOURS": 80}
        },
        "Category-2": {
            "REFACTOR": {"RTYPE_HOURS": 360}
        }
    },
    "MS-SQL Server": {
        "Category-1": {
            "REHOST": {"RTYPE_HOURS": 80}
        },
        "Category-2": {
            "REFACTOR": {"RTYPE_HOURS": 360}
        }
    },
    "MySQL": {
        "Category-1": {
            "REHOST": {"RTYPE_HOURS": 80}
        },
        "Category-2": {
            "REFACTOR": {"RTYPE_HOURS": 56}
        }
    },
    "Oracle": {
        "Category-1": {
            "REHOST": {"RTYPE_HOURS": 80},
            "REPLATFORM": {"RTYPE_HOURS": 128}
        },
        "Category-2": {
            "REHOST": {"RTYPE_HOURS": 96},
            "REFACTOR": {"RTYPE_HOURS": 360}
        },
        "Category-3": {
            "REHOST": {"RTYPE_HOURS": 112},
            "REPLATFORM": {"RTYPE_HOURS": 192},
            "REFACTOR": {"RTYPE_HOURS": 2304}
        }
    }
}

def extract_database_types(text):
    """Extract source and target database types from user input"""
    db_types = ['db2','oracle', 'mysql', 'postgresql', 'postgres', 'sql server', 'mongodb', 'mariadb', 'sqlite', 'cassandra', 'dynamodb', 'redshift']
    
    text_lower = text.lower()
    found_dbs = []
    
    for db in db_types:
        if db in text_lower:
            found_dbs.append(db.title() if db != 'postgresql' else 'PostgreSQL')
    
    # Default fallback
    if len(found_dbs) >= 2:
        return found_dbs[0], found_dbs[1]
    elif len(found_dbs) == 1:
        return found_dbs[0], 'PostgreSQL'  # Default target
    else:
        return 'Oracle', 'PostgreSQL'  # Default migration

def handle_wave_planning(input_data):
    """Handle wave planning calculations"""
    try:
        db_type = input_data.get('db_type')
        db_category = input_data.get('category')
        db_rtype = input_data.get('rtype')
        db_count = input_data.get('db_count', 1)
        
        # Get hours from WAVE_JSON
        if db_type in WAVE_JSON and db_category in WAVE_JSON[db_type]:
            if db_rtype in WAVE_JSON[db_type][db_category]:
                total_effort = WAVE_JSON[db_type][db_category][db_rtype]["RTYPE_HOURS"]
                total_effort = calculate_discounted_hours(total_effort, db_count)
                
                wave_plan = calculate_wave_plan(total_effort, db_count)
                return {
                    'total_effort': total_effort,
                    'wave_plan': wave_plan,
                    'person_days': calculate_person_days(total_effort),
                    'cost_estimation': calculate_cost_estimation(total_effort)
                }
            else:
                raise ValueError(f"Invalid R-Type: {db_rtype}")
        else:
            raise ValueError(f"Invalid database type or category")
    except Exception as e:
        logger.warning(f"Wave planning failed: {e}")
        raise

def calculate_discounted_hours(total_effort, db_count):
    """Calculate discounted hours for multiple databases"""
    if db_count <= 5:
        return total_effort * db_count
    
    # Apply 30% discount for databases beyond 5
    base_effort = total_effort * 5
    discounted_effort = (total_effort * 0.7) * (db_count - 5)
    return base_effort + discounted_effort

def calculate_wave_plan(total_effort, db_count):
    """Calculate wave plan based on effort and count"""
    HOURS_PER_DAY = 8
    DAYS_PER_WEEK = 5
    WEEKS_PER_MONTH = 4
    
    total_weeks = math.ceil(total_effort / (HOURS_PER_DAY * DAYS_PER_WEEK))
    
    waves = []
    remaining_dbs = db_count
    current_week = 0
    
    while remaining_dbs > 0:
        wave_size = min(remaining_dbs, math.ceil(db_count * 0.2))  # 20% per wave
        wave_weeks = math.ceil(total_weeks * (wave_size / db_count))
        
        waves.append({
            'wave_number': len(waves) + 1,
            'db_count': wave_size,
            'start_week': current_week,
            'end_week': current_week + wave_weeks,
            'effort_hours': (total_effort * wave_size) / db_count
        })
        
        current_week += wave_weeks
        remaining_dbs -= wave_size
    
    return waves

def calculate_person_days(total_effort, hours_per_day=8):
    """Calculate person days from total effort hours"""
    return math.ceil(total_effort / hours_per_day)

def calculate_cost_estimation(total_effort, hourly_rate=138):
    """Calculate cost estimation"""
    return {
        'total_cost': total_effort * hourly_rate,
        'hourly_rate': hourly_rate,
        'effort_hours': total_effort
    }

def extract_target_services(text):
    """Extract AWS services mentioned in text"""
    aws_services = [
        "Amazon RDS for SQL Server",
        "Amazon EC2",
        "AWS DMS",
        "AWS Database Migration Service",
        "Amazon S3",
        "Amazon DynamoDB",
        "Amazon Redshift",
        "Amazon Aurora",
        "Amazon VPC",
        "Amazon CloudFront",
        "AWS Lambda",
        "Amazon SQS",
        "Amazon SNS",
        "AWS Glue"
    ]
    
    found_services = []
    for service in aws_services:
        if re.search(re.escape(service), text, re.IGNORECASE):
            found_services.append(service)
    
    return found_services

def extract_references(retrieved_references):
    """Extract text content from retrieved references"""
    reference_texts = []
    if retrieved_references:
        for citation in retrieved_references:
            for ref in citation.get('retrievedReferences', []):
                    reference_texts.append({
                        'text': ref['content']['text'],
                    })
    return reference_texts

def save_to_s3(bucket_name, key, data):
    """Save data to S3"""
    try:
        s3_client.put_object(
            Bucket=bucket_name,
            Key=key,
            Body=json.dumps(data),
            ContentType='application/json'
        )
        logger.info(f"Successfully saved data to s3://{bucket_name}/{key}")
        return True
    except Exception as e:
        logger.warning(f"Failed to save to S3: {e}")
        return False

def handle_aws_errors(func):
    """Decorator for handling AWS service errors"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except boto3.exceptions.Boto3Error as e:
            logger.error(f"AWS Service Error in {func.__name__}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}: {str(e)}")
            raise
    return wrapper

def load_data_from_s3(bucket_name, json_key):
    """Load data from S3"""
    try:
        logger.info(f"Loading data from bucket: {bucket_name}, key: {json_key}")
        obj = s3_client.get_object(Bucket=bucket_name, Key=json_key)
        data = obj['Body'].read().decode('utf-8').strip().split('\n')
        jsonl_data = [json.loads(line) for line in data]
        return jsonl_data
    except Exception as e:
        logger.warning(f"Failed to load data from S3: {e}")
        raise

def find_relevant_scenarios(input_text, scenarios, top_n=3):
    """Find relevant scenarios using TF-IDF and cosine similarity"""
    try:
        documents = [input_text] + [scenario["input"] for scenario in scenarios]
        vectorizer = TfidfVectorizer().fit_transform(documents)
        vectors = vectorizer.toarray()
        cosine_matrix = cosine_similarity(vectors)
        similar_indices = cosine_matrix[0].argsort()[::-1][1:top_n+1]
        relevant_scenarios = [scenarios[i-1] for i in similar_indices]
        return relevant_scenarios
    except Exception as e:
        logger.warning(f"Failed to find relevant scenarios: {e}")
        raise

def retrieve_and_generate_from_knowledge_base(user_prompt, knowledge_base_id, model_arn):
    """Get response from knowledge base"""
    try:
        response = bedrock_kb.retrieve_and_generate(
            input={'text': user_prompt},
            retrieveAndGenerateConfiguration={
                'type': 'KNOWLEDGE_BASE',
                'knowledgeBaseConfiguration': {
                    'knowledgeBaseId': knowledge_base_id,
                    'modelArn': model_arn,
                    'generationConfiguration': {
                        'promptTemplate': {
                            'textPromptTemplate': 'Based on the following search results, provide a comprehensive answer to the user query.\n\nSearch results:\n$search_results$\n\nUser query: $query$\n\n$output_format_instructions$'
                        }
                    },
                    'orchestrationConfiguration': {
                        'promptTemplate': {
                        'textPromptTemplate': 'Rewrite the following query to optimize it for semantic search. Return only the rewritten query.\n\nConversation history:\n$conversation_history$\n\nQuery: $query$\n\n$output_format_instructions$'
                        }
                    }
                }
            }
        )
        logger.info(f"Knowledge base response received")
        return response
    except Exception as e:
        logger.warning(f"Failed to retrieve from knowledge base: {e}")
        raise

def generate_conversation(model_id, system_prompts, messages):
    """Generate conversation using bedrock converse"""
    try:
        if isinstance(system_prompts, str):
            system_prompts = [{"text": system_prompts}]
        
        inference_config = {"topP": 0.9, "temperature": 0.2}
        additional_model_fields = {"inferenceConfig": {"topK": 120}}
        
        response = bedrock_runtime.converse(
            modelId="amazon.nova-pro-v1:0",
            messages=messages,
            system=system_prompts,
            inferenceConfig=inference_config,
            additionalModelRequestFields=additional_model_fields
        )
        
        return response
    except Exception as e:
        logger.warning(f"Failed to generate conversation: {e}")
        raise

def summarize_input(input_data):
    """Create summary from input data"""
    summarized_inputs = []
    for input_row in input_data:
        if input_row is not None:
            if isinstance(input_row, dict):
                summary = (
                    f"Application/DB Name: {input_row.get('Application/DB Name', '')}, "
                    f"Business Criticality: {input_row.get('Business Criticality', '')}, "
                    f"COTS Software: {input_row.get('COTS Software', '')}, "
                    f"Database Engine: {input_row.get('Database Engine', '')}, "
                    f"Size of the DB(GB): {input_row.get('Size of the DB(GB)', '')}"
                )
            else:
                summary = f"Input: {input_row}"
            summarized_inputs.append(summary)
    
    summarized_text = "\n".join(summarized_inputs)
    return summarized_text[:1000] if len(summarized_text) > 1000 else summarized_text

def create_migration_strategy_prompt(source_db, target_db):
    """Create parameterized migration strategy prompt"""
    return f"""You are an expert database migration consultant with 15+ years of experience in enterprise {source_db} to {target_db} migrations. Create a comprehensive, enterprise-grade {source_db} to {target_db} migration strategy that includes all critical components for a successful large-scale database migration.

**Required Components:**

**1. Executive Summary and Strategy Overview:**
- Migration approach selection with justification
- Risk assessment and mitigation strategy
- Timeline overview with key milestones
- Resource requirements and team structure
- Success criteria and KPIs

**2. Detailed Phase-by-Phase Implementation:**
Create 5 distinct phases with detailed runbooks:
- Phase 1: Assessment & Infrastructure Planning (Weeks 1-4)
- Phase 2: Schema Conversion (Weeks 5-8)
- Phase 3: Data Migration Setup (Weeks 9-12)
- Phase 4: Application Migration (Weeks 13-16)
- Phase 5: Production Migration (Weeks 17-20)

**3. Comprehensive Runbooks for Each Phase:**
For each phase, provide:
- Week-by-week breakdown with specific objectives
- Day-by-day execution plans with tasks and deliverables
- Pre-requisites checklists and validation steps
- Team assignments and resource requirements
- Specific commands, queries, and configuration examples
- Troubleshooting guides and error handling procedures
- Success criteria and validation checkpoints

**4. Complete Infrastructure as Code Templates:**
Provide production-ready CloudFormation templates for:
- VPC and networking infrastructure (3-AZ setup)
- {target_db} RDS with high availability and security
- DMS infrastructure with replication instances
- Security groups, IAM roles, and KMS encryption
- Monitoring, logging, and alerting systems

**5. Comprehensive Considerations and Limitations:**
- Technical considerations (data types, performance, features)
- Business considerations (cost, timeline, resources)
- Operational considerations (training, processes, tools)
- Major limitations and constraints
- Risk factors and mitigation strategies

**6. Robust Failback Strategy:**
- Failback triggers and decision criteria
- Bidirectional replication setup and management
- Emergency failback procedures (0-4 hours)
- Planned failback procedures (4-24 hours)
- Data consistency validation during failback

**7. Practical Implementation Details:**
- Specific {source_db} to {target_db} conversion examples
- DMS configuration with optimized settings
- Application code conversion examples
- SQL query conversion patterns
- Performance tuning recommendations
- Testing and validation frameworks

**Technical Specifications:**
- Support for enterprise-scale databases (10TB+)
- Multi-AZ deployment with high availability
- Security best practices and compliance
- Automated deployment and configuration
- Comprehensive monitoring and alerting
- Performance optimization and tuning

**Output Format Requirements:**
- Professional documentation structure
- Executable code examples and configurations
- Step-by-step procedures with validation steps
- Troubleshooting guides and error handling
- Complete Infrastructure as Code templates
- Realistic timelines and resource estimates
- Risk assessment matrices and mitigation plans

**Specific Focus Areas:**
- Minimize downtime (target <4 hours for critical systems)
- Ensure zero data loss during migration
- Maintain application functionality throughout
- Provide comprehensive rollback capabilities
- Include automated testing and validation
- Address {source_db}-specific feature conversions
- Handle large-scale data migration challenges

## Key Prompt Elements That Drive Comprehensive Output:
### 1. Scope and Scale Definition
• Enterprise-grade requirements
• Large-scale database specifications (10TB+)
• Production-ready implementation focus
• Complete end-to-end coverage
### 2. Structured Deliverable Requirements
• 5 distinct phases with detailed breakdowns
• Week-by-week and day-by-day execution plans
• Complete Infrastructure as Code templates
• Comprehensive runbooks and procedures
### 3. Technical Depth Specifications
• Specific {source_db} to {target_db} conversion examples
• DMS configuration with optimization
• Application code conversion patterns
• Performance tuning recommendations
### 4. Practical Implementation Focus
• Executable code examples and configurations
• Step-by-step procedures with validation
• Troubleshooting guides and error handling
• Realistic timelines and resource estimates
### 5. Risk Mitigation and Failback
• Comprehensive failback strategy
• Bidirectional replication management
• Emergency and planned rollback procedures
• Data consistency validation methods
### 6. Output Format Specifications
• Professional documentation structure
• Production-ready CloudFormation templates
• Complete implementation guide format
• Actionable, implementable recommendations

**Output Format:** Professional enterprise documentation with detailed week-by-week phases, comprehensive failback procedures, and actionable insights for executive stakeholders and technical teams."""

def handle_migration_strategy(summarized_text, relevant_scenarios, kb_context, retrieved_references, model_arn):
    """Handle migration strategy generation"""
    try:
        # Extract database types from summarized input
        source_db, target_db = extract_database_types(summarized_text)
        
        # Create parameterized system prompt
        system_prompt = create_migration_strategy_prompt(source_db, target_db)
        for scenario in relevant_scenarios:
            system_prompt += f"\n***Relevant Scenario:***\n{scenario['input']}\n{scenario['output']}\n"
        # system_prompt += f"\n***Knowledge Base Context:***\n{kb_context}\n"  # Commented out as requested
        
        user_message = {"role": "user", "content": [{"text": summarized_text}]}
        messages = [user_message]
        response = generate_conversation(
            'anthropic.claude-3-sonnet-20240229-v1:0',
            [{"text": system_prompt}],
            ensure_alternating_roles(messages)
        )
        logger.info("Response %s",response)
        return {
            'migration_strategy': response['output']['message']['content'][0]['text'],
            'retrieved_references': extract_references(retrieved_references),
            'summarized_input': summarized_text,
            'wave_json': WAVE_JSON
        }
    except Exception as e:
        logger.warning(f"Failed to generate migration strategy: {e}")
        raise

def handle_runbook_generation(input_data, model_arn):
    """Handle runbook generation"""
    try:
        migration_strategy = input_data.get('migrationStrategy', '')
        
        # Extract database types from migration strategy
        source_db, target_db = extract_database_types(migration_strategy)
        
        runbook_prompt = f"Generate a comprehensive runbook for {source_db} to {target_db} migration by breaking down the migration into 9 phases (Discovery, Architecture Design, Environment Setup, Schema Migration, Data Migration, Application Migration, Cutover, Post-Migration Optimization, Decommissioning) with specific step-by-step instructions for each based on the following migration strategy: {migration_strategy}"
        user_message = {"role": "user", "content": [{"text": runbook_prompt}]}
        system_prompt = f"""You are an expert {source_db} to {target_db} migration consultant with 15+ years of experience in enterprise level migrations. Generate AWS Migration runbook following well-architected framework principles. Infrastructure code refer user to use IAC generator tab. Be precise and provide actionable steps with detailed implementation guidance."""

        response = generate_conversation(
            'amazon.nova-pro-v1:0',
            [{"text": system_prompt}],
            [user_message]
        )
        logger.info("Response RunBook %s", response)
        
        if 'output' not in response or 'message' not in response['output']:
            raise ValueError("Unexpected response format from model")
            
        runbook_response = response['output']['message']['content'][0]['text']
        
        return {
            'runbook': runbook_response,
        }
    except Exception as e:
        logger.warning(f"Failed to generate runbook: {e}")
        raise

def handle_iac_generation(input_data, model_arn):
    """Handle Infrastructure as Code generation"""
    try:
        migration_strategy = input_data.get('migrationStrategy', '')
        iac_type = input_data.get('iacType', 'Terraform')
        
        # Extract database types and target services
        source_db, target_db = extract_database_types(migration_strategy)
        target_services = extract_target_services(migration_strategy)
        
        if not target_services:
            raise ValueError("No AWS services found in migration strategy")
            
        # Create IAC prompt
        iac_prompt = f"Generate {iac_type} code for {source_db} to {target_db} migration using the following AWS services: {', '.join(target_services)}. Ensure proper dependencies and best practices."
        
        # System prompt for IAC generation
        system_prompt = f"""You are an expert {source_db} to {target_db} migration consultant with 15+ years of experience in enterprise level migrations. Generate Infrastructure as Code using {iac_type} for the migration strategy. Provide complete configurations for:
- Assessment environments
- {target_db} RDS instances with high availability
- DMS replication instances and tasks
- Testing environments
- Monitoring and alerting setup
Be precise and follow AWS best practices and dont hallucinate or give vague response."""
        
        # Create message structure
        user_message = {"role": "user", "content": [{"text": iac_prompt}]}
        logger.info("User message %s", user_message)
        # Generate IAC code
        response = generate_conversation(
            'amazon.nova-pro-v1:0',
            [{"text": system_prompt}],
            [user_message]
        )
        logger.info("Response IAC %s", response)
        
        if 'output' not in response or 'message' not in response['output']:
            raise ValueError("Unexpected response format from model")
            
        iac_code = response['output']['message']['content'][0]['text']
        
        return {
            'iac_code': iac_code,
            'iac_type': iac_type,
            'target_services': target_services
        }
        
    except Exception as e:
        logger.warning(f"Failed to generate IAC: {e}")
        raise

def ensure_alternating_roles(messages):
    alternating_messages = []
    last_role = None
    for msg in messages:
        if msg['role'] == last_role:
            if last_role == 'user':
                alternating_messages.append({'role': 'assistant', 'content': [{'text': 'I understand.'}]})
            else:
                alternating_messages.append({'role': 'user', 'content': [{'text': 'Please continue.'}]})
        alternating_messages.append(msg)
        last_role = msg['role']
    return alternating_messages

def lambda_handler(event, context):
    try:
        logger.info("Incoming event: %s", json.dumps(event))
        
        input_data = event['input_data']
        config = event['config']
        action = event.get('action', 'migration_strategy')
        
        logger.info("Input data: %s", json.dumps(input_data))
        logger.info("Action: %s", action)

        if action == 'migration_strategy':
            json_data = load_data_from_s3(config['bucket_name'], config['json_key'])
            summarized_text = summarize_input(input_data)
            relevant_scenarios = find_relevant_scenarios(summarized_text, json_data, top_n=3)
            kb_response = retrieve_and_generate_from_knowledge_base(
                summarized_text,
                config['knowledge_base_id'],
                config['model_arn']
            )
            kb_context = kb_response['output']['text']
            retrieved_references = kb_response.get('citations', [])
            response_data = handle_migration_strategy(
                summarized_text,
                relevant_scenarios,
                kb_context,
                retrieved_references,
                config['model_arn']
            )
        elif action == 'runbook':
            response_data = handle_runbook_generation(
                input_data,
                config['model_arn']
            )
        elif action == 'iac':
            response_data = handle_iac_generation(
                input_data,
                config['model_arn']
            )
        elif action == 'wave_planning':
            response_data = handle_wave_planning(input_data)
        else:
            raise ValueError(f"Invalid action: {action}")

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST'
            },
            'body': json.dumps(response_data)
        }
        
    except Exception as e:
        logger.error(f"Error: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST'
            },
            'body': json.dumps({
                'error': str(e),
                'migration_strategy': None,
                'retrieved_references': [],
                'summarized_input': summarized_text if 'summarized_text' in locals() else None
            })
        }