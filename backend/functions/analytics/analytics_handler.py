import json
import boto3
import logging
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
bedrock_runtime = boto3.client('bedrock-runtime')
bedrock_kb = boto3.client('bedrock-agent-runtime')
s3_client = boto3.client('s3')

def save_session_data_to_s3(bucket_name, tab_name, new_data):
    try:
        key = f'session_data/{tab_name}.json'
        
        # Try to get existing data
        try:
            response = s3_client.get_object(Bucket=bucket_name, Key=key)
            existing_data = json.loads(response['Body'].read().decode('utf-8'))
        except s3_client.exceptions.NoSuchKey:
            existing_data = []
        
        # Append new data
        existing_data.append(new_data)
        
        # Save back to S3
        s3_client.put_object(
            Bucket=bucket_name,
            Key=key,
            Body=json.dumps(existing_data),
            ContentType='application/json'
        )
        
        logger.info(f"Successfully saved data to {key} in bucket {bucket_name}")
        return True
    except Exception as e:
        logger.error(f"Error saving to S3: {str(e)}")
        return False

def load_data_from_s3(bucket_name, json_key):
    """Exact same S3 loading function as in original code"""
    try:
        obj = s3_client.get_object(Bucket=bucket_name, Key=json_key)
        data = obj['Body'].read().decode('utf-8').strip().split('\n')
        jsonl_data = [json.loads(line) for line in data]
        return jsonl_data
    except Exception as e:
        logger.warning(f"Failed to load data from S3: {e}")
        raise

def find_relevant_scenarios(input_text, scenarios, top_n=3):
    """Exact same scenario finding function as in original code"""
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
    """Exact same knowledge base function as in original code"""
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

def ensure_alternating_roles(messages):
    """Exact same message handling function as in original code"""
    alternating_messages = []
    last_role = None
    for msg in messages:
        if msg['role'] == last_role:
            if last_role == 'user':
                alternating_messages.append({'role': 'assistant', 'content': [{'text': ''}]})
            else:
                alternating_messages.append({'role': 'user', 'content': [{'text': ''}]})
        alternating_messages.append(msg)
        last_role = msg['role']
    return alternating_messages

