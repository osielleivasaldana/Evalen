import io
import logging
import re
from typing import Dict, Optional, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

class FileParserService:
    """Servicio para extraer texto de diferentes tipos de archivos"""

    def __init__(self):
        self.supported_formats = ['.pdf', '.docx', '.doc', '.txt', '.rtf']

    def parse_file(self, file_content: bytes, filename: str) -> Dict[str, any]:
        """
        Extrae texto de un archivo basado en su extensión

        Args:
            file_content: Contenido del archivo en bytes
            filename: Nombre del archivo con extensión

        Returns:
            Dict con texto extraído y metadatos
        """
        try:
            file_extension = Path(filename).suffix.lower()

            if file_extension not in self.supported_formats:
                raise ValueError(f"Formato de archivo no soportado: {file_extension}")

            if file_extension == '.pdf':
                return self._parse_pdf(file_content, filename)
            elif file_extension in ['.docx', '.doc']:
                return self._parse_word(file_content, filename)
            elif file_extension == '.txt':
                return self._parse_text(file_content, filename)
            elif file_extension == '.rtf':
                return self._parse_rtf(file_content, filename)
            else:
                raise ValueError(f"Parser no implementado para: {file_extension}")

        except Exception as e:
            logger.error(f"Error parsing file {filename}: {str(e)}")
            return {
                "success": False,
                "text": "",
                "error": str(e),
                "metadata": {
                    "filename": filename,
                    "file_type": file_extension,
                    "parsing_method": "error"
                }
            }

    def _parse_pdf(self, file_content: bytes, filename: str) -> Dict[str, any]:
        """Extrae texto de archivos PDF"""
        try:
            import PyPDF2
            from io import BytesIO

            pdf_reader = PyPDF2.PdfReader(BytesIO(file_content))
            text_parts = []

            for page_num, page in enumerate(pdf_reader.pages):
                try:
                    page_text = page.extract_text()
                    if page_text.strip():
                        text_parts.append(page_text)
                except Exception as e:
                    logger.warning(f"Error extracting text from page {page_num + 1}: {e}")
                    continue

            extracted_text = "\n\n".join(text_parts)

            # Fallback: si PyPDF2 no extrae bien, intentar con pdfplumber
            if not extracted_text.strip() or len(extracted_text) < 100:
                try:
                    import pdfplumber
                    with pdfplumber.open(BytesIO(file_content)) as pdf:
                        text_parts = []
                        for page in pdf.pages:
                            page_text = page.extract_text()
                            if page_text:
                                text_parts.append(page_text)
                        extracted_text = "\n\n".join(text_parts)
                except ImportError:
                    logger.warning("pdfplumber not available for fallback PDF parsing")

            cleaned_text = self._clean_extracted_text(extracted_text)

            return {
                "success": True,
                "text": cleaned_text,
                "metadata": {
                    "filename": filename,
                    "file_type": "pdf",
                    "pages_count": len(pdf_reader.pages),
                    "parsing_method": "PyPDF2",
                    "text_length": len(cleaned_text),
                    "has_text": len(cleaned_text.strip()) > 0
                }
            }

        except ImportError:
            return self._handle_missing_dependency("PyPDF2", filename, "pdf")
        except Exception as e:
            logger.error(f"Error parsing PDF {filename}: {e}")
            return self._create_error_response(filename, "pdf", str(e))

    def _parse_word(self, file_content: bytes, filename: str) -> Dict[str, any]:
        """Extrae texto de archivos Word (.docx, .doc)"""
        try:
            import docx
            from io import BytesIO

            doc = docx.Document(BytesIO(file_content))
            text_parts = []

            # Extraer texto de párrafos
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    text_parts.append(paragraph.text)

            # Extraer texto de tablas
            for table in doc.tables:
                for row in table.rows:
                    row_text = []
                    for cell in row.cells:
                        if cell.text.strip():
                            row_text.append(cell.text.strip())
                    if row_text:
                        text_parts.append(" | ".join(row_text))

            extracted_text = "\n".join(text_parts)
            cleaned_text = self._clean_extracted_text(extracted_text)

            return {
                "success": True,
                "text": cleaned_text,
                "metadata": {
                    "filename": filename,
                    "file_type": "docx",
                    "paragraphs_count": len(doc.paragraphs),
                    "tables_count": len(doc.tables),
                    "parsing_method": "python-docx",
                    "text_length": len(cleaned_text),
                    "has_text": len(cleaned_text.strip()) > 0
                }
            }

        except ImportError:
            return self._handle_missing_dependency("python-docx", filename, "docx")
        except Exception as e:
            logger.error(f"Error parsing Word document {filename}: {e}")
            return self._create_error_response(filename, "docx", str(e))

    def _parse_text(self, file_content: bytes, filename: str) -> Dict[str, any]:
        """Extrae texto de archivos de texto plano"""
        try:
            # Intentar diferentes encodings
            encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']

            for encoding in encodings:
                try:
                    extracted_text = file_content.decode(encoding)
                    cleaned_text = self._clean_extracted_text(extracted_text)

                    return {
                        "success": True,
                        "text": cleaned_text,
                        "metadata": {
                            "filename": filename,
                            "file_type": "txt",
                            "encoding": encoding,
                            "parsing_method": "direct_decode",
                            "text_length": len(cleaned_text),
                            "has_text": len(cleaned_text.strip()) > 0
                        }
                    }
                except UnicodeDecodeError:
                    continue

            # Si ningún encoding funciona
            return self._create_error_response(filename, "txt", "No se pudo decodificar el archivo con encodings comunes")

        except Exception as e:
            logger.error(f"Error parsing text file {filename}: {e}")
            return self._create_error_response(filename, "txt", str(e))

    def _parse_rtf(self, file_content: bytes, filename: str) -> Dict[str, any]:
        """Extrae texto de archivos RTF"""
        try:
            from striprtf.striprtf import rtf_to_text

            # Decodificar el contenido RTF
            rtf_content = file_content.decode('utf-8', errors='ignore')
            extracted_text = rtf_to_text(rtf_content)
            cleaned_text = self._clean_extracted_text(extracted_text)

            return {
                "success": True,
                "text": cleaned_text,
                "metadata": {
                    "filename": filename,
                    "file_type": "rtf",
                    "parsing_method": "striprtf",
                    "text_length": len(cleaned_text),
                    "has_text": len(cleaned_text.strip()) > 0
                }
            }

        except ImportError:
            return self._handle_missing_dependency("striprtf", filename, "rtf")
        except Exception as e:
            logger.error(f"Error parsing RTF file {filename}: {e}")
            return self._create_error_response(filename, "rtf", str(e))

    def _clean_extracted_text(self, text: str) -> str:
        """Limpia el texto extraído eliminando caracteres problemáticos"""
        if not text:
            return ""

        # Eliminar caracteres de control excepto saltos de línea y tabs
        cleaned = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)

        # Normalizar espacios en blanco
        cleaned = re.sub(r'\n\s*\n\s*\n', '\n\n', cleaned)  # Máximo 2 saltos de línea seguidos
        cleaned = re.sub(r'[ \t]+', ' ', cleaned)  # Espacios múltiples a uno solo
        cleaned = re.sub(r'[ \t]*\n[ \t]*', '\n', cleaned)  # Limpiar espacios alrededor de saltos de línea

        # Eliminar líneas que solo contienen caracteres especiales
        lines = cleaned.split('\n')
        clean_lines = []
        for line in lines:
            # Mantener líneas que tengan al menos 2 caracteres alfanuméricos
            if len(re.findall(r'[a-zA-Z0-9]', line)) >= 2:
                clean_lines.append(line.strip())
            elif line.strip() == "":  # Mantener líneas vacías para separación
                clean_lines.append("")

        # Reconstruir texto
        result = '\n'.join(clean_lines)

        # Eliminar exceso de líneas vacías al inicio y final
        result = result.strip()

        return result

    def _handle_missing_dependency(self, dependency: str, filename: str, file_type: str) -> Dict[str, any]:
        """Maneja errores de dependencias faltantes"""
        error_msg = f"Dependencia faltante: {dependency}. Instalar con: pip install {dependency}"
        logger.error(error_msg)

        return {
            "success": False,
            "text": "",
            "error": error_msg,
            "metadata": {
                "filename": filename,
                "file_type": file_type,
                "parsing_method": "failed_missing_dependency",
                "missing_dependency": dependency
            }
        }

    def _create_error_response(self, filename: str, file_type: str, error: str) -> Dict[str, any]:
        """Crea una respuesta de error estándar"""
        return {
            "success": False,
            "text": "",
            "error": error,
            "metadata": {
                "filename": filename,
                "file_type": file_type,
                "parsing_method": "error"
            }
        }

    def validate_file(self, file_content: bytes, filename: str) -> Dict[str, any]:
        """
        Valida si un archivo es válido para procesamiento

        Returns:
            Dict con resultado de validación
        """
        file_extension = Path(filename).suffix.lower()
        file_size = len(file_content)

        # Validaciones básicas
        validations = {
            "is_supported_format": file_extension in self.supported_formats,
            "has_content": file_size > 0,
            "size_reasonable": 100 <= file_size <= 50 * 1024 * 1024,  # 100B a 50MB
            "filename_valid": self._is_filename_valid(filename)
        }

        is_valid = all(validations.values())

        issues = []
        if not validations["is_supported_format"]:
            issues.append(f"Formato no soportado: {file_extension}")
        if not validations["has_content"]:
            issues.append("El archivo está vacío")
        if not validations["size_reasonable"]:
            if file_size < 100:
                issues.append("El archivo es demasiado pequeño")
            else:
                issues.append("El archivo es demasiado grande (>50MB)")
        if not validations["filename_valid"]:
            issues.append("El nombre del archivo contiene caracteres no válidos")

        return {
            "is_valid": is_valid,
            "validations": validations,
            "issues": issues,
            "file_info": {
                "filename": filename,
                "extension": file_extension,
                "size_bytes": file_size,
                "size_mb": round(file_size / (1024 * 1024), 2)
            }
        }

    def _is_filename_valid(self, filename: str) -> bool:
        """
        Valida que el nombre del archivo sea seguro
        Permite caracteres unicode, espacios, y caracteres especiales comunes
        """
        if not filename or len(filename) == 0:
            return False

        # Verificar longitud razonable
        if len(filename) > 255:
            return False

        # Caracteres prohibidos en sistemas de archivos (más restrictivo en Windows)
        forbidden_chars = ['<', '>', ':', '"', '|', '?', '*']

        # Verificar que no contenga caracteres prohibidos
        for char in forbidden_chars:
            if char in filename:
                return False

        # Verificar que no sea solo puntos
        if filename.strip('.') == '':
            return False

        # Verificar que tenga una extensión válida
        file_extension = Path(filename).suffix.lower()
        if not file_extension:
            return False

        return True