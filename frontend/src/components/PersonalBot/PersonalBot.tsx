// import React, { useState } from 'react';
// import {
//   Container,
//   Header,
//   SpaceBetween,
//   Textarea,
//   Button,
//   RadioGroup,
//   Box,
//   FormField,
// } from '@cloudscape-design/components';
// import styled from 'styled-components';

// const ChatContainer = styled.div`
//   height: 400px;
//   overflow-y: auto;
//   margin: 20px 0;
//   padding: 20px;
//   border: 1px solid #eaeded;
//   border-radius: 8px;
// `;

// const MessageBubble = styled.div<{ isUser: boolean }>`
//   max-width: 70%;
//   margin: 10px;
//   padding: 15px;
//   border-radius: 8px;
//   background-color: ${props => props.isUser ? '#0972d3' : '#f2f8fd'};
//   color: ${props => props.isUser ? 'white' : 'inherit'};
//   align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
// `;

// const MessagesWrapper = styled.div`
//   display: flex;
//   flex-direction: column;
// `;

// interface Message {
//   text: string;
//   isUser: boolean;
//   timestamp: Date;
// }

// const PersonalBot: React.FC = () => {
//   const [inputType, setInputType] = useState('text');
//   const [inputText, setInputText] = useState('');
//   const [followUpText, setFollowUpText] = useState('');
//   const [messages, setMessages] = useState<Message[]>([]);

//   const handleSendMessage = () => {
//     if (!inputText.trim()) return;

//     const newMessage: Message = {
//       text: inputText,
//       isUser: true,
//       timestamp: new Date(),
//     };

//     setMessages(prev => [...prev, newMessage]);
//     setInputText('');
    
//     // TODO: Integrate with backend API
//     // For now, just echo a response
//     setTimeout(() => {
//       const botResponse: Message = {
//         text: 'Thank you for your input. I am processing your request...',
//         isUser: false,
//         timestamp: new Date(),
//       };
//       setMessages(prev => [...prev, botResponse]);
//     }, 1000);
//   };

//   return (
//     <SpaceBetween size="l">
//       <Container>
//         <Header
//           variant="h1"
//           description="Enter a migration scenario to get a recommended strategy or upload an image to interpret and provide the relevant migration strategy."
//         >
//           IDMA BOT
//         </Header>

//         <SpaceBetween size="l">
//           <Button variant="link" onClick={() => setMessages([])}>
//             Reset Conversation
//           </Button>

//           <FormField label="Choose Input Option:">
//             <RadioGroup
//               items={[
//                 { value: 'text', label: 'Text Input' },
//                 { value: 'image', label: 'Image Input' },
//               ]}
//               value={inputType}
//               onChange={({ detail }) => setInputType(detail.value)}
//             />
//           </FormField>

//           <ChatContainer>
//             <MessagesWrapper>
//               {messages.map((message, index) => (
//                 <MessageBubble key={index} isUser={message.isUser}>
//                   {message.text}
//                 </MessageBubble>
//               ))}
//             </MessagesWrapper>
//           </ChatContainer>

//           <SpaceBetween size="m">
//             <FormField label="Enter your input scenario:">
//               <Textarea
//                 value={inputText}
//                 onChange={({ detail }) => setInputText(detail.value)}
//                 rows={4}
//               />
//             </FormField>

//             <Button variant="primary" onClick={handleSendMessage}>
//               Get Answer
//             </Button>

//             <Box variant="h4">Follow-Up Questions</Box>
//             <FormField label="Ask follow-up questions or request more details:">
//               <Textarea
//                 value={followUpText}
//                 onChange={({ detail }) => setFollowUpText(detail.value)}
//                 rows={3}
//               />
//             </FormField>

//             <Button 
//               disabled={!followUpText.trim()}
//               onClick={() => {
//                 if (followUpText.trim()) {
//                   const newMessage: Message = {
//                     text: followUpText,
//                     isUser: true,
//                     timestamp: new Date(),
//                   };
//                   setMessages(prev => [...prev, newMessage]);
//                   setFollowUpText('');
//                 }
//               }}
//             >
//               {t('common.actions.submit')} Follow-Up
//             </Button>
//           </SpaceBetween>
//         </SpaceBetween>
//       </Container>
//     </SpaceBetween>
//   );
// };

// export default PersonalBot; 
import React, { useState, useRef, useEffect } from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  Textarea,
  Button,
  RadioGroup,
  Box,
  FormField,
  Alert,
  FileUpload,
  Modal,
  ExpandableSection,
  Spinner,
} from '@cloudscape-design/components';
import { formatBotResponse } from '../../utils/formatUtils';
import { t } from '../../utils/textUtils';
import styled from 'styled-components';

