
# lambda_function.py

import json
import boto3
import logging
import base64
import re
from datetime import datetime
from botocore.config import Config
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Configure boto3 clients with longer timeouts
boto_config = Config(
    connect_timeout=5,
    read_timeout=70,
    retries={'max_attempts': 2}
)

# Initialize AWS clients
bedrock_runtime = boto3.client('bedrock-runtime', config=boto_config)
bedrock_kb = boto3.client('bedrock-agent-runtime', config=boto_config)
s3_client = boto3.client('s3', config=boto_config)

###################
# Utility Functions
###################

def detect_migration_intent(text):
    """Check if user is asking about database migration"""
    migration_keywords = ['migrat', 'move', 'transfer', 'convert', 'switch', 'upgrade', 'moderniz']
    return any(keyword in text.lower() for keyword in migration_keywords)

def is_greeting(text):
    """Check if user is just greeting"""
    greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening']
    text_clean = text.lower().strip()
    return text_clean in greetings or len(text_clean.split()) <= 2 and any(g in text_clean for g in greetings)

def extract_database_types(text):
    """Extract source and target database types from user input"""
    db_types = ['oracle', 'mysql', 'postgresql', 'postgres', 'sql server', 'mongodb', 'mariadb', 'sqlite', 'cassandra', 'dynamodb', 'redshift']
    
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

def load_data_from_s3(bucket_name, json_key):
    """Load data from S3 bucket"""
    try:
        logger.info(f"Loading data from bucket: {bucket_name}, key: {json_key}")
        obj = s3_client.get_object(Bucket=bucket_name, Key=json_key)
        data = obj['Body'].read().decode('utf-8').strip().split('\n')
        return [json.loads(line) for line in data]
    except Exception as e:
        logger.warning(f"Failed to load data from S3: {e}")
        raise

def image_base64_encoder(image_data):
    """Encode image to base64"""
    try:
        if isinstance(image_data, str) and image_data.startswith('data:image'):
            file_type = image_data.split(';')[0].split('/')[1]
            base64_data = image_data.split(',')[1]
            return f"image/{file_type}", base64_data
        else:
            base64_data = base64.b64encode(image_data).decode('utf-8')
            return "image/jpeg", base64_data
    except Exception as e:
        logger.warning(f"Failed to encode image: {e}")
        raise

def ensure_alternating_roles(messages):
    """Ensure messages alternate between user and assistant"""
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

###################
# Core Processing Functions
###################

def find_relevant_scenarios(input_text, scenarios, top_n=3):
    """Find relevant scenarios using TF-IDF and cosine similarity"""
    try:
        documents = [input_text] + [scenario["input"] for scenario in scenarios]
        vectorizer = TfidfVectorizer()
        vectors = vectorizer.fit_transform(documents)
        cosine_matrix = cosine_similarity(vectors)
        similar_indices = cosine_matrix[0].argsort()[::-1][1:top_n+1]
        return [scenarios[i-1] for i in similar_indices]
    except Exception as e:
        logger.warning(f"Failed to find scenarios: {e}")
        raise

def retrieve_and_generate_from_knowledge_base(user_prompt, knowledge_base_id, model_arn=None):
    """Get response from knowledge base"""
    try:
        # Use Nova Pro as default if no model_arn provided
        kb_model = model_arn if model_arn else 'amazon.nova-pro-v1:0'
        
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
        logger.info("Knowledge base response received")
        return response
    except Exception as e:
        logger.warning(f"Failed to retrieve from knowledge base: {e}")
        raise

def detect_image_format(image_bytes):
    """Detect image format from bytes"""
    if image_bytes.startswith(b'\x89PNG'):
        return 'png'
    elif image_bytes.startswith(b'\xff\xd8\xff'):
        return 'jpeg'
    elif image_bytes.startswith(b'GIF'):
        return 'gif'
    elif image_bytes.startswith(b'WEBP', 8):
        return 'webp'
    else:
        return 'jpeg'  # Default fallback

