import sys
import os

# Add the project root to the python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.models.resume import ResumeData

data = {
    'datos_contacto': {
        'nombre_completo': None, 
        'telefono': None, 
        'email': None, 
        'ubicacion': None, 
        'metadata': None
    }, 
    'titular_profesional': {
        'titular': None
    }, 
    'resumen_profesional': {
        'resumen': None
    },
    'habilidades': {
        'habilidades_tecnicas': [{'skill': None}]
    }
}

try:
    resume = ResumeData(**data)
    print("SUCCESS!")
    print("Nombre:", resume.datos_contacto.nombre_completo)
    print("Email:", resume.datos_contacto.email)
    print("Titular:", resume.titular_profesional.titular)
    print("Resumen:", resume.resumen_profesional.resumen)
    print("Skill:", resume.habilidades.habilidades_tecnicas[0].skill)
except Exception as e:
    print("ERROR:")
    print(e)