const ChatContainer = styled.div`
  height: 400px;
  overflow-y: auto;
  margin: 20px 0;
  padding: 20px;
  border: 1px solid #eaeded;
  border-radius: 8px;
`;

const MessageBubble = styled.div<{ isUser: boolean }>`
  max-width: 70%;
  margin: 10px;
  padding: 15px;
  border-radius: 8px;
  background-color: ${props => props.isUser ? '#0972d3' : '#f2f8fd'};
  color: ${props => props.isUser ? 'white' : 'inherit'};
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
`;

const MessagesWrapper = styled.div`
  display: flex;
  flex-direction: column;
`;

const MessagesArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f2f3f3;
  border-radius: 8px;
  margin-bottom: 20px;
`;

const InputArea = styled.div`
  padding: 20px;
  background: white;
  border-top: 1px solid #eaeded;
  border-radius: 0 0 8px 8px;
`;
const ImagePreview = styled.img`
  max-width: 100%;
  max-height: 300px;
  margin: 10px 0;
  border-radius: 4px;
`;

const FileUploadContainer = styled.div`
min-height: 200px;
padding: 20px;
border: 2px dashed #ccc;
border-radius: 4px;
margin: 10px 0;
`;

interface Reference {
  generatedResponsePart: {
    textResponsePart: {
      span: {
        start: number;
        end: number;
      };
      text: string;
    };
  };
  retrievedReferences: Array<{
    content?: {
      text: string;
    };
  }>;
}

interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
  references?: Reference[];
}


interface Config {
  bucket_name: string;
  json_key: string;
  knowledge_base_id: string;
  model_arn: string;
}

const PersonalBot: React.FC = () => {
  const [inputType, setInputType] = useState('text');
  const [inputText, setInputText] = useState('');
  const [followUpText, setFollowUpText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [askedQuestion, setAskedQuestion] = useState(false);
  const [imageUploaded, setImageUploaded] = useState<File | null>(null);
  const [showSuccessFlash, setShowSuccessFlash] = useState(false);

  // Configuration
  const config: Config = {
    bucket_name: process.env.REACT_APP_S3_BUCKET || '',
    json_key: process.env.REACT_APP_JSON_KEY || 'context_data.jsonl',
    knowledge_base_id: process.env.REACT_APP_KNOWLEDGE_BASE_ID || '',
    model_arn: process.env.REACT_APP_MODEL_ARN || '',
  };


  const handleReset = () => {
    setMessages([]);
    setAskedQuestion(false);
    setImageUploaded(null);
    setInputText('');
    setImagePreview(null);
    setFollowUpText('');
    setShowSuccessFlash(true);
    
    // Auto-hide success message after 3 seconds
    setTimeout(() => setShowSuccessFlash(false), 3000);
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleImageUpload = (detail: { value: File[] }) => {
    if (detail.value && detail.value.length > 0) {
      const file = detail.value[0];
      setSelectedImage(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  const handleSendMessage = async () => {
    if ((!inputText.trim() && inputType === 'text') || 
        (inputType === 'image' && !selectedImage)) return;

    setIsLoading(true);
    setError(null);

    try {
      let newMessage: Message;
      if (inputType === 'text') {
        newMessage = {
          text: inputText,
          isUser: true,
          timestamp: new Date(),
        };
      } else {
        newMessage = {
          text: `Image uploaded${inputText ? ': ' + inputText : ''}`,
          isUser: true,
          timestamp: new Date(),
        };
      }
      setMessages(prev => [...prev, newMessage]);

      // Prepare request body
      const body: any = {
        action: inputType === 'text' ? 'text_input' : 'image_input',
        config,
        input_text: inputText,
      };
      
      console.log('Request URL:', process.env.REACT_APP_API_URL + '/bot');
      console.log('Request Body:', JSON.stringify(body, null, 2));
      // If image input, add base64 image data
      if (inputType === 'image' && selectedImage) {
        const base64Image = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.readAsDataURL(selectedImage);
        });
        body.image_data = base64Image;
      }

      
      // Call Lambda function
      const response = await fetch(process.env.REACT_APP_API_URL + '/bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error('Failed to get response from bot');
      }

      const data = await response.json();
      const parsedBody = JSON.parse(data.body);
      console.log('Parsed response:', parsedBody);
  
      if (parsedBody.status !== 'success') {
        throw new Error('Invalid response from server');
      }
  
      // Add bot response to messages
      const botResponse: Message = {
        text: parsedBody.response,  // Direct access to response text
        isUser: false,
        timestamp: new Date(),
        references: parsedBody.retrieved_references
      };
      setMessages(prev => [...prev, botResponse]);
  
      // Clear inputs
      setInputText('');
      setSelectedImage(null);
      setImagePreview(null);
  
    } catch (err) {
      console.error('Error in handleSendMessage:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowUp = async () => {
    if (!followUpText.trim()) return;
  
    setIsLoading(true);
    setError(null);
  
    try {
      const newMessage: Message = {
        text: followUpText,
        isUser: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, newMessage]);
  
      // Update message format to match what backend expects
      const formattedMessages = messages.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: [{ text: msg.text || '' }]  // Change here: wrap text in array with object
      }));
  
      const requestBody = {
        action: 'followup',
        config,
        conversation_history: formattedMessages,
        followup_text: followUpText,
      };
  
      console.log('Follow-up request:', JSON.stringify(requestBody, null, 2));
  
      const response = await fetch(`${process.env.REACT_APP_API_URL}/bot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Follow-up error response:', errorText);
        throw new Error('Failed to get follow-up response');
      }
  
      const data = await response.json();
      console.log('Follow-up response:', data);
  
      const parsedBody = JSON.parse(data.body);
  
      if (parsedBody.status !== 'success') {
        throw new Error(parsedBody.error || 'Failed to process follow-up');
      }
  
      const botResponse: Message = {
        text: parsedBody.response,
        isUser: false,
        timestamp: new Date(),
        references: parsedBody.retrieved_references
      };
      setMessages(prev => [...prev, botResponse]);
      setFollowUpText('');
  
    } catch (err) {
      console.error('Error in handleFollowUp:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return;

    try {
      const response = await fetch(process.env.REACT_APP_API_URL + '/bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'feedback',
          feedback_data: {
            timestamp: new Date().toISOString(),
            conversation_history: messages,
            feedback: feedbackText,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      setFeedbackText('');
      setShowFeedbackModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <SpaceBetween size="l">
      <Container>
        <Header
          variant="h1"
          description="Enter a migration scenario to get a recommended strategy or upload an image to interpret and provide the relevant migration strategy."
          actions={
            <Button 
              onClick={handleReset}
              variant="link"
            >
              {t('bot.actions.resetConversation')}
            </Button>
          }
        >
          {t('bot.header.title')}
        </Header>

        {showSuccessFlash && (
          <Alert
            type="success"
            dismissible
            onDismiss={() => setShowSuccessFlash(false)}
          >
            {t('bot.messages.conversationReset')}
          </Alert>
        )}

        {error && (
          <Alert 
            type="error" 
            dismissible 
            onDismiss={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        <SpaceBetween size="m">
          {/* Input Options Section */}
          <FormField label="Choose Input Option:">
            <RadioGroup
              items={[
                { value: 'text', label: 'Text Input' },
                { value: 'image', label: 'Image Input' },
              ]}
              value={inputType}
              onChange={({ detail }) => setInputType(detail.value)}
            />
          </FormField>

          {/* Image Upload Section */}
          {inputType === 'image' && (
              <FileUploadContainer>
              <FormField 
                label="Upload an image of the OnPrem Architecture"
                description="(e.g., a screenshot of a Onprem database configuration)"
              >
                <FileUpload
                  onChange={({ detail }) => handleImageUpload(detail)}
                  value={selectedImage ? [selectedImage] : []}
                  accept="image/*"
                  multiple={false}
                  showFileLastModified={false}
                  showFileSize={true}
                  tokenLimit={1}
                  constraintText="Only image files (jpg, jpeg, png) are allowed"
                  i18nStrings={{
                    dropzoneText: (multiple: boolean) => 'Drop database architecture image here or choose file to upload',
                    removeFileAriaLabel: (fileIndex: number) => `Remove file ${fileIndex + 1}`,
                    limitShowFewer: 'Show fewer files',
                    limitShowMore: 'Show more files',
                    errorIconAriaLabel: 'Error',
                    uploadButtonText: (multiple: boolean) => 'Choose file',
                  }}
                />
              </FormField>
              </FileUploadContainer>
            )}

          {imagePreview && (
            <Box>
              <ImagePreview src={imagePreview} alt="Preview" />
            </Box>
          )}

          {/* Text Input Section */}
          <FormField label={inputType === 'image' ? "Enter any specific instructions you want to add in context for the image: (Optional):" : "Enter your input scenario:"}>
          <Textarea
              value={inputText}
              onChange={({ detail }) => setInputText(detail.value)}
              placeholder={
                inputType === 'image' 
                  ? "Add context for the image..." 
                  : "Enter your migration scenario..."
              }
              rows={3}
            />
          </FormField>

          <Box textAlign="right">
            <Button
              variant="primary"
              onClick={handleSendMessage}
              loading={isLoading}
              disabled={
                (inputType === 'text' && !inputText.trim()) ||
                (inputType === 'image' && !selectedImage)
              }
            >
              {t('bot.actions.getAnswer')}
            </Button>
          </Box>

          {/* Chat Container - Only show if there are messages */}
          {messages.length > 0 && (
            <Container
              header={
                <Header variant="h2">
                  {t('bot.labels.conversationHistory')}
                </Header>
              }
            >
              <ChatContainer>
                <MessagesWrapper>
                  {messages.map((message, index) => (
                    <MessageBubble key={index} isUser={message.isUser}>
                      {message.isUser ? (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{message.text}</div>
                      ) : (
                        <div 
                          style={{ lineHeight: '1.4', fontSize: '14px' }}
                          dangerouslySetInnerHTML={{ __html: formatBotResponse(message.text) }} 
                        />
                      )}
                      {!message.isUser && message.references && message.references.length > 0 && (
                        <Box margin={{ top: 'xs' }} color="text-body-secondary">
                          <ExpandableSection header="References">
                            {message.references.map((ref, i) => (
                              <Box key={i} margin={{ bottom: 'xs' }}>
                                {/* Access the text from the generatedResponsePart structure */}
                                {ref.generatedResponsePart?.textResponsePart?.text || 'No reference available'}
                                {/* If there are retrieved references, display them */}
                                {ref.retrievedReferences?.map((citation, j) => (
                                  <Box key={`${i}-${j}`} margin={{ top: 'xxs' }}>
                                    {citation.content?.text || ''}
                                  </Box>
                                ))}
                              </Box>
                            ))}
                          </ExpandableSection>
                        </Box>
                      )}
                    </MessageBubble>
                  ))}
                  {isLoading && (
                    <Box textAlign="center" padding={{ top: 'l' }}>
                      <Spinner />
                    </Box>
                  )}
                </MessagesWrapper>

                {/* Follow-up Input Area */}
                {!isLoading && (
                  <InputArea>
                    <SpaceBetween size="m">
                      <FormField label="Follow-up question">
                        <Textarea
                          value={followUpText}
                          onChange={({ detail }) => setFollowUpText(detail.value)}
                          placeholder="Ask a follow-up question..."
                          rows={2}
                        />
                      </FormField>
                      <Box textAlign="right">
                        <Button
                          onClick={handleFollowUp}
                          disabled={!followUpText.trim()}
                        >
                          {t('bot.actions.sendFollowup')}
                        </Button>
                      </Box>
                    </SpaceBetween>
                  </InputArea>
                )}
              </ChatContainer>
            </Container>
          )}
        </SpaceBetween>

        {/* Feedback Modal */}
        <Modal
          visible={showFeedbackModal}
          onDismiss={() => setShowFeedbackModal(false)}
          header="Provide Feedback"
          footer={
            <Box float="right">
              <SpaceBetween direction="horizontal" size="xs">
                <Button onClick={() => setShowFeedbackModal(false)}>{t('common.actions.cancel')}</Button>
                <Button variant="primary" onClick={handleFeedbackSubmit}>
                  {t('bot.actions.submitFeedback')}
                </Button>
              </SpaceBetween>
            </Box>
          }
        >
          <FormField label="Your feedback:">
            <Textarea
              value={feedbackText}
              onChange={({ detail }) => setFeedbackText(detail.value)}
              rows={4}
            />
          </FormField>
        </Modal>
      </Container>
    </SpaceBetween>
  );
};

  export default PersonalBot;
//   return (
//     <SpaceBetween size="l">
//       <Container>
//         <Header
//           variant="h1"
//           description="Enter a migration scenario to get a recommended strategy or upload an image to interpret and provide the relevant migration strategy."
//         >
//           IDMA BOT
//         </Header>

//         <SpaceBetween size="l">
//           {/* Add success flash message here, before the reset button */}
//           {showSuccessFlash && (
//             <Alert
//               type="success"
//               dismissible
//               onDismiss={() => setShowSuccessFlash(false)}
//             >
//               Conversation reset successfully!
//             </Alert>
//           )}

//           {/* Update your existing reset button */}
//           <Button 
//             variant="link" 
//             onClick={handleReset}
//           >
//             Reset Conversation
//           </Button>

//           {/* Your existing error alert */}
//           {error && (
//             <Alert type="error" dismissible onDismiss={() => setError(null)}>
//               {error}
//             </Alert>
//           )}
//         <FormField label="Choose Input Option:">
//           <RadioGroup
//             items={[
//               { value: 'text', label: 'Text Input' },
//               { value: 'image', label: 'Image Input' },
//             ]}
//             value={inputType}
//             onChange={({ detail }) => setInputType(detail.value as 'text' | 'image')}
//           />
//         </FormField>

//           {/* <ChatContainer ref={chatContainerRef}>
//             <MessagesWrapper>
//               {messages.map((message, index) => (
//                 <MessageBubble key={index} isUser={message.isUser}>
//                   {message.text}
//                   {message.references && message.references.length > 0 && (
//                     <ExpandableSection header="References">
//                       {message.references.map((ref, i) => (
//                         <Box key={i} margin={{ bottom: 'xs' }}>
//                           {ref}
//                         </Box>
//                       ))}
//                     </ExpandableSection>
//                   )}
//                 </MessageBubble>
//               ))}
//               {isLoading && (
//                 <Box textAlign="center" padding={{ top: 'l' }}>
//                   <Spinner />
//                 </Box>
//               )}
//             </MessagesWrapper>
//           </ChatContainer> */}

//           <SpaceBetween size="m">
            
//             {inputType === 'image' && (
//               <FileUploadContainer>
//               <FormField 
//                 label="Upload an image of the OnPrem Architecture"
//                 description="(e.g., a screenshot of a Onprem database configuration)"
//               >
//                 <FileUpload
//                   onChange={({ detail }) => handleImageUpload(detail)}
//                   value={selectedImage ? [selectedImage] : []}
//                   accept="image/*"
//                   multiple={false}
//                   showFileLastModified={false}
//                   showFileSize={true}
//                   tokenLimit={1}
//                   constraintText="Only image files (jpg, jpeg, png) are allowed"
//                   i18nStrings={{
//                     dropzoneText: (multiple: boolean) => 'Drop database architecture image here or choose file to upload',
//                     removeFileAriaLabel: (fileIndex: number) => `Remove file ${fileIndex + 1}`,
//                     limitShowFewer: 'Show fewer files',
//                     limitShowMore: 'Show more files',
//                     errorIconAriaLabel: 'Error',
//                     uploadButtonText: (multiple: boolean) => 'Choose file',
//                   }}
//                 />
//               </FormField>
//               </FileUploadContainer>
//             )}

//             {imagePreview && (
//               <Box>
//                 <ImagePreview src={imagePreview} alt="Preview" />
//               </Box>
//             )}

//             <FormField label={inputType === 'image' ? "Enter any specific instructions you want to add in context for the image: (Optional):" : "Enter your input scenario:"}>
//               <Textarea
//                 value={inputText}
//                 onChange={({ detail }) => setInputText(detail.value)}
//                 rows={4}
//               />
//             </FormField>

//             <Button
//               variant="primary"
//               onClick={handleSendMessage}
//               loading={isLoading}
//               disabled={
//                 (inputType === 'text' && !inputText.trim()) ||
//                 (inputType === 'image' && !selectedImage)
//               }
//             >
//               Get Answer
//             </Button>

//             <Box variant="h4">Follow-Up Questions</Box>
//             <FormField label="Ask follow-up questions or request more details:">
//               <Textarea
//                 value={followUpText}
//                 onChange={({ detail }) => setFollowUpText(detail.value)}
//                 rows={3}
//               />
//             </FormField>

//             <Button 
//               onClick={handleFollowUp}
//               loading={isLoading}
//               disabled={!followUpText.trim()}
//             >
//               {t('common.actions.submit')} Follow-Up
//             </Button>
//           </SpaceBetween>
//         </SpaceBetween>

//         <Modal
//           visible={showFeedbackModal}
//           onDismiss={() => setShowFeedbackModal(false)}
//           header="Provide Feedback"
//           footer={
//             <Box float="right">
//               <SpaceBetween direction="horizontal" size="xs">
//                 <Button onClick={() => setShowFeedbackModal(false)}>Cancel</Button>
//                 <Button variant="primary" onClick={handleFeedbackSubmit}>
//                   {t('common.actions.submit')} Feedback
//                 </Button>
//               </SpaceBetween>
//             </Box>
//           }
//         >
//           <FormField label="Your feedback:">
//             <Textarea
//               value={feedbackText}
//               onChange={({ detail }) => setFeedbackText(detail.value)}
//               rows={4}
//             />
//           </FormField>
//         </Modal>
//       </Container>
//     </SpaceBetween>
//   );
// };

 
