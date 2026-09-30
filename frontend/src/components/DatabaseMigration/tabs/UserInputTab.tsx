// // components/DatabaseMigration/tabs/UserInputTab
// import React, { useState } from 'react';
// import {
//   SpaceBetween,
//   FormField,
//   Input,
//   Select,
//   Textarea,
//   Button,
//   Container,
//   FlashbarProps,
//   Flashbar,
// } from '@cloudscape-design/components';
// import { useMigrationContext } from '../context/MigrationContext';
// import { FormFieldKey, SampleDataItem } from '../types';
// import InputMethodSelector from '../InputMethodSelector';
// import FileUploader from '../FileUploader';

// interface UserInputTabProps {
//   onError: (error: string | null) => void;
// }

// const UserInputTab: React.FC<UserInputTabProps> = ({ onError }) => {
//   const { formData, setFormData, setResult, setActiveTabId } = useMigrationContext();
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [successMessage, setSuccessMessage] = useState<FlashbarProps.MessageDefinition[]>([]);
//   const [inputMethod, setInputMethod] = useState<'manual' | 'upload'>('manual');
//   const [uploadedData, setUploadedData] = useState<SampleDataItem[] | null>(null);

//   const handleInputChange = (field: FormFieldKey, value: string) => {
//     setFormData(prev => ({
//       ...prev,
//       [field]: value
//     }));
//   };

//   const handleFileUpload = (data: SampleDataItem[]) => {
//     setUploadedData(data);
//     // Convert the first item from uploaded data to form data format
//     if (data.length > 0) {
//       const firstItem = data[0];
//       setFormData({
//         applicationName: firstItem['Application/DB Name*'] || '',
//         description: firstItem['Description'] || '',
//         businessCriticality: firstItem['Business Criticality'] || '',
//         cotsSoftware: firstItem['COTS Software'] || '',
//         complexityCategory: firstItem['Complexity Category(1 to 4)'].toString() || '',
//         databaseEngine: firstItem['Database Engine'] || '',
//         disasterRecovery: firstItem['Disaster Recovery (Y/N)'] || 'N',
//         dbSize: firstItem['Size of the DB(GB)'].toString() || '',
//         migrationConsiderations: firstItem['Migration Considerations'] || ''
//       });
//     }
//     showSuccessMessage('File uploaded successfully');
//   };

//   const showSuccessMessage = (message: string) => {
//     setSuccessMessage([{
//       type: 'success',
//       content: message,
//       dismissible: true,
//       onDismiss: () => setSuccessMessage([]),
//       id: 'success-message'
//     }]);
    
//     // Auto-dismiss after 3 seconds
//     setTimeout(() => setSuccessMessage([]), 3000);
//   };

//   const handleSubmit = async () => {
//     try {
//       setIsSubmitting(true);
      
//       if (!formData.applicationName || !formData.databaseEngine) {
//         throw new Error('Please fill in all required fields');
//       }

//       onError(null);
//       showSuccessMessage('User inputs saved successfully');
      
//       await new Promise(resolve => setTimeout(resolve, 2000));
//       setActiveTabId('strategyOutput');
//     } catch (err) {
//       onError(err instanceof Error ? err.message : 'An error occurred');
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <Container>
//       <SpaceBetween size="l">
//         {successMessage.length > 0 && (
//           <Flashbar items={successMessage} />
//         )}

//         <InputMethodSelector
//           selectedMethod={inputMethod}
//           onChange={setInputMethod}
//         />

//         {inputMethod === 'manual' ? (
//           // Manual Entry Form
//           <SpaceBetween size="l">
//             {/* Your existing form fields */}
//             <FormField label="Application/DB Name">
//           <Input
//             value={formData.applicationName}
//             onChange={({ detail }) => 
//               handleInputChange('applicationName', detail.value)
//             }
//           />
//         </FormField>

//         <FormField label="Description">
//           <Textarea
//             value={formData.description}
//             onChange={({ detail }) => 
//               handleInputChange('description', detail.value)
//             }
//           />
//         </FormField>

//         <FormField label="Business Criticality">
//           <Select
//             selectedOption={{ 
//               label: formData.businessCriticality || 'Select criticality',
//               value: formData.businessCriticality 
//             }}
//             onChange={({ detail }) => 
//               handleInputChange('businessCriticality', detail.selectedOption.value || '')
//             }
//             options={[
//               { label: 'High', value: 'High' },
//               { label: 'Medium', value: 'Medium' },
//               { label: 'Low', value: 'Low' },
//             ]}
//           />
//         </FormField>

//         <FormField label="COTS Software">
//           <Input
//             value={formData.cotsSoftware}
//             onChange={({ detail }) => 
//               handleInputChange('cotsSoftware', detail.value)
//             }
//           />
//         </FormField>

