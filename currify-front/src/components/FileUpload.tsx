import React, { useState, useRef } from 'react';
import { apiService, CVData } from '../services/api';

interface FileUploadProps {
  onProcessingComplete: (data: CVData) => void;
  onError: (error: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onProcessingComplete, onError }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      onError('Por favor seleccione un archivo PDF o Word (.doc, .docx)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      onError('El archivo no puede ser mayor a 10MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      onError('Por favor seleccione un archivo');
      return;
    }

    setProcessing(true);

    try {
      const result = await apiService.extractCV(selectedFile);
      onProcessingComplete(result);
    } catch (err: any) {
      if (err.response?.status === 401) {
        onError('Token expirado. Por favor inicie sesión nuevamente.');
      } else {
        onError(`Error al procesar el archivo: ${err.message}`);
      }
      console.error('Upload error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '20px auto',
      padding: '20px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9'
    }}>
      <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>
        Procesar Currículum Vitae
      </h3>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragActive ? '#007bff' : '#ccc'}`,
          borderRadius: '8px',
          padding: '40px 20px',
          textAlign: 'center',
          backgroundColor: dragActive ? '#f0f8ff' : 'white',
          marginBottom: '20px',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        onClick={handleBrowseClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx"
          style={{ display: 'none' }}
        />

        {!selectedFile ? (
          <div>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📄</div>
            <p style={{ fontSize: '16px', color: '#666', marginBottom: '10px' }}>
              Arrastra y suelta tu CV aquí o <span style={{ color: '#007bff', textDecoration: 'underline' }}>busca archivo</span>
            </p>
            <p style={{ fontSize: '12px', color: '#999' }}>
              Formatos soportados: PDF, DOC, DOCX (máximo 10MB)
            </p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>✅</div>
            <p style={{ fontSize: '16px', color: '#28a745', marginBottom: '5px' }}>
              {selectedFile.name}
            </p>
            <p style={{ fontSize: '12px', color: '#666' }}>
              {formatFileSize(selectedFile.size)}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
              style={{
                marginTop: '10px',
                padding: '5px 10px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Remover archivo
            </button>
          </div>
        )}
      </div>

      <button
        onClick={handleUpload}
        disabled={!selectedFile || processing}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: (!selectedFile || processing) ? '#ccc' : '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: (!selectedFile || processing) ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          fontWeight: 'bold'
        }}
      >
        {processing ? 'Procesando CV... ⏳' : 'Procesar CV'}
      </button>

      {processing && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#e3f2fd',
          border: '1px solid #2196f3',
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '10px' }}>🔄 Procesando curriculum...</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Esto puede tomar unos momentos dependiendo del tamaño del archivo
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;