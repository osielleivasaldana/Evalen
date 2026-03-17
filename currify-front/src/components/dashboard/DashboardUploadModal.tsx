import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, CloudArrowUpIcon, DocumentIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useDropzone } from 'react-dropzone';
import { Campaign, apiService } from '../../services/api';
import { limitConcurrency } from '../../utils/promiseUtils';

interface DashboardUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    campaigns: Campaign[]; // Only ACTIVE campaigns should be passed here ideally
    onUploadSuccess: () => void;
}

const DashboardUploadModal: React.FC<DashboardUploadModalProps> = ({
    isOpen,
    onClose,
    campaigns,
    onUploadSuccess
}) => {
    const [step, setStep] = useState(1);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: 'pending' | 'uploading' | 'success' | 'error' }>({});
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Auto-select campaign if only one active exists
    useEffect(() => {
        if (isOpen) {
            // Reset state on open
            setFiles([]);
            setUploading(false);
            setUploadProgress({});
            setUploadError(null);

            const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE');
            if (activeCampaigns.length === 1) {
                setSelectedCampaignId(activeCampaigns[0].id);
                setStep(2); // Skip directly to upload
            } else {
                setStep(1);
                setSelectedCampaignId('');
            }
        }
    }, [isOpen, campaigns]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setFiles(prev => [...prev, ...acceptedFiles]);
        // Initialize progress state
        const newProgress: any = {};
        acceptedFiles.forEach(file => {
            newProgress[file.name] = 'pending';
        });
        setUploadProgress(prev => ({ ...prev, ...newProgress }));
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
        },
        maxSize: 10 * 1024 * 1024 // 10MB
    });

    const handleRemoveFile = (fileName: string) => {
        setFiles(prev => prev.filter(f => f.name !== fileName));
        setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileName];
            return newProgress;
        });
    };

    const handleUpload = async () => {
        if (!selectedCampaignId || files.length === 0) return;

        setUploading(true);
        setUploadError(null);
        let successCount = 0;

        const campaign = campaigns.find(c => c.id === selectedCampaignId);
        if (!campaign) {
            setUploadError('Campaña no encontrada');
            setUploading(false);
            return;
        }

        // Create tasks for each file
        const uploadTasks = files.map((file) => async () => {
            if (uploadProgress[file.name] === 'success') return; // Skip already uploaded

            setUploadProgress(prev => ({ ...prev, [file.name]: 'uploading' }));
            try {
                await apiService.uploadDocument({
                    file,
                    campaignPublicId: campaign.publicId,
                    candidateName: file.name.replace(/\.[^/.]+$/, ""),
                    // Use a unique placeholder email to force creation of a new candidate for each file
                    // The backend deduplicates by email, so we need a unique one until extraction updates it
                    candidateEmail: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@extract.com`,
                    candidatePhone: '000000000'
                });
                setUploadProgress(prev => ({ ...prev, [file.name]: 'success' }));
                successCount++;
            } catch (err) {
                console.error(`Error uploading ${file.name}:`, err);
                setUploadProgress(prev => ({ ...prev, [file.name]: 'error' }));
            }
        });

        // Process with concurrency limit (2 concurrent uploads)
        await limitConcurrency(uploadTasks, 2);

        setUploading(false);

        if (successCount > 0) {
            // Check if there are any errors
            const hasErrors = files.some(f => uploadProgress[f.name] === 'error' && uploadProgress[f.name] !== 'success');

            // If all successful (or just finished), give brief feedback
            setTimeout(() => {
                onUploadSuccess();
                onClose();
            }, 1000);
        }
    };

    const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

    return (
        <Transition show={isOpen} as={React.Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={React.Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={React.Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-indigo-50">
                                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                                    <div className="flex justify-between items-start mb-5">
                                        <Dialog.Title as="h3" className="text-xl font-bold leading-6 text-gray-900 flex items-center gap-2">
                                            <DocumentIcon className="w-6 h-6 text-indigo-600" />
                                            Subir Candidatos Rápidamente
                                        </Dialog.Title>
                                        <button
                                            type="button"
                                            className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                                            onClick={onClose}
                                        >
                                            <span className="sr-only">Cerrar</span>
                                            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                                        </button>
                                    </div>

                                    {step === 1 && (
                                        <div className="mt-4 animate-fade-in">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                1. ¿A qué campaña pertenecen?
                                            </label>
                                            <select
                                                value={selectedCampaignId}
                                                onChange={(e) => {
                                                    setSelectedCampaignId(e.target.value);
                                                    if (e.target.value) setStep(2);
                                                }}
                                                className="mt-1 block w-full rounded-xl border-gray-300 py-3 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                                                size={Math.min(campaigns.length + 1, 5)} // Show minimal list style if preferred, standard select for now
                                            >
                                                <option value="" disabled>Selecciona una campaña...</option>
                                                {campaigns.map((campaign) => (
                                                    <option key={campaign.id} value={campaign.id}>
                                                        {campaign.title}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="mt-2 text-xs text-gray-500">
                                                Solo se muestran tus campañas activas.
                                            </p>
                                        </div>
                                    )}

                                    {step === 2 && (
                                        <div className="mt-4 animate-fade-in-right">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold">✓</span>
                                                    <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]" title={selectedCampaign?.title}>
                                                        {selectedCampaign?.title}
                                                    </span>
                                                </div>
                                                {campaigns.length > 1 && (
                                                    <button
                                                        onClick={() => { setStep(1); setFiles([]); }}
                                                        className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                                                    >
                                                        Cambiar
                                                    </button>
                                                )}
                                            </div>

                                            <div
                                                {...getRootProps()}
                                                className={`
                          mt-2 flex justify-center rounded-2xl border-2 border-dashed px-6 py-10 transition-all duration-300 cursor-pointer
                          ${isDragActive
                                                        ? 'border-indigo-500 bg-indigo-50 scale-[1.02]'
                                                        : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                                                    }
                        `}
                                            >
                                                <div className="text-center">
                                                    <CloudArrowUpIcon className={`mx-auto h-12 w-12 ${isDragActive ? 'text-indigo-600 animate-bounce' : 'text-gray-400'}`} />
                                                    <div className="mt-4 flex text-sm leading-6 text-gray-600 justify-center">
                                                        <input {...getInputProps()} />
                                                        <span className="relative font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500">
                                                            Sube archivos
                                                        </span>
                                                        <p className="pl-1">o arrástralos aquí</p>
                                                    </div>
                                                    <p className="text-xs leading-5 text-gray-500">PDF, DOC, DOCX hasta 10MB</p>
                                                </div>
                                            </div>

                                            {/* File List */}
                                            {files.length > 0 && (
                                                <div className="mt-6 max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Archivos ({files.length})</h4>
                                                    <div className="space-y-2">
                                                        {files.map((file, idx) => (
                                                            <div key={`${file.name}-${idx}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                    <DocumentIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                                                        <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    {uploadProgress[file.name] === 'uploading' && (
                                                                        <div className="w-5 h-5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
                                                                    )}
                                                                    {uploadProgress[file.name] === 'success' && (
                                                                        <CheckCircleIcon className="w-6 h-6 text-green-500" />
                                                                    )}
                                                                    {uploadProgress[file.name] === 'error' && (
                                                                        <ExclamationCircleIcon className="w-6 h-6 text-red-500" title="Error al subir" />
                                                                    )}
                                                                    {uploadProgress[file.name] === 'pending' && (
                                                                        uploading ? (
                                                                            <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                                                                En cola...
                                                                            </span>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => handleRemoveFile(file.name)}
                                                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                                                            >
                                                                                <XMarkIcon className="w-5 h-5" />
                                                                            </button>
                                                                        )
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {uploadError && (
                                                <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
                                                    <ExclamationCircleIcon className="w-5 h-5" />
                                                    {uploadError}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                    {step === 2 && (
                                        <button
                                            type="button"
                                            disabled={files.length === 0 || uploading}
                                            className={`
                            inline-flex w-full justify-center rounded-xl px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto transition-all
                            ${files.length === 0 || uploading
                                                    ? 'bg-indigo-400 cursor-not-allowed'
                                                    : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-200 shadow-lg'
                                                }
                        `}
                                            onClick={handleUpload}
                                        >
                                            {uploading ? 'Subiendo y Analizando...' : 'Subir y Analizar 🚀'}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="mt-3 inline-flex w-full justify-center rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                                        onClick={onClose}
                                        disabled={uploading}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default DashboardUploadModal;