//         <FormField label="Complexity Category">
//           <Select
//             selectedOption={{ 
//               label: formData.complexityCategory || 'Select category',
//               value: formData.complexityCategory 
//             }}
//             onChange={({ detail }) => 
//               handleInputChange('complexityCategory', detail.selectedOption.value || '')
//             }
//             options={[
//               { label: 'Category-1', value: '1' },
//               { label: 'Category-2', value: '2' },
//               { label: 'Category-3', value: '3' },
//               { label: 'Category-4', value: '4' },
//             ]}
//           />
//         </FormField>

//         <FormField label="Database Engine">
//           <Select
//             selectedOption={{ 
//               label: formData.databaseEngine || 'Select database',
//               value: formData.databaseEngine 
//             }}
//             onChange={({ detail }) => 
//               handleInputChange('databaseEngine', detail.selectedOption.value || '')
//             }
//             options={[
//               { label: 'Oracle', value: 'Oracle' },
//               { label: 'SQL Server', value: 'SQL Server' },
//               { label: 'MySQL', value: 'MySQL' },
//               { label: 'PostgreSQL', value: 'PostgreSQL' },
//               { label: 'DB2', value: 'DB2' },
//             ]}
//           />
//         </FormField>

//         <FormField label="Disaster Recovery">
//           <Select
//             selectedOption={{ 
//               label: formData.disasterRecovery || 'Select DR option',
//               value: formData.disasterRecovery 
//             }}
//             onChange={({ detail }) => 
//               handleInputChange('disasterRecovery', detail.selectedOption.value || '')
//             }
//             options={[
//               { label: 'Yes', value: 'Y' },
//               { label: 'No', value: 'N' },
//             ]}
//           />
//         </FormField>

//         <FormField label="Size of the DB (GB)">
//           <Input
//             type="number"
//             value={formData.dbSize}
//             onChange={({ detail }) => 
//               handleInputChange('dbSize', detail.value)
//             }
//           />
//         </FormField>

//         <FormField label="Migration Considerations">
//           <Textarea
//             value={formData.migrationConsiderations}
//             onChange={({ detail }) => 
//               handleInputChange('migrationConsiderations', detail.value)
//             }
//             placeholder="Enter any migration considerations, pain-points, risks, challenges and dependencies"
//             rows={4}
//           />
//         </FormField>
            
//             <Button
//               variant="primary"
//               onClick={handleSubmit}
//               loading={isSubmitting}
//               disabled={isSubmitting}
//             >
//               {t('common.actions.submit')}
//             </Button>
//           </SpaceBetween>
//         ) : (
//           // File Upload
//           <SpaceBetween size="l">
//             <FileUploader
//               onFileUpload={handleFileUpload}
//               onError={onError}
//             />
//             {uploadedData && (
//               <Button
//                 variant="primary"
//                 onClick={handleSubmit}
//                 loading={isSubmitting}
//                 disabled={isSubmitting}
//               >
//                 Generate Migration Strategy
//               </Button>
//             )}
//           </SpaceBetween>
//         )}
//       </SpaceBetween>
//     </Container>
//   );
// };

// export default UserInputTab;
// components/DatabaseMigration/tabs/UserInputTab
import React, { useState } from 'react';
import {
  SpaceBetween,
  FormField,
  Input,
  Select,
  Textarea,
  Button,
  Container,
  FlashbarProps,
  Flashbar,
} from '@cloudscape-design/components';
import { useMigrationContext } from '../context/MigrationContext';
import { FormFieldKey, SampleDataItem } from '../types';
import { t } from '../../../utils/textUtils';
import InputMethodSelector from '../InputMethodSelector';
import FileUploader from '../FileUploader';

interface UserInputTabProps {
  onError: (error: string | null) => void;
}

