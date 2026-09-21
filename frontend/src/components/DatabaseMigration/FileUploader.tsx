import React, { useState } from 'react';
import {
  Box,
  SpaceBetween,
  Table,
  TextContent,
  Alert,
  FileUpload,
  StatusIndicator,
  Header,
  Button,
  Cards,
  Icon,
} from '@cloudscape-design/components';
import { parse, ParseResult } from 'papaparse';
import readXlsxFile from 'read-excel-file';
import { t } from '../../utils/textUtils';
import { BoxProps } from "@cloudscape-design/components/box";
import { HeaderProps } from "@cloudscape-design/components/header";

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

interface FileData {
  file: File;
  data: SampleDataItem[];
  status: 'processing' | 'success' | 'error';
}

interface FileUploaderProps {
  onFileUpload: (data: SampleDataItem[]) => void;
  onError: (error: string) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileUpload, onError }) => {
  const [uploadedFiles, setUploadedFiles] = useState<FileData[]>([]);
  const [fileStatus, setFileStatus] = useState<'initial' | 'loading' | 'finished' | 'error'>('initial');
  
  const sampleData: SampleDataItem[] = [
    {
      'Application/DB Name*': 'Application1',
      'Description': 'Product Inventory',
      'Business Criticality': 'Critical',
      'COTS Software': 'Yes',
      'Complexity Category(1 to 4)': 4,
      'Database Engine': 'SQL server',
      'Disaster Recovery (Y/N)': 'N',
      'Migration Considerations': 'Dependency with 3 other Applications',
      'Size of the DB(GB)': 1024,
      'EOL License Expiration': 'Yes'
    }
  ];

  const handleFileChange = async ({ detail }: { detail: { value: File[] } }) => {
    const files = detail.value;
    
    // If no files, reset the state
    if (files.length === 0) {
      setUploadedFiles([]);
      setFileStatus('initial');
      onFileUpload([]);
      return;
    }
  
    setFileStatus('loading');
  
    // Get only new files that aren't already in uploadedFiles
    const newFiles = files.filter(file => 
      !uploadedFiles.some(existingFile => existingFile.file.name === file.name)
    );
  
    for (const file of newFiles) {
      try {
        if (file.type === 'text/csv' || 
            file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.type === 'application/vnd.ms-excel') {
          
          const newFileData: FileData = {
            file,
            data: [],
            status: 'processing'
          };
  
          setUploadedFiles(prev => [...prev, newFileData]);
          await processFile(file);
          
          // Get the processed data from uploadedFiles
          const processedFile = uploadedFiles.find(f => f.file.name === file.name);
          if (processedFile && processedFile.status === 'success' && processedFile.data.length > 0) {
            onFileUpload(processedFile.data); // Call onFileUpload with the processed data
          }
        } else {
          onError(`Unsupported file format for ${file.name}`);
        }
      } catch (error) {
        onError(`Error processing file ${file.name}: ${error}`);
      }
    }
  
    setFileStatus('finished');
  };
  
  
  const processFile = (file: File): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      if (uploadedFiles.some(f => f.file.name === file.name && f.status === 'success')) {
        resolve();
        return;
      }

      try {
        let data: SampleDataItem[] = [];

        if (file.type === 'text/csv') {
          parse<SampleDataItem>(file, {
            header: true,
            complete: (results: ParseResult<SampleDataItem>) => {
              processData(results.data, file, resolve, reject);
            },
            error: (error: Error) => {
              handleError(file, error.message, reject);
            }
          });
        } else {
          const rows = await readXlsxFile(file);
          if (rows.length > 0) {
            const headers = rows[0] as string[];
            data = rows.slice(1).map(row => {
              const obj: any = {};
              headers.forEach((header, index) => {
                obj[header] = row[index];
              });
              return obj as SampleDataItem;
            });
          }
          processData(data, file, resolve, reject);
        }
      } catch (error) {
        handleError(file, error instanceof Error ? error.message : 'Unknown error', reject);
      }
    });
  };

  const processData = (data: SampleDataItem[], file: File, resolve: () => void, reject: (reason: string) => void) => {
    if (validateData(data)) {
      setUploadedFiles(prev => {
        const fileIndex = prev.findIndex(f => f.file.name === file.name);
        if (fileIndex === -1) return prev;

        const newFiles = [...prev];
        newFiles[fileIndex] = {
          ...newFiles[fileIndex],
          data: data,
          status: 'success'
        };
        onFileUpload(data);
        return newFiles;
      });
      resolve();
    } else {
      handleError(file, 'Invalid data format', reject);
    }
  };

  const handleError = (file: File, errorMessage: string, reject: (reason: string) => void) => {
    setUploadedFiles(prev => {
      const fileIndex = prev.findIndex(f => f.file.name === file.name);
      if (fileIndex === -1) return prev;

      const newFiles = [...prev];
      newFiles[fileIndex] = {
        ...newFiles[fileIndex],
        status: 'error'
      };
      return newFiles;
    });
    reject(errorMessage);
  };
  
  const removeFile = (fileToRemove: File) => {
    setUploadedFiles(prev => {
      const newFiles = prev.filter(f => f.file.name !== fileToRemove.name);
      // If no files left, reset the status
      if (newFiles.length === 0) {
        setFileStatus('initial');
      }
      return newFiles;
    });
  };
  

  const validateData = (data: SampleDataItem[]): boolean => {
    if (!data.length) return false;

    const criticalColumns = [
      "Business Criticality",
      "COTS Software",
      "Database Engine",
      "EOL License Expiration"
    ];

    return criticalColumns.every(col => Object.keys(data[0]).includes(col));
  };

  const columnDefinitions = [
    { 
      id: 'appName', 
      header: "Application/DB Name*", 
      cell: (item: SampleDataItem) => item["Application/DB Name*"],
      width: 150
    },
    { 
      id: 'desc', 
      header: "Description", 
      cell: (item: SampleDataItem) => item.Description,
      width: 150
    },
    { 
      id: 'crit', 
      header: "Business Criticality", 
      cell: (item: SampleDataItem) => item["Business Criticality"],
      width: 150
    },
    { 
      id: 'cots', 
      header: "COTS Software", 
      cell: (item: SampleDataItem) => item["COTS Software"],
      width: 120
    },
    { 
      id: 'complexity', 
      header: "Complexity Category(1 to 4)", 
      cell: (item: SampleDataItem) => item["Complexity Category(1 to 4)"],
      width: 180
    },
    { 
      id: 'engine', 
      header: "Database Engine", 
      cell: (item: SampleDataItem) => item["Database Engine"],
      width: 150
    },
    { 
      id: 'dr', 
      header: "Disaster Recovery (Y/N)", 
      cell: (item: SampleDataItem) => item["Disaster Recovery (Y/N)"],
      width: 180
    },
    { 
      id: 'migConsiderations', 
      header: "Migration Considerations", 
      cell: (item: SampleDataItem) => item["Migration Considerations"],
      width: 200
    },
    { 
      id: 'dbSize', 
      header: "Size of the DB(GB)", 
      cell: (item: SampleDataItem) => item["Size of the DB(GB)"],
      width: 150
    },
    { 
      id: 'eol', 
      header: "EOL License Expiration", 
      cell: (item: SampleDataItem) => item["EOL License Expiration"],
      width: 150
    }
  ];

  return (
    <SpaceBetween size="l">
        <FileUpload
        onChange={handleFileChange}
        value={uploadedFiles.map(f => f.file)}
        accept=".csv,.xlsx,.xls"
        multiple={true}
        constraintText="File types supported: CSV, Excel (.xlsx, .xls)"
        showFileLastModified
        showFileSize
        i18nStrings={{
            uploadButtonText: (e: boolean) => (e ? 'Choose files' : 'Choose file'),
            dropzoneText: (e: boolean) => (e ? 'Drop files to upload' : 'Drop file to upload'),
            removeFileAriaLabel: (e: number) => `Remove file ${e + 1}`,
        }}
        key="file-upload" // Add a key to ensure proper re-rendering
        />


      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <Box padding="s">
            <Header variant="h3">{t('common.labels.uploadedFiles')}</Header>
            <SpaceBetween size="xs">
            {uploadedFiles.map((fileData, index) => (
                <Box key={index} padding="s">
                <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon 
                        name={fileData.status === 'success' ? 'status-positive' : 'status-negative'} 
                        variant={fileData.status === 'success' ? 'success' : 'error'}
                    />
                    <span>{fileData.file.name}</span>
                    <StatusIndicator type={fileData.status === 'success' ? 'success' : 'error'}>
                        {fileData.status === 'success' ? 'Processed' : 'Error'}
                    </StatusIndicator>
                    </div>
                    <Button
                    variant="icon"
                    iconName="close"
                    onClick={() => removeFile(fileData.file)}
                    ariaLabel={`Remove ${fileData.file.name}`}
                    />
                </SpaceBetween>
                </Box>
            ))}
            </SpaceBetween>
        </Box>
        )}


      {/* Sample Data Table */}
      <Box padding={{ vertical: 'l' }}>
        <Header variant="h3">{t('common.labels.sampleFileFormat')}</Header>
        <Table
          columnDefinitions={columnDefinitions}
          items={sampleData}
          variant="embedded"
          stickyHeader
          stripedRows
          resizableColumns
          wrapLines
          header={<Header>{t('common.labels.sampleFormat')}</Header>}
        />
      </Box>

      {/* Uploaded Data Tables */}
      {uploadedFiles.map((fileData, index) => (
        fileData.status === 'success' && (
          <Box key={index} padding={{ vertical: 'l' }}>
            <Header variant="h3">{fileData.file.name}</Header>
            <Table
              columnDefinitions={columnDefinitions}
              items={fileData.data}
              variant="embedded"
              stickyHeader
              stripedRows
              resizableColumns
              wrapLines
              header={
                <Header counter={`(${fileData.data.length} items)`}>
                  {t('common.labels.uploadedData')}
                </Header>
              }
            />
          </Box>
        )
      ))}
    </SpaceBetween>
  );
};

export default FileUploader;