import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { 
  BriefcaseIcon, 
  UserGroupIcon, 
  CalendarIcon, 
  EllipsisVerticalIcon,
  PencilIcon,
  ShareIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

export interface CampaignCardProps {
  id: string;
  publicId: string;
  title: string;
  description: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
  candidatesCount: number;
  createdAt: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onCopyLink: (publicId: string) => void;
  onToggleStatus: (id: string, currentStatus: string) => void;
}

const CampaignCard: React.FC<CampaignCardProps> = ({
  id,
  publicId,
  title,
  description,
  status,
  candidatesCount,
  createdAt,
  onEdit,
  onDelete,
  onCopyLink,
  onToggleStatus
}) => {
  const navigate = useNavigate();

  const handleCardClick = (e: React.MouseEvent) => {
    // Si el clic viene de un elemento interactivo (botón o menú), no navegar
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
      return;
    }
    navigate(`/campaigns/${id}`);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ACTIVE': return { label: 'Activa', color: 'bg-green-100 text-green-800', icon: <CheckCircleSolid className="w-3 h-3 text-green-600" /> };
      case 'DRAFT': return { label: 'Borrador', color: 'bg-yellow-100 text-yellow-800', icon: <CheckCircleSolid className="w-3 h-3 text-yellow-600" /> };
      case 'PAUSED': return { label: 'Pausada', color: 'bg-amber-100 text-amber-800', icon: <PauseIcon className="w-3 h-3 text-amber-600" /> };
      case 'CLOSED': return { label: 'Cerrada', color: 'bg-gray-100 text-gray-800', icon: <CheckCircleSolid className="w-3 h-3 text-gray-500" /> };
      default: return { label: status, color: 'bg-gray-100 text-gray-800', icon: null };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const { label, color, icon } = getStatusConfig(status);

  return (
    <div
      onClick={handleCardClick}
      className="group relative bg-white p-6 hover:bg-slate-50 border-b border-gray-100 last:border-b-0 transition-all duration-300 cursor-pointer first:rounded-t-2xl last:rounded-b-2xl overflow-hidden"
    >
      {/* Indicador de hover lateral */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center" />

      <div className="flex items-start gap-5">
        {/* Icono de Campaña con Glassmorphism */}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-110 duration-500 ${
          status === 'ACTIVE' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
        }`}>
          <BriefcaseIcon className="w-7 h-7" />
        </div>

        {/* Información Principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-2">
            <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate max-w-md">
              {title}
            </h3>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tight ${color} shadow-sm border border-white/20`}>
              {icon}
              {label}
            </span>
          </div>

          <div 
            className="text-sm text-slate-500 mb-4 line-clamp-2 prose prose-sm max-w-none prose-slate"
            dangerouslySetInnerHTML={{ __html: description }}
          />

          {/* Stats & Metadata Row */}
          <div className="flex items-center flex-wrap gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50/50 rounded-lg text-indigo-700 font-bold border border-indigo-100/50">
              <UserGroupIcon className="w-4 h-4" />
              <span>{candidatesCount} candidatos</span>
            </div>
            
            <div className="flex items-center gap-2 text-slate-400 font-medium ml-1">
              <CalendarIcon className="w-4 h-4" />
              <span className="opacity-80">Creada el {formatDate(createdAt)}</span>
            </div>

            {/* CTA Secundario (Copy/Share) - Visible en desktop hover */}
            <div className="hidden lg:flex items-center gap-3 ml-auto opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
               <button
                  onClick={(e) => { e.stopPropagation(); onCopyLink(publicId); }}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-600 font-bold text-xs"
                  title="Copiar enlace público"
                >
                  <ClipboardDocumentIcon className="w-4 h-4" />
                  COPIAR ENLACE
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); window.open(`/apply/${publicId}`, '_blank'); }}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-600 font-bold text-xs"
                  title="Abrir enlace público"
                >
                  <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  ABRIR PÁGINA
                </button>
            </div>
          </div>
        </div>

        {/* Acciones de Control */}
        <div className="flex items-center gap-2 sm:gap-3 self-start lg:self-center">
          {/* Botón de Estado Principal */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleStatus(id, status); }}
            className={`p-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center hover:scale-105 active:scale-95 ${
              status === 'ACTIVE'
                ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200/50'
                : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200/50'
            }`}
            title={status === 'ACTIVE' ? 'Pausar campaña' : 'Activar campaña'}
          >
            {status === 'ACTIVE' ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
          </button>

          {/* Menú de Opciones */}
          <Menu as="div" className="relative">
            <Menu.Button 
              onClick={(e) => e.stopPropagation()}
              className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all border border-transparent hover:border-slate-200"
            >
              <EllipsisVerticalIcon className="w-6 h-6" />
            </Menu.Button>
            <Transition
              enter="transition ease-out duration-200"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none z-30 p-1.5">
                <div className="py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(id); }}
                        className={`${
                          active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
                        } group flex items-center gap-3 w-full px-4 py-2.5 text-sm font-bold rounded-xl transition-colors`}
                      >
                        <PencilIcon className="w-5 h-5 opacity-70" />
                        Editar campaña
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={(e) => { e.stopPropagation(); onCopyLink(publicId); }}
                        className={`${
                          active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
                        } group flex items-center gap-3 w-full px-4 py-2.5 text-sm font-bold rounded-xl transition-colors`}
                      >
                        <ShareIcon className="w-5 h-5 opacity-70" />
                        Copiar enlace
                      </button>
                    )}
                  </Menu.Item>
                  <div className="my-1.5 border-t border-slate-100" />
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(id); }}
                        className={`${
                          active ? 'bg-red-50 text-red-700' : 'text-red-500'
                        } group flex items-center gap-3 w-full px-4 py-2.5 text-sm font-bold rounded-xl transition-colors opacity-80 hover:opacity-100`}
                      >
                        <TrashIcon className="w-5 h-5 opacity-70" />
                        Eliminar
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>

      {/* Botón CTA - "Gestionar Candidatos" */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-50 pt-5">
        <div className="hidden sm:block text-xs uppercase tracking-widest font-black text-slate-300 group-hover:text-indigo-200 transition-colors">
          Flujo de gestión activa
        </div>
        
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/campaigns/${id}`); }}
          className="group/btn flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-indigo-600 border border-slate-200 hover:border-indigo-600 text-indigo-600 hover:text-white rounded-xl font-black text-sm uppercase tracking-wide transition-all shadow-sm hover:shadow-indigo-200"
        >
          <span>Gestionar {candidatesCount} candidatos</span>
          <ArrowRightIcon className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
        </button>
      </div>
    </div>
  );
};

export default CampaignCard;