const UserInputTab: React.FC<UserInputTabProps> = ({ onError }) => {
  const { formData, setFormData, setResult, setActiveTabId } = useMigrationContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<FlashbarProps.MessageDefinition[]>([]);
  const [inputMethod, setInputMethod] = useState<'manual' | 'upload'>('manual');
  const [uploadedData, setUploadedData] = useState<SampleDataItem[] | null>(null);

  const handleInputChange = (field: FormFieldKey, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = (data: SampleDataItem[]) => {
    setUploadedData(data);
    // Convert the first item from uploaded data to form data format
    if (data.length > 0) {
      const firstItem = data[0];
      setFormData({
        applicationName: firstItem['Application/DB Name*'] || '',
        description: firstItem['Description'] || '',
        businessCriticality: firstItem['Business Criticality'] || '',
        cotsSoftware: firstItem['COTS Software'] || '',
        complexityCategory: firstItem['Complexity Category(1 to 4)'].toString() || '',
        databaseEngine: firstItem['Database Engine'] || '',
        disasterRecovery: firstItem['Disaster Recovery (Y/N)'] || 'N',
        dbSize: firstItem['Size of the DB(GB)'].toString() || '',
        migrationConsiderations: firstItem['Migration Considerations'] || ''
      });
    }
    showSuccessMessage('File uploaded successfully');
  };

  const showSuccessMessage = (message: string) => {
    setSuccessMessage([{
      type: 'success',
      content: message,
      dismissible: true,
      onDismiss: () => setSuccessMessage([]),
      id: 'success-message'
    }]);
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => setSuccessMessage([]), 3000);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      if (inputMethod === 'manual') {
        // For manual entry, convert form data to array with single item
        setFormData(prev => ({
          ...prev,
          uploadedData: [{
            "Application/DB Name": prev.applicationName,
            "Description": prev.description,
            "Business Criticality": prev.businessCriticality,
            "COTS Software": prev.cotsSoftware,
            "Complexity Category": prev.complexityCategory,
            "Database Engine": prev.databaseEngine,
            "Disaster Recovery": prev.disasterRecovery,
            "Size of the DB(GB)": prev.dbSize,
            "Migration Considerations": prev.migrationConsiderations
          }]
        }));
      } else {
        // For file upload, use all records
        if (!uploadedData || uploadedData.length === 0) {
          throw new Error('Please upload a file first');
        }
        
        // Transform uploaded data to match expected format
        const transformedData = uploadedData.map(item => ({
          "Application/DB Name": item['Application/DB Name*'],
          "Description": item['Description'],
          "Business Criticality": item['Business Criticality'],
          "COTS Software": item['COTS Software'],
          "Complexity Category": item['Complexity Category(1 to 4)'].toString(),
          "Database Engine": item['Database Engine'],
          "Disaster Recovery": item['Disaster Recovery (Y/N)'],
          "Size of the DB(GB)": item['Size of the DB(GB)'].toString(),
          "Migration Considerations": item['Migration Considerations']
        }));
  
        setFormData(prev => ({
          ...prev,
          uploadedData: transformedData
        }));
      }
  
      onError(null);
      showSuccessMessage('User inputs saved successfully');
      setActiveTabId('strategyOutput');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  

  return (
    <Container>
      <SpaceBetween size="l">
        {successMessage.length > 0 && (
          <Flashbar items={successMessage} />
        )}

        <InputMethodSelector
          selectedMethod={inputMethod}
          onChange={setInputMethod}
        />

        {inputMethod === 'manual' ? (
          // Manual Entry Form
          <SpaceBetween size="l">
            {/* Your existing form fields */}
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
              { label: 'Low', value: 'Low' },
            ]}
          />
        </FormField>

        <FormField label="COTS Software">
          <Input
            value={formData.cotsSoftware}
            onChange={({ detail }) => 
              handleInputChange('cotsSoftware', detail.value)
            }
          />
        </FormField>

        <FormField label="Complexity Category">
          <Select
            selectedOption={{ 
              label: formData.complexityCategory || 'Select category',
              value: formData.complexityCategory 
            }}
            onChange={({ detail }) => 
              handleInputChange('complexityCategory', detail.selectedOption.value || '')
            }
            options={[
              { label: 'Category-1', value: '1' },
              { label: 'Category-2', value: '2' },
              { label: 'Category-3', value: '3' },
              { label: 'Category-4', value: '4' },
            ]}
          />
        </FormField>

        <FormField label="Database Engine">
          <Select
            selectedOption={{ 
              label: formData.databaseEngine || 'Select database',
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
              { label: 'DB2', value: 'DB2' },
            ]}
          />
        </FormField>

        <FormField label="Disaster Recovery">
          <Select
            selectedOption={{ 
              label: formData.disasterRecovery || 'Select DR option',
              value: formData.disasterRecovery 
            }}
            onChange={({ detail }) => 
              handleInputChange('disasterRecovery', detail.selectedOption.value || '')
            }
            options={[
              { label: 'Yes', value: 'Y' },
              { label: 'No', value: 'N' },
            ]}
          />
        </FormField>

        <FormField label="Size of the DB (GB)">
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
            placeholder="Enter any migration considerations, pain-points, risks, challenges and dependencies"
            rows={4}
          />
        </FormField>
            
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {t('common.actions.submit')}
            </Button>
          </SpaceBetween>
        ) : (
          // File Upload
          <SpaceBetween size="l">
            <FileUploader
              onFileUpload={handleFileUpload}
              onError={onError}
            />
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!uploadedData || uploadedData.length === 0 || isSubmitting}
          >
                {t('common.actions.submit')}
              </Button>
          </SpaceBetween>
        )}
      </SpaceBetween>
    </Container>
  );
};

export default UserInputTab;