def generate_conversation(bedrock_client, model_id, system_prompts, messages):
    """Exact same conversation generation function as in original code"""
    try:
        inference_config = {"topP": 0.9, "temperature": 0.2}
        additional_model_fields = {
                "inferenceConfig": {
                    "topK": 120
                }
            }
        
        response = bedrock_client.converse(
            modelId=model_id,
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
    """Create summary from input data exactly as in original code"""
    summarized_inputs = []
    for input_row in input_data:
        if input_row is not None:
            if isinstance(input_row, dict):
                summary = (
                    f"Business Use Case: {input_row.get('Business Use Case', '')}, "
                    f"Business Criticality: {input_row.get('Business Criticality', '')}, "
                    f"Source Technology: {input_row.get('Source Technology', '')}, "
                    f"Technical Track: {input_row.get('Technical Track', '')}, "
                    f"Size of the DB (GB): {input_row.get('Size of the DB (GB)', '')}, "
                    f"Size of Datawarehouse/Data Lake (GB): {input_row.get('Size of Datawarehouse/Data Lake (GB)', '')}, "
                    f"Frequency Use Case: {input_row.get('Frequency Use Case', '')}, "
                    f"Engagement Primary Success Factor: {input_row.get('Engagement Primary Success Factor', '')}, "
                    f"Migration Considerations: {input_row.get('Migration Considerations', '')}"
                )
            else:
                summary = f"Input: {input_row}"
            summarized_inputs.append(summary)
    
    summarized_text = "\n".join(summarized_inputs)
    if len(summarized_text) > 1000:
        summarized_text = summarized_text[:1000]
    return summarized_text

def lambda_handler(event, context):
    try:
        # Parse request body
        logger.info("Incoming event: %s", json.dumps(event))
        
        # Handle both direct invocation and API Gateway events
        if 'body' in event:
            # API Gateway event
            body = json.loads(event['body'])
            input_data = body['input_data']
            config = body['config']
        else:
            # Direct invocation
            input_data = event['input_data']
            config = event['config']
        
        logger.info("Input data: %s", json.dumps(input_data))
        logger.info("Config: %s", json.dumps(config))
        
        
        # Load scenarios from S3
        json_data = load_data_from_s3(config['bucket_name'], config['json_key'])
        
        # Summarize input
        summarized_text = summarize_input(input_data)
        logger.info(f"Summarized input: {summarized_text}")
        
        # Find relevant scenarios
        relevant_scenarios = find_relevant_scenarios(summarized_text, json_data, top_n=3)
        logger.info(f"Found {len(relevant_scenarios)} relevant scenarios")
        
        # Get knowledge base response
        kb_response = retrieve_and_generate_from_knowledge_base(
            summarized_text,
            config['knowledge_base_id'],
            config['model_arn']
        )
        kb_context = kb_response['output']['text']
        retrieved_references = kb_response.get('citations', [])
        
        # Prepare system prompt
        system_prompt = """You are a senior cloud migration architect with 20+ years of experience in enterprise Hadoop to AWS migrations. Provide a comprehensive migration strategy that includes:

1. **Phase-by-Phase Approach**: Break down the migration into 9 distinct phases (Discovery and Assessment, Architecture Design and Planning, Environment Setup and Foundation, Data Migration, Compute Workload Migration, Application and Integration Migration, Cutover and Go-Live, Optimization and Tuning, Legacy System Decommissioning) with detailed objectives, activities, deliverables, and success criteria for each phase.

2. **Key Considerations**: Address technical considerations including:
   - Service mapping complexity (HDFS to S3, MapReduce to EMR/Glue, Hive to Athena, HBase to DynamoDB)
   - Data format and storage optimization challenges
   - Performance and scalability implications
   - Security and compliance requirements
   - Business considerations including operational impact, financial implications, and risk management

3. **Comprehensive Limitations Analysis**: Cover technical limitations (service compatibility, data migration challenges, integration complexity) and business limitations (resource constraints, organizational challenges, operational risks).

4. **Detailed Failback Strategy**: Include immediate rollback triggers, rollback procedures, long-term failback considerations, and risk mitigation strategies.

5. **AWS Service Mapping**: Provide clear mapping between Hadoop ecosystem components and corresponding AWS services with migration considerations for each.

6. **Migration Approach Options**: Discuss different migration strategies (lift-and-shift, re-platforming, refactoring) with pros and cons for each.

Exclude code examples and scripts. Focus on strategic planning, risk assessment, business considerations, and comprehensive project management approach. Format as a professional enterprise migration document with clear sections and actionable guidance that executive stakeholders and technical teams can use for decision-making and execution planning."""
        for scenario in relevant_scenarios:
            system_prompt += f"***Relevant Scenario:***\n{scenario['input']}\n{scenario['output']}\n\n"
        # system_prompt += f"***Knowledge Base Context:***\n{kb_context}\n\n"
        
        # Create user message - exactly as in original code
        user_message = {"role": "user", "content": [{"text": summarized_text}]}
        messages = [user_message]
        alternating_messages = ensure_alternating_roles(messages)
        # Generate conversation - exactly as in original code
        response = generate_conversation(
            bedrock_runtime,
            'amazon.nova-pro-v1:0',
            [{"text": system_prompt}],
            alternating_messages
        )
        
        output_message = response['output']['message']
        migration_strategy = output_message['content'][0]['text']
        reference_texts = []
        if retrieved_references:
            for citation in retrieved_references:
                if 'retrievedReferences' in citation:
                    for ref in citation['retrievedReferences']:
                        if 'content' in ref and 'text' in ref['content']:
                            reference_texts.append(ref['content']['text'])

        result = {
            'migration_strategy': migration_strategy,
            'retrieved_references': retrieved_references,
            'summarized_input': summarized_text,
            'timestamp': datetime.utcnow().isoformat(),
            'input_data': input_data
        }
        
        # Save to S3
        save_success = save_session_data_to_s3(
            bucket_name=config['bucket_name'],
            tab_name='data_analytics',
            new_data=result
        )
        logger.info("Complete Respons: %s", json.dumps({
                'migration_strategy': migration_strategy,
                'retrieved_references': reference_texts,
                'summarized_input': summarized_text,
                'saved_to_s3': save_success
            }))
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            'body': json.dumps({
                'migration_strategy': migration_strategy,
                'retrieved_references': reference_texts,
                'summarized_input': summarized_text,
                'saved_to_s3': save_success
            })
        }
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            'body': json.dumps({
                'error': str(e),
                'migration_strategy': None,
                'retrieved_references': [],
                'summarized_input': summarized_text if 'summarized_text' in locals() else None
            })
        }
