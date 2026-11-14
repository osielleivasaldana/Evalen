import { findKeyFinding } from './findKeyFinding';

const MARTA_SUMMARY =
  'La candidata presenta una base académica excepcionalmente sólida y directamente alineada con los requisitos del puesto en laboratorio clínico y banco de sangre. Su experiencia inicial como Tecnóloga Médica, asumiendo responsabilidades en bacteriología, demuestra un compromiso y capacidad para el rol. Aunque su trayectoria profesional es aún incipiente, su formación y el interés en la mejora continua la posicionan como una candidata con un gran potencial de desarrollo y adaptación a las necesidades del puesto.';

const MARTA_EDUCATION_REASONING =
  "La formación académica de la candidata es una 'Licenciatura en Tecnología médica, mención laboratorio clínico, hematología y banco de sangre', lo cual representa una alineación excepcional y directa con el perfil del puesto. Esta titulación proporciona una base teórica y práctica integral en todas las áreas fundamentales del laboratorio clínico y banco de sangre, siendo un pilar fundamental para el rol.";

const LOGAN_SUMMARY =
  'El candidato posee una trayectoria profesional robusta en roles de alta dirección y gestión financiera, complementada con una sólida formación académica en administración de empresas y auditoría. Demuestra fuertes habilidades de liderazgo, comunicación y una clara orientación al desarrollo de negocios. Sin embargo, su perfil carece por completo de la experiencia y las habilidades técnicas especializadas en laboratorio clínico y banco de sangre que son fundamentales para el puesto. Su experiencia y educación se encuentran en un dominio profesional diferente, lo que representa una brecha significativa para la posición.';

const LOGAN_SKILLS_REASONING =
  'El candidato no demuestra ninguna de las habilidades técnicas específicas requeridas para el puesto, las cuales están centradas en laboratorio clínico, banco de sangre, análisis de muestras, hematología, microbiología e inmunología. Su perfil de habilidades se enfoca en gestión, finanzas y administración de negocios, lo que resulta en una falta total de alineación con las competencias técnicas esenciales para la posición.';

describe('findKeyFinding', () => {
  test('no subraya cuando el score es 0 y el razonamiento es elogioso (contradicción del LLM)', () => {
    const result = findKeyFinding(MARTA_SUMMARY, MARTA_EDUCATION_REASONING, 0);
    expect(result).toBeNull();
  });

  test('subraya la oración con marcador negativo del peor criterio (caso LOGAN)', () => {
    const result = findKeyFinding(LOGAN_SUMMARY, LOGAN_SKILLS_REASONING, 0);
    expect(result).not.toBeNull();
    expect(result).toContain('carece por completo');
  });

  test('mantiene el comportamiento actual para puntajes altos (sin restricción de marcadores)', () => {
    const summary =
      'El candidato tiene una sólida formación y experiencia en TI, especialmente en QA y testing. Sin embargo, carece de experiencia en el stack tecnológico principal requerido para el puesto. Se recomienda evaluar su capacidad de aprendizaje y adaptación a estas tecnologías.';
    const reasoning =
      'La sólida formación en ingeniería informática, la experiencia en QA y testing, y el dominio de automatización se alinean con los requisitos del puesto.';
    const result = findKeyFinding(summary, reasoning, 70);
    expect(result).not.toBeNull();
    expect(result).toContain('sólida formación');
  });
});