def process_image(image_data, text):
    """Process image and generate response using Amazon Nova"""
    try:
        if isinstance(image_data, str):
            if image_data.startswith('data:image'):
                image_data = image_data.split(',')[1]
            image_bytes = base64.b64decode(image_data)
        else:
            image_bytes = image_data

        # Detect actual image format
        image_format = detect_image_format(image_bytes)
        
        # Determine if user wants migration focus or general analysis
        if detect_migration_intent(text or ""):
            system_prompt = """Identify database types from the image and provide output in format: 'Migrate [DB_TYPE] to AWS'. Extract specific database icons like Oracle, MySQL, PostgreSQL, SQL Server, MongoDB, etc."""
        else:
            system_prompt = """Analyze this image and describe what you see. Focus on identifying any database systems, architecture components, or technical elements. Be descriptive and thorough."""
        
        if not text:
            text = "Analyze this image and describe what you see."

        # Use converse API for image analysis
        messages = [{
            "role": "user",
            "content": [
                {
                    "image": {
                        "format": image_format,
                        "source": {
                            "bytes": image_bytes
                        }
                    }
                },
                {
                    "text": text
                }
            ]
        }]
        
        logger.info(f"Sending {image_format} image to Nova model via converse")
        response = bedrock_runtime.converse(
            modelId="amazon.nova-pro-v1:0",
            messages=messages,
            system=[{"text": system_prompt}],
            inferenceConfig={"topP": 0.9, "temperature": 0.2},
            additionalModelRequestFields={"inferenceConfig": {"topK": 120}}
        )
        
        return {'content': [{'text': response['output']['message']['content'][0]['text']}]}
    except Exception as e:
        logger.warning(f"Failed to process image: {e}")
        raise

def generate_conversation(messages, system_prompts):
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

def create_migration_prompt(source_db, target_db):
    """Create parameterized migration strategy prompt"""
    return f"""You are an expert enterprise database architect and migration specialist. Create a comprehensive {source_db} to {target_db} migration strategy that includes a robust failback plan and addresses all critical considerations and limitations.

**Migration Requirements:**
- Large-scale {source_db} database migration to {target_db}
- Minimal business disruption during transition
- Robust failback capability to {source_db} if critical issues arise
- Maintain data consistency throughout the migration process
- Support for complex enterprise applications and integrations

**Strategy Components Required:**

1. **Executive Summary and Migration Overview**
2. **Detailed Phase-by-Phase Implementation Plan** (6 phases over 21 weeks)
3. **Comprehensive Failback Strategy**
4. **Technical Considerations Analysis**
5. **Business Considerations Assessment**
6. **Major Limitations and Constraints**
7. **Risk Mitigation Strategies**

**Output Format:** Professional enterprise documentation with detailed week-by-week phases, comprehensive failback procedures, and actionable insights for executive stakeholders and technical teams."""

def create_general_prompt():
    """Create general purpose prompt for non-migration queries"""
    return """You are an expert cloud architect and technology consultant. Provide comprehensive, actionable guidance on the user's question. Focus on best practices, practical implementation steps, and enterprise-grade solutions. Be thorough and provide detailed explanations with clear recommendations."""

def create_greeting_prompt():
    """Create friendly greeting prompt"""
    return """You are IDMA (Intelligent Data Modernization Assistant), a friendly AI assistant specializing in database migrations and cloud architecture. Greet the user warmly and briefly explain how you can help with database migrations, cloud strategies, and technical consulting. Keep it conversational and inviting."""

###################
# Lambda Handler
###################

