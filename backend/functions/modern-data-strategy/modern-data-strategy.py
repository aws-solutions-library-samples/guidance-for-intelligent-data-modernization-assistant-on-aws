import json
import boto3
import logging
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)

bedrock_runtime = boto3.client('bedrock-runtime')
bedrock_kb = boto3.client('bedrock-agent-runtime')
s3_client = boto3.client('s3')

analytics_services = ["Amazon Redshift", "Amazon Athena", "Amazon SageMaker", "Amazon QuickSight"]

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
    try:
        obj = s3_client.get_object(Bucket=bucket_name, Key=json_key)
        data = obj['Body'].read().decode('utf-8').strip().split('\n')
        jsonl_data = [json.loads(line) for line in data]
        return jsonl_data
    except Exception as e:
        logger.error(f"Failed to load data: {e}")
        return []

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
        logger.warning(f"Error finding relevant scenarios: {e}")
        raise

def ensure_alternating_roles(messages):
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
        logger.warning(f"Error retrieving from knowledge base: {e}")
        raise

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
        logger.warning(f"Error generating conversation: {e}")
        raise

def lambda_handler(event, context):
    try:
        logger.info("Incoming event: %s", json.dumps(event))
        input_data = event.get('input_data')
        config = event.get('config')

        # Load data from S3 - exactly as in Streamlit code
        json_data = load_data_from_s3(config['bucket_name'], config['json_key'])

        # Create summary - exactly matching Streamlit format
        summarized_inputs = []
        for input_row in input_data:
            if isinstance(input_row, dict):
                summary = (
                    f"Data Collection & Ingestion: {input_row.get('Data Collection & Ingestion', '')}, "
                    f"Data Storage & Management: {input_row.get('Data Storage & Management', '')}, "
                    f"Data Analytics & Insights: {input_row.get('Data Analytics & Insights', '')}, "
                    f"Data Governance, Security, and Compliance: {input_row.get('Data Governance, Security, and Compliance', '')}, "
                    f"Data Silos & Integration: {input_row.get('Data Silos & Integration', '')}, "
                    f"Data Democratization & Access: {input_row.get('Data Democratization & Access', '')}, "
                    f"Data Integration: {input_row.get('Data Integration', '')}, "
                    f"AI/ML Integration: {input_row.get('AI/ML Integration', '')}, "
                    f"Cost Optimization & Efficiency: {input_row.get('Cost Optimization & Efficiency', '')}, "
                    f"Future State Vision: {input_row.get('Future State Vision', '')}, "
                    f"Licensed Tools & Technologies: {input_row.get('Licensed Tools & Technologies', '')}"
                )
            else:
                summary = f"Input: {input_row}"
            summarized_inputs.append(summary)

        summarized_text = "\n".join(summarized_inputs)
        if len(summarized_text) > 1000:
            summarized_text = summarized_text[:1000]

        input_text = str(summarized_text)

        # Get relevant scenarios - exactly as in Streamlit
        relevant_scenarios = find_relevant_scenarios(input_text, json_data, top_n=3)

        # Get knowledge base response - exactly as in Streamlit
        kb_response = retrieve_and_generate_from_knowledge_base(
            summarized_text,
            config['knowledge_base_id'],
            config['model_arn']
        )
        kb_context = kb_response['output']['text']
        retrieved_references = kb_response.get('citations', [])

        # Generate conversation - exactly as in Streamlit
        system_prompt = """You are a Chief Data Officer and enterprise data architect with 25+ years of experience in designing and implementing modern data platforms across Fortune 500 companies. Create a comprehensive modern unified data strategy that addresses all aspects of enterprise data management and analytics.

Your response must include detailed coverage of these 11 critical areas:

1. **Data Collection & Ingestion**: Real-time streaming, batch processing, hybrid architectures, CDC, IoT integration, API-based collection, and multi-modal ingestion patterns

2. **Data Storage & Management**: Modern data lake architecture with Bronze/Silver/Gold layers, intelligent tiering, format optimization, lifecycle management, and specialized storage systems

3. **Data Analytics & Insights**: Self-service analytics, advanced statistical analysis, real-time insights, natural language queries, and mobile-responsive applications

4. **Data Governance**: Data quality management, metadata cataloging, privacy controls, compliance frameworks, and automated governance processes

5. **Data Silos & Integration**: API-first integration, event-driven architecture, data mesh principles, cross-system integration, and organizational alignment strategies

6. **Data Access**: Self-service capabilities, programmatic access, security controls, role-based permissions, and democratization strategies

7. **Data Integration**: ETL/ELT patterns, CDC, data virtualization, pipeline management, workflow orchestration, and monitoring frameworks

8. **AI/ML Integration**: MLOps, automated model deployment, AI-powered data operations, advanced analytics services, and model governance

9. **Cost Optimization**: Resource optimization, storage cost management, usage monitoring, chargeback mechanisms, and ROI measurement

10. **Future Goals**: Technology evolution roadmap, advanced capabilities development, organizational transformation, and innovation strategies

11. **Licensed Tools**: Comprehensive portfolio of enterprise tools including Informatica, Tableau, Snowflake, DataRobot, Collibra, and others with investment strategies

For each section, provide:
- Strategic approach and vision
- Key components and capabilities
- Specific licensed tool integrations
- Quantifiable success metrics
- Implementation considerations

Include a phased implementation roadmap (Foundation, Expansion, Optimization, Innovation) with specific timelines and deliverables.

Format as a professional enterprise strategy document that executive leadership and technical teams can use for decision-making, budgeting, and implementation planning. Focus on strategic guidance rather than technical implementation details or code examples."""
    
        for scenario in relevant_scenarios:
            system_prompt += f"***Relevant Scenario:***\n{scenario['input']}\n{scenario['output']}\n\n"
        # system_prompt += f"***Knowledge Base Context:***\n{kb_context}\n\n"

        user_message = {"role": "user", "content": [{"text": input_text}]}
        messages = [user_message]

        response = generate_conversation(
            bedrock_runtime,
            'amazon.nova-pro-v1:0',
            [{"text": system_prompt}],
            ensure_alternating_roles(messages)
        )

        output_message = response['output']['message']
        migration_strategy = output_message['content'][0]['text']

        # Check for analytics services - exactly as in Streamlit
        analytics_found = any(service in migration_strategy for service in analytics_services)
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
            'analytics_found': analytics_found,
            'input_data': input_data
        }
        logger.info(f"Result: {result}")
        save_success = save_session_data_to_s3(
            bucket_name=config['bucket_name'],
            tab_name='modern_data_strategy',
            new_data=result
        )

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
                'analytics_found': analytics_found,
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
                'summarized_input': None,
                'analytics_found': False
            })
        }
