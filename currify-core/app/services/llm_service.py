import json
import logging
import time
from typing import Optional, Dict, Any, List
from app.core.config import settings

# Import providers conditionally
try:
    import anthropic
except ImportError:
    anthropic = None

try:
    import openai
except ImportError:
    openai = None

try:
    import google.generativeai as genai
except ImportError:
    genai = None

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.provider = settings.llm_provider.lower()
        self.api_key = settings.current_api_key

        if not self.api_key:
            raise ValueError(f"API key is required for provider: {self.provider}")

        self.client = None
        self._initialize_client()

    def _initialize_client(self):
        """Initialize the appropriate client based on provider"""
        import instructor
        
        if self.provider == "anthropic":
            if not anthropic:
                raise ImportError("anthropic package not installed. Run: pip install anthropic")
                
            # Initialize standard client then patch with instructor
            raw_client = anthropic.Anthropic(api_key=self.api_key)
            self.client = instructor.from_anthropic(raw_client)

        elif self.provider == "openai":
            if not openai:
                raise ImportError("openai package not installed. Run: pip install openai")
            
            # Initialize standard client then patch with instructor
            raw_client = openai.OpenAI(api_key=self.api_key)
            self.client = instructor.from_openai(raw_client)

        elif self.provider == "google":
            if not genai:
                raise ImportError("google-generativeai package not installed. Run: pip install google-generativeai")
            genai.configure(api_key=self.api_key)
            # Google GenerativeAI not yet fully supported by instructor in this pattern, keeping legacy
            self.client = genai.GenerativeModel(settings.current_model)

        elif self.provider == "groq":
            if not openai:
                raise ImportError("openai package not installed. Run: pip install openai")
            # Groq uses OpenAI-compatible API
            raw_client = openai.OpenAI(
                api_key=self.api_key,
                base_url="https://api.groq.com/openai/v1"
            )
            self.client = instructor.from_openai(raw_client)

        else:
            raise ValueError(f"Unsupported LLM provider: {self.provider}")
    
    async def call_agent_structured(
        self, 
        prompt: str, 
        input_data: str, 
        response_model: Any,
        stage_name: str = "structured_extraction"
    ) -> Optional[Any]:
        """
        Call LLM with native Structured Output validation via Instructor.
        Returns an instance of response_model (Pydantic model).
        """
        try:
            logger.info(f"[{stage_name}] Calling {self.provider.upper()} with Structured Output...")
            
            # Prepare messages
            messages = [
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Here is the data to process:\n\n{input_data}"}
            ]
            
            # Execute with instructor
            # Note: Instructor handles retries/validation internally
            if self.provider == "google":
                # Fallback for Google (not fully instructor-compatible yet in this setup)
                # For now we use the text-based extraction for Google
                logger.warning(f"[{stage_name}] Google provider does not support native instructor yet. Falling back to text.")
                result_dict = await self.call_agent(prompt, input_data, stage_name)
                
                # FIX: Handle List results from call_agent
                if result_dict:
                    final_data = result_dict
                    if isinstance(result_dict, list):
                        logger.info(f"[{stage_name}] Received List instead of Dict. Attempting to unwrap/wrap...")
                        if len(result_dict) == 0:
                            # Empty list, valid but empty
                            final_data = {}
                        elif len(result_dict) == 1 and isinstance(result_dict[0], dict):
                             # Case 1: Single item list -> Unwrap
                             final_data = result_dict[0]
                             logger.info(f"[{stage_name}] Unwrapped single-item list.")
                        elif len(result_dict) > 0 and isinstance(result_dict[0], dict):
                             # Case 2: Complex List -> Heuristic Wrapping
                             # Check for specific keys to identify the type of list
                             first_keys = result_dict[0].keys()
                             if any(k in first_keys for k in ['cargo', 'empresa', 'responsabilidades', 'start_date', 'fecha_inicio']):
                                 logger.info(f"[{stage_name}] List identified as Work Experience. Wrapping...")
                                 final_data = {"experiencia_laboral": result_dict}
                             elif any(k in first_keys for k in ['titulo', 'institucion', 'grado', 'university']):
                                  logger.info(f"[{stage_name}] List identified as Education. Wrapping...")
                                  final_data = {"formacion_academica": result_dict}
                             elif any(k in first_keys for k in ['skill', 'level', 'habilidad']):
                                  logger.info(f"[{stage_name}] List identified as Technical Skills. Wrapping...")
                                  final_data = {"habilidades": {"habilidades_tecnicas": result_dict}}
                             else:
                                  logger.warning(f"[{stage_name}] Received complex List with unknown structure. Keys: {list(first_keys)}. Returning None.")
                                  return None
                    
                    try:
                        return response_model(**final_data)
                    except Exception as e:
                        logger.error(f"[{stage_name}] Failed to instantiate Pydantic model from data: {e}")
                        # Last ditch effort: Try to return it if it's a dict, maybe caller can handle partial? 
                        # No, caller expects RESPONSE_MODEL instance.
                        return None
                return None
            
            response = self.client.chat.completions.create(
                model=settings.current_model,
                response_model=response_model,
                messages=messages,
                max_retries=3,
                temperature=0.0,
                max_tokens=2000 # Increased for chunks
            )
            
            logger.info(f"[{stage_name}] Successfully received structured response.")
            return response
            
        except Exception as e:
            logger.error(f"[{stage_name}] Structured extraction failed: {e}")
            return None

    async def call_agent(self, prompt: str, input_data: str, stage_name: str, temperature: float = 0.0) -> Optional[Any]:
        """Call LLM API with improved JSON extraction and retry logic (Legacy/Fallback)"""
        max_retries = 2

        for attempt in range(max_retries):
            try:
                start_time = time.time()
                logger.info(f"[{stage_name}] Calling {self.provider.upper()} API (attempt {attempt + 1}/{max_retries})...")

                # Enhanced prompt with JSON instruction adapted for different providers
                if self.provider == "groq":
                    enhanced_prompt = f"""{prompt}

<datos_de_entrada>
{input_data}
</datos_de_entrada>

CRITICAL: Response must be ONLY valid JSON. No explanations, no markdown, no code blocks.
Start directly with {{ or [. End with }} or ]. JSON only."""
                else:
                    enhanced_prompt = f"""{prompt}

<datos_de_entrada>
{input_data}
</datos_de_entrada>

IMPORTANTE: Tu salida debe contener SOLO un bloque de código en formato JSON válido.
No expliques nada fuera del bloque. No agregues texto extra."""
                
                # Handling raw calls when client is wrapped by instructor
                if hasattr(self.client, 'chat'): # Instructor wrapped client
                     response_text = await self._call_provider_api_raw(enhanced_prompt, temperature)
                elif self.provider == "google":
                     response_text = await self._call_provider_api(enhanced_prompt, temperature)
                else:
                     response_text = await self._call_provider_api(enhanced_prompt, temperature)

                elapsed = time.time() - start_time
                logger.info(f"[{stage_name}] {self.provider.upper()} response received in {elapsed:.2f}s")

                if not response_text:
                    logger.error(f"[{stage_name}] Empty response from {self.provider}")
                    continue

                parsed_json = self._extract_json_from_response(response_text, stage_name)

                if parsed_json is not None:
                    logger.info(f"[{stage_name}] Successfully parsed JSON response on attempt {attempt + 1}")
                    return parsed_json
                else:
                    logger.warning(f"[{stage_name}] Failed to parse JSON on attempt {attempt + 1}")
                    if attempt < max_retries - 1:
                        logger.info(f"[{stage_name}] Retrying with more explicit JSON instruction...")
                        continue

            except Exception as e:
                logger.error(f"[{stage_name}] {self.provider.upper()} API error on attempt {attempt + 1}: {e}")
                if attempt == max_retries - 1:
                    return None

        logger.error(f"[{stage_name}] All attempts failed")
        return None

    async def _call_provider_api_raw(self, prompt: str, temperature: float) -> Optional[str]:
        """
        Bypass instructor to make a raw text completion call.
        MANDATORY: Uses a fresh, unpatched client instance to avoid Instructor validation errors.
        """
        try:
             messages = [{"role": "user", "content": prompt}]
             
             if self.provider == "anthropic":
                 # Create a FRESH, UNPATCHED client instance
                 import anthropic
                 raw_client = anthropic.Anthropic(api_key=self.api_key)
                 
                 response = raw_client.messages.create(
                     model=settings.current_model,
                     max_tokens=settings.max_tokens,
                     temperature=temperature,
                     messages=messages,
                     timeout=settings.timeout_seconds
                 )
                 return response.content[0].text.strip()

             elif self.provider in ["openai", "groq"]:
                 # Create a FRESH, UNPATCHED client instance
                 import openai
                 
                 client_kwargs = {"api_key": self.api_key}
                 if self.provider == "groq":
                     client_kwargs["base_url"] = "https://api.groq.com/openai/v1"
                     
                 raw_client = openai.OpenAI(**client_kwargs)
                 
                 response = raw_client.chat.completions.create(
                     model=settings.current_model,
                     messages=messages,
                     temperature=temperature,
                     max_tokens=settings.max_tokens,
                     timeout=settings.timeout_seconds
                 )
                 return response.choices[0].message.content.strip()

             return None
             
        except Exception as e:
             logger.error(f"Raw API call failed: {e}")
             return None

    async def _call_provider_api(self, prompt: str, temperature: float) -> Optional[str]:
        """Call the specific provider API"""
        if self.provider == "anthropic":
            return await self._call_anthropic_api(prompt, temperature)
        elif self.provider == "openai":
            return await self._call_openai_api(prompt, temperature)
        elif self.provider == "google":
            return await self._call_google_api(prompt, temperature)
        elif self.provider == "groq":
            return await self._call_groq_api(prompt, temperature)
        return None

    async def _call_anthropic_api(self, prompt: str, temperature: float) -> Optional[str]:
        """Call Anthropic Claude API"""
        # Since we patched with instructor, we use standard create but without response_model for raw text
        # Instructor's create wrapper handles standard calls if response_model is missing
        response = self.client.messages.create(
            model=settings.current_model,
            max_tokens=settings.max_tokens,
            temperature=temperature,
            messages=[{
                "role": "user",
                "content": prompt
            }],
            timeout=settings.timeout_seconds
        )

        if not response.content or not response.content[0].text:
            return None
        return response.content[0].text.strip()

    async def _call_openai_api(self, prompt: str, temperature: float) -> Optional[str]:
        """Call OpenAI GPT API"""
        response = self.client.chat.completions.create(
            model=settings.current_model,
            max_tokens=settings.max_tokens,
            temperature=temperature,
            messages=[{
                "role": "user",
                "content": prompt
            }],
            timeout=settings.timeout_seconds
        )

        if not response.choices or not response.choices[0].message.content:
            return None
        return response.choices[0].message.content.strip()

    async def _call_google_api(self, prompt: str, temperature: float) -> Optional[str]:
        """Call Google Gemini API"""
        generation_config = genai.types.GenerationConfig(
            max_output_tokens=settings.max_tokens,
            temperature=temperature,
            response_mime_type="application/json"
        )

        response = self.client.generate_content(
            prompt,
            generation_config=generation_config
        )

        if not response.text:
            return None
        return response.text.strip()

    async def _call_groq_api(self, prompt: str, temperature: float) -> Optional[str]:
        """Call Groq API (OpenAI-compatible)"""
        response = self.client.chat.completions.create(
            model=settings.current_model,
            max_tokens=settings.max_tokens,
            temperature=temperature,
            messages=[{
                "role": "user",
                "content": prompt
            }],
            timeout=settings.timeout_seconds
        )

        if not response.choices or not response.choices[0].message.content:
            return None
        return response.choices[0].message.content.strip()
    
    def _extract_json_from_response(self, response_text: str, stage: str = "unknown") -> Optional[Any]:
        """DEFINITIVE JSON extraction - handles all LLM response formats"""
        if not isinstance(response_text, str):
            logger.error(f"STAGE {stage}: Expected string, received {type(response_text)}")
            return None

        clean_text = response_text.strip()
        logger.info(f"STAGE {stage}: Processing response of length {len(clean_text)}")
        logger.info(f"STAGE {stage}: Response preview: {clean_text[:500]}...")

        # STRATEGY 1: Direct JSON parsing (for pure JSON responses)
        if (clean_text.startswith('{') and clean_text.endswith('}')) or \
           (clean_text.startswith('[') and clean_text.endswith(']')):
            try:
                parsed = json.loads(clean_text)
                if isinstance(parsed, (dict, list)):
                    logger.info(f"STAGE {stage}: Direct JSON parsing successful")
                    return parsed
            except json.JSONDecodeError as e:
                logger.warning(f"STAGE {stage}: Direct parsing failed: {e}")
                logger.warning(f"STAGE {stage}: Problematic JSON preview: {clean_text[:200]}...")
        
        # STRATEGY 2: Extract from code blocks (common in Groq/GPT responses)
        import re
        code_patterns = [
            r'```json\s*([\s\S]*?)\s*```',
            r'```\s*([\s\S]*?)\s*```',
            r'`([\s\S]*?)`'
        ]

        for i, pattern in enumerate(code_patterns):
            matches = re.findall(pattern, clean_text, re.DOTALL | re.MULTILINE)
            logger.info(f"STAGE {stage}: Code block pattern {i+1} found {len(matches)} matches")
            for match in matches:
                candidate = match.strip()
                logger.info(f"STAGE {stage}: Trying code block candidate: {candidate[:100]}...")
                if (candidate.startswith('{') and candidate.endswith('}')) or \
                   (candidate.startswith('[') and candidate.endswith(']')):
                    try:
                        parsed = json.loads(candidate)
                        if isinstance(parsed, (dict, list)):
                            logger.info(f"STAGE {stage}: Code block extraction successful")
                            return parsed
                    except json.JSONDecodeError as e:
                        logger.warning(f"STAGE {stage}: Code block parsing failed: {e}")
                        continue

        # If it's a list request (Semantic Service), searching for {} blocks won't work well
        # Let's try to find [] blocks specifically
        if '[' in clean_text:
             bracket_matches = []
             start_positions = [i for i, char in enumerate(clean_text) if char == '[']
             
             for start_pos in start_positions:
                bracket_count = 0
                for i in range(start_pos, len(clean_text)):
                    if clean_text[i] == '[':
                        bracket_count += 1
                    elif clean_text[i] == ']':
                        bracket_count -= 1
                        if bracket_count == 0:
                            candidate = clean_text[start_pos:i+1]
                            if len(candidate) > 10:
                                try:
                                    parsed = json.loads(candidate)
                                    if isinstance(parsed, list):
                                        logger.info(f"STAGE {stage}: List [] block extraction successful")
                                        return parsed
                                except: pass
                            break

        # STRATEGY 2.5: Look for JSON in text with explanations (Groq/GPT style)
        # First try to extract inicial data from truncated response
        extracted_titular = None
        if clean_text.startswith('{'):
            try:
                import re
                # Multiple patterns to catch titular_profesional
                patterns = [
                    r'"titular_profesional"\s*:\s*\{\s*"titular"\s*:\s*"([^"]+)"',
                    r'"titular_profesional":\s*\{\s*"titular":\s*"([^"]+)"',
                    r'"titular":\s*"([^"]+)".*"titular_profesional"',
                    r'"titular_profesional"[^}]+?"titular"[^:]*:\s*"([^"]+)"',
                    # Add pattern for direct titular in response
                    r'"titular"\s*:\s*"([^"]+)"',
                    # Pattern for when titular appears before other fields
                    r'"titular":\s*"([^"]+)"'
                ]

                for pattern in patterns:
                    titular_match = re.search(pattern, clean_text, re.DOTALL)
                    if titular_match:
                        extracted_titular = titular_match.group(1).strip()
                        if extracted_titular and extracted_titular not in ['No extraído', 'null', 'None']:
                            logger.info(f"STAGE {stage}: Found titular in initial response with pattern: '{extracted_titular}'")
                            # Add as a fake JSON candidate for reconstruction
                            clean_text = clean_text + f'\n{{"titular": "{extracted_titular}"}}'
                            break

            except Exception as e:
                logger.warning(f"STAGE {stage}: Error extracting titular from initial response: {e}")

        # Improved regex to handle deeply nested JSON structures
        json_matches = []

        # Method 1: Find all potential JSON blocks by brace matching
        start_positions = []
        for i, char in enumerate(clean_text):
            if char == '{':
                start_positions.append(i)

        for start_pos in start_positions:
            brace_count = 0
            end_pos = start_pos

            for i in range(start_pos, len(clean_text)):
                if clean_text[i] == '{':
                    brace_count += 1
                elif clean_text[i] == ']': # Wait, this logic is for {} matching. 
                    # If we find ']', it shouldn't affect brace_count for '{}', unless nesting is weird.
                    # But original code had only brace counting for objects.
                    pass 
                elif clean_text[i] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end_pos = i + 1
                        candidate = clean_text[start_pos:end_pos]
                        if len(candidate) > 50:  # Only consider substantial JSON objects
                            json_matches.append(candidate)
                        break

        logger.info(f"STAGE {stage}: Found {len(json_matches)} potential JSON objects in text")

        # Sort candidates by size (larger ones likely more complete)
        json_matches.sort(key=len, reverse=True)

        # STRATEGY 2.6: Try to reconstruct complete JSON from fragments FIRST
        if len(json_matches) > 10:  # If we have many small JSONs, try to reconstruct
            logger.info(f"STAGE {stage}: Many fragments detected ({len(json_matches)}), attempting reconstruction FIRST")
            reconstructed = self._attempt_json_reconstruction(json_matches, stage)
            if reconstructed:
                logger.info(f"STAGE {stage}: Using reconstructed JSON - contains expected structure")
                return reconstructed

        for i, json_candidate in enumerate(json_matches):
            logger.info(f"STAGE {stage}: Trying JSON candidate {i+1} (size: {len(json_candidate)}): {json_candidate[:100]}...")
            try:
                parsed = json.loads(json_candidate.strip())
                if isinstance(parsed, dict) and len(parsed) > 1:  # Must have some meaningful content
                    logger.info(f"STAGE {stage}: JSON-in-text extraction successful")
                    
                    # PRIORITY: Prefer JSON with expected structure
                    expected_keys = ['datos_contacto', 'experiencia_laboral', 'formacion_academica']
                    has_expected_structure = any(key in parsed for key in expected_keys)

                    if has_expected_structure:
                        logger.info(f"STAGE {stage}: JSON has expected structure - using this one")
                        return parsed
                    elif len(json_candidate) > 2000:  # Large JSON likely contains all data
                        logger.info(f"STAGE {stage}: Large JSON found ({len(json_candidate)} chars) - likely complete")
                        if not hasattr(self, '_large_json') or len(json_candidate) > len(getattr(self, '_large_json_text', '')):
                            self._large_json = parsed
                            self._large_json_text = json_candidate
                            logger.info(f"STAGE {stage}: Stored large JSON as primary candidate")
                    elif i == len(json_matches) - 1:  # Last candidate
                        # Check if we have a large JSON stored
                        if hasattr(self, '_large_json'):
                            logger.info(f"STAGE {stage}: Using large JSON candidate")
                            large_json = self._large_json
                            delattr(self, '_large_json')
                            if hasattr(self, '_large_json_text'):
                                delattr(self, '_large_json_text')
                            return large_json
                        else:
                            logger.info(f"STAGE {stage}: Using last valid candidate")
                            return parsed
                    else:
                        logger.info(f"STAGE {stage}: JSON valid but no expected structure - continuing search")
                        # Store this as backup but continue looking for better structure
                        if not hasattr(self, '_backup_json'):
                            self._backup_json = parsed

            except json.JSONDecodeError as e:
                logger.warning(f"STAGE {stage}: JSON candidate {i+1} parsing failed: {e}")
                continue

        # If we reach here and have stored JSON, use the best available
        if hasattr(self, '_large_json'):
            return self._large_json
        elif hasattr(self, '_backup_json'):
            return self._backup_json

        # STRATEGY 3: Smart brace matching with content cleaning
        first_brace = clean_text.find('{')
        if first_brace != -1:
            try:
                brace_count = 0
                end_pos = first_brace

                for i, char in enumerate(clean_text[first_brace:], first_brace):
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            end_pos = i + 1
                            break

                # Si llegamos al final sin cerrar todas las llaves, buscar el último }
                if brace_count > 0:
                    logger.warning(f"STAGE {stage}: JSON incompleto, intentando reparar")
                    # Para JSON truncado, usar desde la primera llave hasta el final del texto
                    candidate_json = clean_text[first_brace:]

                    # Intentar reparación agresiva para respuestas truncadas
                    repaired_json = self._repair_truncated_json(candidate_json, stage)

                    if repaired_json:
                        try:
                            parsed = json.loads(repaired_json)
                            if isinstance(parsed, dict):
                                logger.info(f"STAGE {stage}: Truncated JSON repair successful")
                                return parsed
                        except json.JSONDecodeError as e:
                            logger.error(f"STAGE {stage}: Truncated JSON repair failed: {e}")
                else:
                    candidate_json = clean_text[first_brace:end_pos]

                # Para JSON completo (brace_count == 0)
                if brace_count == 0:
                    candidate_json = self._clean_json_content(candidate_json)

                    try:
                        parsed = json.loads(candidate_json)
                        if isinstance(parsed, dict):
                            logger.info(f"STAGE {stage}: Smart brace matching successful")
                            return parsed
                    except json.JSONDecodeError:
                        # Attempt JSON repair
                        fixed_json = self._attempt_json_repair(candidate_json)
                        if fixed_json:
                            try:
                                parsed = json.loads(fixed_json)
                                if isinstance(parsed, dict):
                                    return parsed
                            except: pass
                
            except Exception as e:
                logger.debug(f"STAGE {stage}: Brace matching failed: {e}")
        
        logger.error(f"STAGE {stage}: All JSON extraction strategies failed")
        logger.error(f"STAGE {stage}: Response preview: {clean_text[:200]}...")
        return None
    
    def _clean_json_content(self, json_str: str) -> str:
        """Clean JSON content of common formatting issues"""
        lines = json_str.split('\n')
        cleaned_lines = []
        
        for line in lines:
            stripped = line.strip()
            if stripped:
                cleaned_lines.append(stripped)
        
        return '\n'.join(cleaned_lines)

    def _repair_truncated_json(self, json_str: str, stage: str) -> Optional[str]:
        """Repair aggressively truncated JSON responses"""
        try:
            import re

            logger.info(f"STAGE {stage}: _repair_truncated_json called with {len(json_str)} chars")
            logger.debug(f"STAGE {stage}: Input content check - has metadata: {'metadata' in json_str}, has dots: {'...' in json_str}")

            # Detectar si el JSON fue truncado en "metadata": ...
            if '"metadata":' in json_str and '...' in json_str:
                logger.info(f"STAGE {stage}: Detected metadata truncation, attempting repair")

                # Estrategias múltiples de reparación para metadata truncado
                repaired = json_str

                # 1. Reemplazar "metadata": ... con "metadata": null
                metadata_patterns = [
                    r'"metadata"\s*:\s*\.\.\.',
                    r'"metadata"\s*:\s*\.\.\.\s*',
                    r'"metadata"\s*:\s*\.\.\.[^}]*',
                ]

                for pattern in metadata_patterns:
                    if re.search(pattern, repaired):
                        repaired = re.sub(pattern, '"metadata": null', repaired)
                        logger.debug(f"STAGE {stage}: Applied metadata pattern: {pattern}")
                        break

                # 2. Limpiar cualquier texto adicional después de ...
                repaired = re.sub(r'\.\.\.[^}]*$', '', repaired)

                # 3. Asegurar que el JSON termine correctamente
                if not repaired.strip().endswith('}'):
                    # Contar llaves abiertas vs cerradas
                    open_braces = repaired.count('{')
                    close_braces = repaired.count('}')
                    missing_braces = open_braces - close_braces

                    if missing_braces > 0:
                        repaired += '}' * missing_braces

                # 4. Limpiar comas finales antes de cerrar
                repaired = re.sub(r',(\s*})', r'\1', repaired)

                logger.debug(f"STAGE {stage}: Repaired JSON preview: {repaired[:200]}...")
                return repaired

            # Detectar truncación general (cualquier patrón que sugiera truncación)
            truncation_indicators = [
                '",', '":"', '": "', '":', '...', '"metadata":', '"metadata": ...', 'metadata": ...',
                # Detectar strings no terminados o truncación en medio de contenido
                re.search(r'"[^"]*$', json_str.strip()),  # String que no cierra
                len(json_str.strip()) > 100 and not json_str.strip().endswith('}')  # JSON largo sin cerrar
            ]

            if any(json_str.strip().endswith(pattern) if isinstance(pattern, str) else pattern for pattern in truncation_indicators):
                logger.info(f"STAGE {stage}: Detected general truncation, attempting repair")

                repaired = json_str.strip()

                # STRATEGY 1: Terminar strings no cerrados y arreglar sintaxis
                if re.search(r'"[^"]*$', repaired):
                    logger.info(f"STAGE {stage}: Detected unterminated string, closing it")
                    # Cerrar el string no terminado
                    repaired = re.sub(r'"([^"]*)$', r'"\1"', repaired)

                    # Asegurar que después del string cerrado hay una coma o cierre de objeto
                    # Si el string cerrado no termina con coma, } o ], agregamos coma
                    if not re.search(r'[,}\]]$', repaired.strip()):
                        repaired = repaired.rstrip() + ','
                        logger.info(f"STAGE {stage}: Added comma after closed string")

                # STRATEGY 2: Manejar casos específicos de metadata truncada
                if '"metadata":' in repaired:
                    repaired = re.sub(r'"metadata"\s*:\s*[^,}]*$', '"metadata": null', repaired)
                    repaired = re.sub(r'"metadata"\s*:\s*\.\.\.[^,}]*', '"metadata": null', repaired)

                # STRATEGY 3: Limpiar patrones de truncación comunes
                repaired = re.sub(r'\.\.\.[^}]*$', '', repaired)
                repaired = re.sub(r':\s*$', ': null', repaired)
                repaired = re.sub(r',$', '', repaired)

                # STRATEGY 4: Cerrar estructuras abiertas
                open_braces = repaired.count('{')
                close_braces = repaired.count('}')
                open_brackets = repaired.count('[')
                close_brackets = repaired.count(']')

                repaired += ']' * (open_brackets - close_brackets)
                repaired += '}' * (open_braces - close_braces)

                # STRATEGY 5: Limpiar comas finales antes de cerrar
                repaired = re.sub(r',(\s*[}\]])', r'\1', repaired)

                logger.debug(f"STAGE {stage}: General truncation repair preview: {repaired[:200]}...")
                return repaired

            return json_str

        except Exception as e:
            logger.debug(f"STAGE {stage}: Truncated JSON repair error: {e}")
            return None

    def _attempt_json_repair(self, json_str: str) -> Optional[str]:
        """Attempt to repair common JSON formatting issues"""
        try:
            import re
            repaired = json_str

            # Remove trailing commas before closing braces/brackets
            repaired = re.sub(r',(\s*[}\]])', r'\1', repaired)

            # Ensure proper comma placement between objects
            repaired = re.sub(r'(["\d}])\s*\n\s*(["\[{])', r'\1,\n\2', repaired)

            return repaired
        except Exception:
            return None

    def _attempt_json_reconstruction(self, json_candidates: List[str], stage: str) -> Optional[Dict[Any, Any]]:
        """Attempt to reconstruct a complete JSON from fragments"""
        try:
            logger.info(f"STAGE {stage}: Starting JSON reconstruction from {len(json_candidates)} candidates")

            # Parse all candidates and categorize them
            contact_data = {}
            experience_items = []
            education_items = []
            skills_data = {"habilidades_tecnicas": [], "idiomas": [], "habilidades_blandas": []}
            title_data = {}
            summary_data = {}
            complementary_data = {"certificaciones_cursos": []}

            # No need for special processing here anymore since we inject the titular as a JSON fragment

            for i, candidate in enumerate(json_candidates):
                try:
                    parsed = json.loads(candidate.strip())
                    if not isinstance(parsed, dict):
                        continue

                    keys = list(parsed.keys())
                    logger.info(f"STAGE {stage}: Fragment {i+1} keys: {keys}")

                    # Log titular specifically for debugging
                    if 'titular' in keys:
                        titular_value = parsed.get('titular')
                        logger.info(f"STAGE {stage}: Fragment {i+1} has 'titular': '{titular_value}'")
                        if titular_value and titular_value not in ['No extraído', 'null', 'None']:
                            logger.info(f"STAGE {stage}: ⭐ FOUND VALID TITULAR in fragment {i+1}: '{titular_value}'")
                    if 'titular_profesional' in keys:
                        titular_prof = parsed.get('titular_profesional')
                        logger.info(f"STAGE {stage}: Fragment {i+1} has 'titular_profesional': {titular_prof}")
                        if isinstance(titular_prof, dict) and titular_prof.get('titular'):
                            titular_value = titular_prof.get('titular')
                            if titular_value and titular_value not in ['No extraído', 'null', 'None']:
                                logger.info(f"STAGE {stage}: ⭐ FOUND VALID TITULAR_PROFESIONAL in fragment {i+1}: '{titular_value}'")

                    # Categorize based on content
                    if 'nombre_completo' in keys or 'telefono' in keys or 'email' in keys:
                        # Contact data fragment
                        logger.info(f"STAGE {stage}: Found contact fragment with keys: {keys}, data: {parsed}")
                        for key in ['nombre_completo', 'telefono', 'email', 'ubicacion']:
                            if key in parsed and parsed[key]:
                                value = str(parsed[key]).strip()
                                # More permissive email validation
                                if key == 'email':
                                    logger.info(f"STAGE {stage}: Evaluating email: '{value}'")
                                    if value and '@' in value and 'no-extraido' not in value.lower():
                                        contact_data[key] = parsed[key]
                                        logger.info(f"STAGE {stage}: Email accepted: {parsed[key]}")
                                    else:
                                        logger.info(f"STAGE {stage}: Email rejected: {value}")
                                # Standard validation for other fields
                                elif value and value not in ['null', 'None', 'No extraído']:
                                    contact_data[key] = parsed[key]
                                    logger.info(f"STAGE {stage}: {key} accepted: {parsed[key]}")

                    # Check if this might be a complete JSON with contact data nested
                    elif 'datos_contacto' in keys:
                        logger.info(f"STAGE {stage}: Found nested contact data: {parsed['datos_contacto']}")
                        nested_contact = parsed['datos_contacto']
                        if isinstance(nested_contact, dict):
                            for key in ['nombre_completo', 'telefono', 'email', 'ubicacion']:
                                if key in nested_contact and nested_contact[key]:
                                    value = str(nested_contact[key]).strip()
                                    if key == 'email':
                                        if value and '@' in value and 'no-extraido' not in value.lower():
                                            contact_data[key] = nested_contact[key]
                                            logger.info(f"STAGE {stage}: Nested email accepted: {nested_contact[key]}")
                                    elif value and value not in ['null', 'None', 'No extraído']:
                                        contact_data[key] = nested_contact[key]
                                        logger.info(f"STAGE {stage}: Nested {key} accepted: {nested_contact[key]}")

                        # Check for titular_profesional and formacion_complementaria in complete JSON
                        if 'titular_profesional' in parsed:
                            logger.info(f"STAGE {stage}: Found titular_profesional: {parsed['titular_profesional']}")
                            if isinstance(parsed['titular_profesional'], dict) and parsed['titular_profesional'].get('titular'):
                                titular_value = parsed['titular_profesional']['titular']
                                if titular_value and str(titular_value).strip() not in ['null', 'None', 'No extraído']:
                                    title_data.update(parsed['titular_profesional'])
                                    logger.info(f"STAGE {stage}: Titular profesional accepted: {parsed['titular_profesional']}")
                                else:
                                    logger.info(f"STAGE {stage}: Titular profesional rejected (empty/default): {titular_value}")
                            else:
                                logger.info(f"STAGE {stage}: Titular profesional malformed: {parsed['titular_profesional']}")

                        if 'formacion_complementaria' in parsed:
                            logger.info(f"STAGE {stage}: Found formacion_complementaria: {parsed['formacion_complementaria']}")
                            if isinstance(parsed['formacion_complementaria'], dict):
                                comp_data = parsed['formacion_complementaria']
                                if 'certificaciones_cursos' in comp_data and isinstance(comp_data['certificaciones_cursos'], list):
                                    complementary_data['certificaciones_cursos'].extend(comp_data['certificaciones_cursos'])
                                    logger.info(f"STAGE {stage}: Formacion complementaria accepted: {comp_data['certificaciones_cursos']}")

                    # Check for standalone titular_profesional fragment
                    elif 'titular' in keys:
                        logger.info(f"STAGE {stage}: Found titular fragment: {parsed}")
                        titular_value = parsed.get('titular')
                        if titular_value and str(titular_value).strip() not in ['null', 'None', 'No extraído', '']:
                            # Only update if we don't have a better title already
                            if not title_data or not title_data.get('titular') or title_data.get('titular') in ['No extraído', 'null', 'None']:
                                title_data.update(parsed)
                                logger.info(f"STAGE {stage}: Standalone titular accepted: {parsed}")
                            else:
                                logger.info(f"STAGE {stage}: Standalone titular skipped (already have better): current={title_data.get('titular')}, candidate={titular_value}")
                        else:
                            logger.info(f"STAGE {stage}: Standalone titular rejected (empty/default): {titular_value}")

                    # Check for standalone formacion_complementaria fragment
                    elif 'certificaciones_cursos' in keys:
                        logger.info(f"STAGE {stage}: Found certificaciones fragment: {parsed}")
                        if isinstance(parsed.get('certificaciones_cursos'), list):
                            complementary_data['certificaciones_cursos'].extend(parsed['certificaciones_cursos'])
                            logger.info(f"STAGE {stage}: Standalone certificaciones accepted: {parsed['certificaciones_cursos']}")

                    elif 'cargo' in keys and 'empresa' in keys:
                        # Experience fragment
                        experience_items.append(parsed)

                    elif 'titulo' in keys and 'institucion' in keys:
                        # Education fragment
                        education_items.append(parsed)

                    elif 'skill' in keys:
                        # Skills fragment
                        skills_data["habilidades_tecnicas"].append({
                            "skill": parsed.get("skill"),
                            "level": parsed.get("level", "No especificado"),
                            "years_experience": parsed.get("years_experience")
                        })

                    elif 'titular' in keys:
                        # Title fragment
                        title_data.update(parsed)

                    elif 'resumen' in keys:
                        # Summary fragment
                        summary_data.update(parsed)

                except json.JSONDecodeError:
                    continue

            # Reconstruct complete JSON
            reconstructed = {
                "datos_contacto": contact_data if contact_data else {
                    "nombre_completo": "No extraído",
                    "telefono": None,
                    "email": "no-extraido@example.com",
                    "ubicacion": None
                },
                "titular_profesional": title_data if title_data else {"titular": "No extraído"},
                "resumen_profesional": summary_data if summary_data else {"resumen": "No extraído"},
                "experiencia_laboral": experience_items,
                "formacion_academica": education_items,
                "habilidades": skills_data,
                "formacion_complementaria": complementary_data if complementary_data.get('certificaciones_cursos') else {"certificaciones_cursos": []},
                "reconocimientos": {"logros_premios": []}
            }

            # Only return if we got some meaningful data
            meaningful_data = (
                len(experience_items) > 0 or
                len(education_items) > 0 or
                len(skills_data["habilidades_tecnicas"]) > 0 or
                (contact_data and any(v for v in contact_data.values() if v and str(v).strip() not in ['null', 'None']))
            )

            # Log the contact data being reconstructed for debugging
            if contact_data:
                logger.info(f"STAGE {stage}: Reconstructed contact data: {contact_data}")

            # Log titular_profesional data for debugging
            logger.info(f"STAGE {stage}: Final title_data before reconstruction: {title_data}")
            logger.info(f"STAGE {stage}: Title_data empty check: {not title_data}")
            logger.info(f"STAGE {stage}: Will use titular_profesional: {title_data if title_data else {'titular': 'No extraído'}}")

            if meaningful_data:
                logger.info(f"STAGE {stage}: JSON reconstruction successful - {len(experience_items)} exp, {len(education_items)} edu, {len(skills_data['habilidades_tecnicas'])} skills")
                return reconstructed
            else:
                logger.info(f"STAGE {stage}: JSON reconstruction failed - no meaningful data found")
                return None

        except Exception as e:
            logger.error(f"STAGE {stage}: JSON reconstruction error: {e}")
            return None


# Aliases for backward compatibility
AnthropicService = LLMService  # Legacy name
AIService = LLMService  # Alternative name