def lambda_handler(event, context):
    """Main Lambda handler"""
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        action = event.get('action', 'text_input')
        config = event.get('config', {})
        
        if action == 'text_input':
            input_text = event.get('input_text', '')
            
            # Check if this is a migration-related query
            is_migration_query = detect_migration_intent(input_text)
            
            # Load scenarios and find relevant ones
            json_data = load_data_from_s3(config.get('bucket_name'), config.get('json_key'))
            relevant_scenarios = find_relevant_scenarios(input_text, json_data)
            
            # Get knowledge base response
            kb_response = retrieve_and_generate_from_knowledge_base(
                input_text,
                config.get('knowledge_base_id'),
                config.get('model_arn')
            )
            
            kb_context = kb_response['output']['text']
            retrieved_references = kb_response.get('citations', [])
            
            # Build appropriate system prompt
            if is_greeting(input_text):
                system_prompt = create_greeting_prompt()
            elif is_migration_query:
                source_db, target_db = extract_database_types(input_text)
                system_prompt = create_migration_prompt(source_db, target_db)
                for scenario in relevant_scenarios:
                    system_prompt += f"\n***Relevant Scenario:***\n{scenario['input']}\n{scenario['output']}\n"
            else:
                system_prompt = create_general_prompt()
                system_prompt += f"\n***Knowledge Base Context:***\n{kb_context}\n"  # Commented out as requested

            messages = [{"role": "user", "content": [{"text": input_text}]}]
            response = generate_conversation(
                ensure_alternating_roles(messages), 
                [{"text": system_prompt}]
            )
            
        elif action == 'image_input':
            image_data = event.get('image_data', '')
            input_text = event.get('input_text', '')
            
            # Process image and get response
            llm_output = process_image(image_data, input_text)
            db_names = llm_output['content'][0]['text']
            
            # Check if user wants migration strategy or just image analysis
            user_query = input_text if input_text else "describe image"
            wants_migration = detect_migration_intent(user_query)
            
            if wants_migration:
                # Get knowledge base response for migration
                json_data = load_data_from_s3(config.get('bucket_name'), config.get('json_key'))
                relevant_scenarios = find_relevant_scenarios(db_names, json_data)
                
                kb_response = retrieve_and_generate_from_knowledge_base(
                    db_names,
                    config.get('knowledge_base_id'),
                    config.get('model_arn')
                )
                
                kb_context = kb_response['output']['text']
                retrieved_references = kb_response.get('citations', [])
                
                # Extract database types and build migration prompt
                source_db, target_db = extract_database_types(db_names)
                system_prompt = create_migration_prompt(source_db, target_db)
                for scenario in relevant_scenarios:
                    system_prompt += f"\n***Relevant Scenario:***\n{scenario['input']}\n{scenario['output']}\n"
                
                messages = [{"role": "user", "content": [{"text": db_names}]}]
                response = generate_conversation(ensure_alternating_roles(messages), [{"text": system_prompt}])
            else:
                # Just return the image analysis
                retrieved_references = []
                response = {'output': {'message': {'content': [{'text': db_names}]}}}
            
        elif action == 'followup':
            messages = event.get('conversation_history', [])
            followup_text = event.get('followup_text', '')
            formatted_messages = []
            for msg in messages:
                content = msg.get('content')
                if isinstance(msg.get('content'), list) and msg['content']:
                    formatted_messages.append(msg)
                else:
                    text_content = msg.get('content', {}).get('text', '') or 'Continue the conversation.'
                    formatted_messages.append({
                        'role': msg.get('role'),
                        'content': [{'text': text_content}]
                    })
            
            # Add followup message
            formatted_messages.append({
                'role': 'user',
                'content': [{'text': followup_text}]
            })
            
            # Get context from previous conversation
            original_context = next((
                msg['content'][0]['text'] 
                for msg in formatted_messages 
                if msg['role'] == 'assistant' and msg.get('content')
            ), '')
            
            json_data = load_data_from_s3(config.get('bucket_name'), config.get('json_key'))
            relevant_scenarios = find_relevant_scenarios(followup_text + " " + original_context, json_data)
            
            kb_response = retrieve_and_generate_from_knowledge_base(
                followup_text,
                config.get('knowledge_base_id'),
                config.get('model_arn')
            )
            
            kb_context = kb_response['output']['text']
            retrieved_references = kb_response.get('citations', [])
            
            # Extract database types for followup
            source_db, target_db = extract_database_types(followup_text + " " + original_context)
            system_prompt = f"Continue the conversation about {source_db} to {target_db} migration strategy."
            system_prompt += f"\n\nPrevious Context:\n{original_context}"
            for scenario in relevant_scenarios:
                system_prompt += f"\n\nRelevant Scenario:\n{scenario['input']}\n{scenario['output']}"
                system_prompt += f"\n\nKnowledge Base Context:\n{kb_context}"  # Commented out as requested
            
            response = generate_conversation(
                ensure_alternating_roles(formatted_messages),
                [{"text": system_prompt}]
            )
            
        else:
            raise ValueError(f"Invalid action: {action}")
        logger.info("Response Body %s",json.dumps({
                'response': response,
                'retrieved_references': retrieved_references if 'retrieved_references' in locals() else [],
                'status': 'success'
            }))
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST'
            },
            'body': json.dumps({
                'response': response['output']['message']['content'][0]['text'],
                'retrieved_references': retrieved_references if 'retrieved_references' in locals() else [],
                'status': 'success'
            })
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
                'status': 'error'
            })
        }
