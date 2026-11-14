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
                    <div className="fixed inset-0 bg-ev-ink/60 backdrop-blur-sm transition-opacity" />
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
                            <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-ev-card dark:bg-[#16241C] text-left shadow-card-lg-evalen transition-all sm:my-8 sm:w-full sm:max-w-lg border border-ev-line/30 dark:border-white/[0.06]">
                                <div className="bg-ev-card dark:bg-[#16241C] px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                                    <div className="flex justify-between items-start mb-5">
                                        <Dialog.Title as="h3" className="text-xl font-bold leading-6 text-ev-ink dark:text-ev-onmark flex items-center gap-2">
                                            <DocumentIcon className="w-6 h-6 text-ev-cta" />
                                            Subir Candidatos Rápidamente
                                        </Dialog.Title>
                                        <button
                                            type="button"
                                            className="rounded-md bg-ev-card dark:bg-[#16241C] text-ev-ink3 dark:text-ev-ink3/70 hover:text-ev-ink2 transition-colors focus:outline-none"
                                            onClick={onClose}
                                        >
                                            <span className="sr-only">Cerrar</span>
                                            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                                        </button>
                                    </div>

                                    {step === 1 && (
                                        <div className="mt-4 animate-fade-in">
                                            <label className="block text-sm font-medium text-ev-ink2 dark:text-ev-ink2/80 mb-2">
                                                1. ¿A qué campaña pertenecen?
                                            </label>
                                            <select
                                                value={selectedCampaignId}
                                                onChange={(e) => {
                                                    setSelectedCampaignId(e.target.value);
                                                    if (e.target.value) setStep(2);
                                                }}
                                                className="mt-1 block w-full rounded-xl border-ev-line/50 dark:border-white/[0.08] bg-ev-paper dark:bg-[#0E1813] py-3 pl-3 pr-10 text-base text-ev-ink dark:text-ev-onmark focus:border-ev-cta focus:outline-none focus:ring-ev-cta sm:text-sm shadow-sm cursor-pointer hover:bg-ev-paper/80 dark:hover:bg-[#0E1813]/80 transition-colors"
                                                size={Math.min(campaigns.length + 1, 5)} // Show minimal list style if preferred, standard select for now
                                            >
                                                <option value="" disabled>Selecciona una campaña...</option>
                                                {campaigns.map((campaign) => (
                                                    <option key={campaign.id} value={campaign.id}>
                                                        {campaign.title}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="mt-2 text-xs text-ev-ink2/60 dark:text-ev-ink2/50">
                                                Solo se muestran tus campañas activas.
                                            </p>
                                        </div>
                                    )}

                                    {step === 2 && (
                                        <div className="mt-4 animate-fade-in-right">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-ev-cta/10 text-ev-cta text-xs font-bold">✓</span>
                                                    <span className="text-sm font-medium text-ev-ink dark:text-ev-onmark truncate max-w-[200px]" title={selectedCampaign?.title}>
                                                        {selectedCampaign?.title}
                                                    </span>
                                                </div>
                                                {campaigns.length > 1 && (
                                                    <button
                                                        onClick={() => { setStep(1); setFiles([]); }}
                                                        className="text-xs text-ev-cta hover:text-ev-green-dark underline"
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
                                                        ? 'border-ev-cta bg-ev-cta/5 dark:bg-ev-cta/10 scale-[1.02]'
                                                        : 'border-ev-line/50 dark:border-white/[0.08] hover:border-ev-cta/50 hover:bg-ev-paper dark:hover:bg-[#0E1813]'
                                                    }
                        `}
                                            >
                                                <div className="text-center">
                                                    <CloudArrowUpIcon className={`mx-auto h-12 w-12 ${isDragActive ? 'text-ev-cta animate-bounce' : 'text-ev-ink3 dark:text-ev-ink3/70'}`} />
                                                    <div className="mt-4 flex text-sm leading-6 text-ev-ink2 dark:text-ev-ink2/70 justify-center">
                                                        <input {...getInputProps()} />
                                                        <span className="relative font-semibold text-ev-cta focus-within:outline-none focus-within:ring-2 focus-within:ring-ev-cta focus-within:ring-offset-2 hover:text-ev-green-dark">
                                                            Sube archivos
                                                        </span>
                                                        <p className="pl-1">o arrástralos aquí</p>
                                                    </div>
                                                    <p className="text-xs leading-5 text-ev-ink2/60 dark:text-ev-ink2/50">PDF, DOC, DOCX hasta 10MB</p>
                                                </div>
                                            </div>

                                            {/* File List */}
                                            {files.length > 0 && (
                                                <div className="mt-6 max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                                                    <h4 className="text-xs font-bold text-ev-ink3 dark:text-ev-ink3/70 uppercase tracking-wider mb-2">Archivos ({files.length})</h4>
                                                    <div className="space-y-2">
                                                        {files.map((file, idx) => (
                                                            <div key={`${file.name}-${idx}`} className="flex items-center justify-between p-3 bg-ev-paper dark:bg-[#0E1813] rounded-lg border border-ev-line/30 dark:border-white/[0.06]">
                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                    <DocumentIcon className="w-5 h-5 text-ev-ink3 dark:text-ev-ink3/70 flex-shrink-0" />
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-medium text-ev-ink dark:text-ev-onmark truncate">{file.name}</p>
                                                                        <p className="text-xs text-ev-ink2/60 dark:text-ev-ink2/50">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    {uploadProgress[file.name] === 'uploading' && (
                                                                        <div className="w-5 h-5 rounded-full border-2 border-ev-cta border-t-transparent animate-spin"></div>
                                                                    )}
                                                                    {uploadProgress[file.name] === 'success' && (
                                                                        <CheckCircleIcon className="w-6 h-6 text-green-500" />
                                                                    )}
                                                                    {uploadProgress[file.name] === 'error' && (
                                                                        <ExclamationCircleIcon className="w-6 h-6 text-red-500" title="Error al subir" />
                                                                    )}
                                                                    {uploadProgress[file.name] === 'pending' && (
                                                                        uploading ? (
                                                                            <span className="inline-flex items-center rounded-md bg-ev-paper dark:bg-[#0E1813] px-2 py-1 text-xs font-medium text-ev-ink2 dark:text-ev-ink2/70 ring-1 ring-inset ring-ev-line/30 dark:ring-white/[0.08]">
                                                                                En cola...
                                                                            </span>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => handleRemoveFile(file.name)}
                                                                                className="text-ev-ink3 dark:text-ev-ink3/70 hover:text-ev-red transition-colors"
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
                                                <div className="mt-4 p-3 bg-ev-red/10 text-ev-red text-sm rounded-xl flex items-center gap-2">
                                                    <ExclamationCircleIcon className="w-5 h-5" />
                                                    {uploadError}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-ev-paper dark:bg-[#0E1813] px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                    {step === 2 && (
                                        <button
                                            type="button"
                                            disabled={files.length === 0 || uploading}
                                            className={`
                            inline-flex w-full justify-center rounded-xl px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto transition-all
                            ${files.length === 0 || uploading
                                                    ? 'bg-ev-cta/50 cursor-not-allowed'
                                                    : 'bg-ev-cta hover:bg-ev-green-dark shadow-card-lg-evalen'
                                                }
                        `}
                                            onClick={handleUpload}
                                        >
                                            {uploading ? 'Subiendo y Analizando...' : 'Subir y Analizar 🚀'}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="mt-3 inline-flex w-full justify-center rounded-xl bg-ev-card dark:bg-[#16241C] px-3 py-2 text-sm font-semibold text-ev-ink dark:text-ev-onmark shadow-sm ring-1 ring-inset ring-ev-line/50 dark:ring-white/[0.08] hover:bg-ev-paper dark:hover:bg-[#0E1813] sm:mt-0 sm:w-auto"
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
