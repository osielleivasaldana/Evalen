import React, { useState } from 'react';
import { CVData } from '../services/api';

interface CVResultsProps {
  data: CVData;
  onReset: () => void;
}

const CVResults: React.FC<CVResultsProps> = ({ data, onReset }) => {
  const [activeTab, setActiveTab] = useState<string>('contacto');

  const formatDate = (date: string | null) => {
    if (!date || date === 'Presente') return date;
    if (date.includes('-')) {
      const [year, month] = date.split('-');
      return `${month}/${year}`;
    }
    return date;
  };

  const tabStyle = (isActive: boolean) => ({
    padding: '10px 20px',
    backgroundColor: isActive ? '#007bff' : '#f8f9fa',
    color: isActive ? 'white' : '#495057',
    border: '1px solid #dee2e6',
    cursor: 'pointer',
    borderRadius: '4px 4px 0 0',
    marginRight: '2px'
  });

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse' as const,
    marginTop: '20px'
  };

  const thStyle = {
    backgroundColor: '#f8f9fa',
    padding: '12px',
    textAlign: 'left' as const,
    border: '1px solid #dee2e6',
    fontWeight: 'bold'
  };

  const tdStyle = {
    padding: '12px',
    border: '1px solid #dee2e6',
    verticalAlign: 'top' as const
  };

  const renderContactInfo = () => (
    <table style={tableStyle}>
      <tbody>
        <tr>
          <th style={thStyle}>Nombre Completo</th>
          <td style={tdStyle}>{data.datos_cv.datos_contacto.nombre_completo}</td>
        </tr>
        <tr>
          <th style={thStyle}>Teléfono</th>
          <td style={tdStyle}>{data.datos_cv.datos_contacto.telefono}</td>
        </tr>
        <tr>
          <th style={thStyle}>Email</th>
          <td style={tdStyle}>{data.datos_cv.datos_contacto.email}</td>
        </tr>
        <tr>
          <th style={thStyle}>Ubicación</th>
          <td style={tdStyle}>{data.datos_cv.datos_contacto.ubicacion}</td>
        </tr>
      </tbody>
    </table>
  );

  const renderProfessionalTitle = () => (
    <table style={tableStyle}>
      <tbody>
        <tr>
          <th style={thStyle}>Titular Profesional</th>
          <td style={tdStyle}>{data.datos_cv.titular_profesional.titular}</td>
        </tr>
      </tbody>
    </table>
  );

  const renderProfessionalSummary = () => (
    <table style={tableStyle}>
      <tbody>
        <tr>
          <th style={thStyle}>Resumen Profesional</th>
          <td style={tdStyle}>{data.datos_cv.resumen_profesional.resumen}</td>
        </tr>
      </tbody>
    </table>
  );

  const renderWorkExperience = () => (
    <div>
      {data.datos_cv.experiencia_laboral.map((exp, index) => (
        <div key={index} style={{ marginBottom: '20px', border: '1px solid #dee2e6', borderRadius: '4px' }}>
          <div style={{ backgroundColor: '#f8f9fa', padding: '10px', fontWeight: 'bold' }}>
            {exp.cargo} - {exp.empresa}
          </div>
          <table style={tableStyle}>
            <tbody>
              <tr>
                <th style={thStyle}>Período</th>
                <td style={tdStyle}>
                  {formatDate(exp.periodo.fecha_inicio)} - {formatDate(exp.periodo.fecha_fin)}
                </td>
              </tr>
              {exp.ubicacion && (
                <tr>
                  <th style={thStyle}>Ubicación</th>
                  <td style={tdStyle}>{exp.ubicacion}</td>
                </tr>
              )}
              {exp.responsabilidades.length > 0 && (
                <tr>
                  <th style={thStyle}>Responsabilidades</th>
                  <td style={tdStyle}>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {exp.responsabilidades.map((resp, idx) => (
                        <li key={idx} style={{ marginBottom: '5px' }}>{resp}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );

  const renderEducation = () => (
    <div>
      {data.datos_cv.formacion_academica.map((edu, index) => (
        <div key={index} style={{ marginBottom: '20px', border: '1px solid #dee2e6', borderRadius: '4px' }}>
          <div style={{ backgroundColor: '#f8f9fa', padding: '10px', fontWeight: 'bold' }}>
            {edu.titulo}
          </div>
          <table style={tableStyle}>
            <tbody>
              <tr>
                <th style={thStyle}>Institución</th>
                <td style={tdStyle}>{edu.institucion}</td>
              </tr>
              <tr>
                <th style={thStyle}>Período</th>
                <td style={tdStyle}>
                  {formatDate(edu.periodo.fecha_inicio)} - {formatDate(edu.periodo.fecha_fin)}
                </td>
              </tr>
              {edu.gpa && (
                <tr>
                  <th style={thStyle}>Detalles</th>
                  <td style={tdStyle}>{edu.gpa}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );

  const renderSkills = () => (
    <div>
      {data.datos_cv.habilidades.habilidades_tecnicas.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h4>Habilidades Técnicas</h4>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Habilidad</th>
                <th style={thStyle}>Nivel</th>
              </tr>
            </thead>
            <tbody>
              {data.datos_cv.habilidades.habilidades_tecnicas.map((skill, index) => (
                <tr key={index}>
                  <td style={tdStyle}>{skill.skill}</td>
                  <td style={tdStyle}>{skill.level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.datos_cv.habilidades.idiomas.length > 0 && (
        <div>
          <h4>Idiomas</h4>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Idioma</th>
                <th style={thStyle}>Nivel</th>
                <th style={thStyle}>Certificación</th>
              </tr>
            </thead>
            <tbody>
              {data.datos_cv.habilidades.idiomas.map((lang, index) => (
                <tr key={index}>
                  <td style={tdStyle}>{lang.idioma}</td>
                  <td style={tdStyle}>{lang.nivel}</td>
                  <td style={tdStyle}>{lang.certificacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderAdditionalTraining = () => (
    <div>
      {data.datos_cv.formacion_complementaria.certificaciones_cursos.length > 0 && (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Certificaciones y Cursos</th>
            </tr>
          </thead>
          <tbody>
            {data.datos_cv.formacion_complementaria.certificaciones_cursos.map((cert, index) => (
              <tr key={index}>
                <td style={tdStyle}>{cert}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'contacto':
        return renderContactInfo();
      case 'titular':
        return renderProfessionalTitle();
      case 'resumen':
        return renderProfessionalSummary();
      case 'experiencia':
        return renderWorkExperience();
      case 'educacion':
        return renderEducation();
      case 'habilidades':
        return renderSkills();
      case 'formacion':
        return renderAdditionalTraining();
      default:
        return renderContactInfo();
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Resultados del CV Procesado</h2>
        <button
          onClick={onReset}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Procesar Nuevo CV
        </button>
      </div>

      <div style={{
        marginBottom: '10px',
        padding: '15px',
        backgroundColor: '#d4edda',
        border: '1px solid #c3e6cb',
        borderRadius: '4px'
      }}>
        <strong>Confianza General:</strong> {(data.confianza_general * 100).toFixed(1)}% |
        <strong> Tiempo de Procesamiento:</strong> {data.tiempo_procesamiento.toFixed(2)} segundos
      </div>

      <div style={{ display: 'flex', marginBottom: '20px' }}>
        <button style={tabStyle(activeTab === 'contacto')} onClick={() => setActiveTab('contacto')}>
          Contacto
        </button>
        <button style={tabStyle(activeTab === 'titular')} onClick={() => setActiveTab('titular')}>
          Titular
        </button>
        <button style={tabStyle(activeTab === 'resumen')} onClick={() => setActiveTab('resumen')}>
          Resumen
        </button>
        <button style={tabStyle(activeTab === 'experiencia')} onClick={() => setActiveTab('experiencia')}>
          Experiencia
        </button>
        <button style={tabStyle(activeTab === 'educacion')} onClick={() => setActiveTab('educacion')}>
          Educación
        </button>
        <button style={tabStyle(activeTab === 'habilidades')} onClick={() => setActiveTab('habilidades')}>
          Habilidades
        </button>
        <button style={tabStyle(activeTab === 'formacion')} onClick={() => setActiveTab('formacion')}>
          Formación Extra
        </button>
      </div>

      <div style={{
        border: '1px solid #dee2e6',
        borderRadius: '0 4px 4px 4px',
        padding: '20px',
        backgroundColor: 'white',
        minHeight: '400px'
      }}>
        {renderContent()}
      </div>
    </div>
  );
};

export default CVResults;