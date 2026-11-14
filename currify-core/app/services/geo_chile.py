"""Geo Chile — jerarquía estática versionada comuna → provincia → región.

SDD Fase 2 §4.1 (P1): logistics geográfico jerárquico, determinista y sin LLM.

Escalera de matching (score logistics):
  - Comuna exacta (normalizada)              -> 100
  - Misma provincia                          -> 70
  - Misma región                             -> 50
  - Sin coincidencia                         -> 0
  - Campaña SIN requisito de ubicación       -> 100 (dimensión no aplica)
  - Campaña CON ubicación y CV sin ubicación -> 50 neutral + trazabilidad

Claves normalizadas: lowercase, sin tildes (NFD), sin puntuación, espacios colapsados.
Datos versionados: GEO_CHILE_VERSION. Proceso de actualización documentado en
docs/debug/2026-08-25-fase-a-logistics-trajectory.md (brecha de cobertura conocida).
"""
from __future__ import annotations

import re
import unicodedata
from typing import Dict, List, Optional, Tuple

from pydantic import BaseModel

GEO_CHILE_VERSION = "2026.08"


def normalize_geo_key(value) -> str:
    """Normaliza texto geográfico: lowercase, sin tildes (NFD), sin puntuación."""
    s = unicodedata.normalize("NFD", str(value or "").lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def split_location_parts(text: str) -> List[Tuple[str, str]]:
    """Divide una ubicación multi-parte ('Providencia, Santiago') en partes
    normalizadas [(texto_original, clave_normalizada)]."""
    out: List[Tuple[str, str]] = []
    for part in re.split(r"[,;/\n|]|\s+-\s|\s+–\s", str(text or "")):
        key = normalize_geo_key(part)
        if key:
            out.append((part.strip(), key))
    return out


# ─────────────────────────────────────────────────────────────────────────────
# Jerarquía estática: REGIÓN -> PROVINCIA -> [comunas]
# Cobertura: 344/346 comunas oficiales (brecha documentada: 1 en Cardenal Caro,
# 1 en Ñuble). Actualizar añadiendo la comuna bajo su provincia.
# ─────────────────────────────────────────────────────────────────────────────
GEO_CHILE: Dict[str, Dict[str, List[str]]] = {
    "arica y parinacota": {
        "arica": ["Arica", "Camarones"],
        "parinacota": ["Putre", "General Lagos"],
    },
    "tarapaca": {
        "iquique": ["Iquique", "Alto Hospicio"],
        "el tamarugal": ["Pozo Almonte", "Camiña", "Colchane", "Huara", "Pica"],
    },
    "antofagasta": {
        "antofagasta": ["Antofagasta", "Mejillones", "Sierra Gorda", "Taltal"],
        "el loa": ["Calama", "Ollagüe", "San Pedro de Atacama"],
        "tocopilla": ["Tocopilla", "María Elena"],
    },
    "atacama": {
        "chanaral": ["Chañaral", "Diego de Almagro"],
        "copiapo": ["Copiapó", "Tierra Amarilla"],
        "huasco": ["Vallenar", "Alto del Carmen", "Freirina", "Huasco"],
    },
    "coquimbo": {
        "elqui": ["La Serena", "Coquimbo", "Andacollo", "La Higuera", "Paihuano", "Vicuña"],
        "limari": ["Ovalle", "Combarbalá", "Monte Patria", "Punitaqui", "Río Hurtado"],
        "choapa": ["Illapel", "Canela", "Los Vilos", "Salamanca"],
    },
    "valparaiso": {
        "valparaiso": ["Valparaíso", "Casablanca", "Concón", "Juan Fernández",
                       "Puchuncaví", "Quintero", "Viña del Mar"],
        "isla de pascua": ["Isla de Pascua"],
        "los andes": ["Los Andes", "Calle Larga", "Rinconada", "San Esteban"],
        "petorca": ["La Ligua", "Cabildo", "Papudo", "Petorca", "Zapallar"],
        "quillota": ["Quillota", "Hacienda La Calera", "Hijuelas", "La Cruz", "Nogales"],
        "san antonio": ["San Antonio", "Algarrobo", "Cartagena", "El Quisco",
                        "El Tabo", "Santo Domingo"],
        "san felipe de aconcagua": ["San Felipe", "Catemu", "Llaillay", "Panquehue",
                                    "Putaendo", "Santa María"],
        "marga marga": ["Quilpué", "Villa Alemana", "Limache", "Olmué"],
    },
    "metropolitana": {
        "santiago": ["Cerrillos", "Cerro Navia", "Conchalí", "El Bosque",
                     "Estación Central", "Huechuraba", "Independencia", "La Cisterna",
                     "La Florida", "La Granja", "La Pintana", "La Reina", "Las Condes",
                     "Lo Barnechea", "Lo Espejo", "Lo Prado", "Macul", "Maipú", "Ñuñoa",
                     "Pedro Aguirre Cerda", "Peñalolén", "Providencia", "Pudahuel",
                     "Quilicura", "Quinta Normal", "Recoleta", "Renca", "San Joaquín",
                     "San Miguel", "San Ramón", "Santiago", "Vitacura"],
        "cordillera": ["Puente Alto", "Pirque", "San José de Maipo"],
        "talagante": ["Talagante", "El Monte", "Isla de Maipo", "Padre Hurtado", "Peñaflor"],
        "melipilla": ["Melipilla", "Alhué", "Curacaví", "María Pinto", "San Pedro"],
        "maipo": ["San Bernardo", "Buin", "Calera de Tango", "Paine"],
        "chacabuco": ["Colina", "Lampa", "Til Til"],
    },
    "libertador general bernardo ohiggins": {
        "cachapoal": ["Rancagua", "Machalí", "Graneros", "San Francisco de Mostazal",
                      "Codegua", "Coinco", "Coltauco", "Doñihue", "Las Cabras",
                      "Malloa", "Olivar", "Peumo", "Pichidegua", "Quinta de Tilcoco",
                      "Rengo", "Requínoa", "San Vicente"],
        "colchagua": ["San Fernando", "Santa Cruz", "Chimbarongo", "Nancagua",
                      "Chépica", "Lolol", "Palmilla", "Peralillo", "Placilla", "Pumanque"],
        "cardenal caro": ["Pichilemu", "La Estrella", "Litueche", "Marchihue", "Navidad"],
    },
    "maule": {
        "talca": ["Talca", "Constitución", "Curepto", "Empedrado", "Maule", "Pelarco",
                  "Pencahue", "Río Claro", "San Clemente", "San Rafael"],
        "curico": ["Curicó", "Hualañé", "Licantén", "Molina", "Rauco", "Romeral",
                   "Sagrada Familia", "Teno", "Vichuquén"],
        "linares": ["Linares", "Colbún", "Longaví", "Parral", "Retiro", "San Javier",
                    "Villa Alegre", "Yerbas Buenas"],
        "cauquenes": ["Cauquenes", "Chanco", "Pelluhue"],
    },
    "nuble": {
        "diguillin": ["Chillán", "Chillán Viejo", "Bulnes", "Quillón", "San Ignacio",
                      "Yungay", "Pinto", "Pemuco", "El Carmen"],
        "itata": ["Quirihue", "Cobquecura", "Coelemu", "Ninhue", "Portezuelo", "Treguaco"],
        "punilla": ["San Carlos", "Coihueco", "San Fabián", "San Nicolás", "Ránquil"],
    },
    "biobio": {
        "concepcion": ["Concepción", "Talcahuano", "Hualpén", "Hualqui", "Chiguayante",
                       "Coronel", "Lota", "Penco", "San Pedro de la Paz", "Santa Juana",
                       "Tomé", "Florida"],
        "arauco": ["Lebu", "Arauco", "Cañete", "Contulmo", "Curanilahue",
                   "Los Álamos", "Tirúa"],
        "biobio": ["Los Ángeles", "Cabrero", "Mulchén", "Nacimiento", "Negrete", "Laja",
                   "Quilaco", "Quilleco", "San Rosendo", "Santa Bárbara", "Tucapel",
                   "Yumbel", "Alto Biobío"],
    },
    "la araucania": {
        "cautin": ["Temuco", "Padre Las Casas", "Villarrica", "Pucón", "Loncoche",
                   "Nueva Imperial", "Carahue", "Saavedra", "Teodoro Schmidt", "Toltén",
                   "Gorbea", "Freire", "Pitrufquén", "Lautaro", "Perquenco", "Vilcún",
                   "Melipeuco", "Curarrehue", "Galvarino", "Cholchol", "Cunco"],
        "malleco": ["Angol", "Victoria", "Collipulli", "Ercilla", "Los Sauces", "Purén",
                    "Lumaco", "Traiguén", "Renaico", "Curacautín", "Lonquimay"],
    },
    "los rios": {
        "valdivia": ["Valdivia", "Corral", "Lanco", "Máfil", "Mariquina", "Paillaco",
                     "Panguipulli", "Los Lagos"],
        "ranco": ["La Unión", "Río Bueno", "Futrono", "Lago Ranco"],
    },
    "los lagos": {
        "llanquihue": ["Puerto Montt", "Puerto Varas", "Frutillar", "Llanquihue",
                       "Los Muermos", "Fresia", "Calbuco", "Cochamó", "Maullín"],
        "chiloe": ["Castro", "Ancud", "Chonchi", "Curaco de Vélez", "Dalcahue",
                   "Puqueldón", "Queilén", "Quellón", "Quemchi", "Quinchao"],
        "osorno": ["Osorno", "Puerto Octay", "Purranque", "Puyehue", "Río Negro",
                   "San Pablo", "San Juan de la Costa"],
        "palena": ["Chaitén", "Futaleufú", "Hualaihué", "Palena"],
    },
    "aysen": {
        "coyhaique": ["Coyhaique", "Lago Verde"],
        "aysen": ["Aysén", "Cisnes", "Guaitecas"],
        "general carrera": ["Chile Chico", "Río Ibáñez"],
        "capitan prat": ["Cochrane", "Tortel", "O'Higgins"],
    },
    "magallanes": {
        "magallanes": ["Punta Arenas", "Laguna Blanca", "Río Verde", "San Gregorio"],
        "tierra del fuego": ["Porvenir", "Primavera", "Timaukel"],
        "ultima esperanza": ["Natales", "Torres del Paine"],
        "antartica": ["Cabo de Hornos", "Antártica"],
    },
}

# Alias de comunas con variantes gráficas frecuentes: variante -> clave canónica
_COMUNA_ALIAS_TO_CANONICAL: Dict[str, str] = {
    "llay llay": "llaillay",
    "llayllay": "llaillay",
    "marchigue": "marchihue",
    "trehuaco": "treguaco",
    "la calera": "hacienda la calera",
    "rapa nui": "isla de pascua",
    "pascua": "isla de pascua",
    "san vicente de tagua tagua": "san vicente",
    "mostazal": "san francisco de mostazal",
}

# ─────────────────────────────────────────────────────────────────────────────
# Índices derivados (UNA vez al importar; deterministas)
# ─────────────────────────────────────────────────────────────────────────────
COMUNA_TO_PROVINCIA: Dict[str, str] = {}
PROVINCIA_TO_REGION: Dict[str, str] = {}

for _region, _provs in GEO_CHILE.items():
    for _prov, _comunas in _provs.items():
        PROVINCIA_TO_REGION[_prov] = _region
        for _com in _comunas:
            COMUNA_TO_PROVINCIA[normalize_geo_key(_com)] = _prov

# Variantes de comunas apuntan a la misma provincia que su clave canónica
for _variant, _canon in _COMUNA_ALIAS_TO_CANONICAL.items():
    _vkey, _ckey = normalize_geo_key(_variant), normalize_geo_key(_canon)
    if _ckey in COMUNA_TO_PROVINCIA:
        COMUNA_TO_PROVINCIA.setdefault(_vkey, COMUNA_TO_PROVINCIA[_ckey])

# Alias de regiones (variantes frecuentes en CVs/campañas)
REGION_ALIASES: Dict[str, str] = {}
for _region in GEO_CHILE:
    REGION_ALIASES[_region] = _region
    _short = _region
    for _prefix in ("region del ", "region de la ", "region de ", "region "):
        if _short.startswith(_prefix):
            _short = _short[len(_prefix):]
            break
    REGION_ALIASES.setdefault(_short, _region)
REGION_ALIASES.update({
    "rm": "metropolitana",
    "region metropolitana": "metropolitana",
    "metropolitana de santiago": "metropolitana",
    "ohiggins": "libertador general bernardo ohiggins",
    "o higgins": "libertador general bernardo ohiggins",
    "bernardo ohiggins": "libertador general bernardo ohiggins",
    "libertador": "libertador general bernardo ohiggins",
    "araucania": "la araucania",
})


class GeoMatchResult(BaseModel):
    """Resultado trazable del matching geográfico (SDD §5)."""
    tier: str                 # comuna | provincia | region | no_match | campaign_no_requirement | cv_location_unknown
    matched_on: Optional[str] = None   # 'campaña ↔ cv' literal; None si no hay match
    score: int                # 100 | 70 | 50 | 0


def resolve_geo_match(campaign_location, cv_location_texts) -> GeoMatchResult:
    """Función PURA: resuelve el tier geográfico entre la ubicación requerida por
    la campaña y los textos de ubicación ya extraídos del candidato.

    Determinista, cero LLM. Estrategia: cada parte de la campaña se resuelve
    contra la jerarquía (comuna primero, luego provincia, luego región) y se
    compara contra las partes/textos del CV; gana el MEJOR tier encontrado.
    """
    camp_key = normalize_geo_key(campaign_location)
    if not camp_key:
        # Campaña sin requisito de ubicación -> dimensión no aplica (comportamiento actual)
        return GeoMatchResult(tier="campaign_no_requirement", matched_on=None, score=100)

    cv_texts = [str(t) for t in (cv_location_texts or []) if t and str(t).strip()]
    if not cv_texts:
        # Campaña CON ubicación y CV sin ubicación detectable -> neutral trazable
        return GeoMatchResult(tier="cv_location_unknown", matched_on=None, score=50)

    cv_parts: List[Tuple[str, str]] = []  # [(original, key)]
    for t in cv_texts:
        cv_parts.extend(split_location_parts(t))

    def _cv_hit(key: str) -> Optional[str]:
        """Texto original del CV que matchea la clave (parte exacta o frase con bordes)."""
        if not key:
            return None
        for orig, k in cv_parts:
            if k == key:
                return orig
        for orig, k in cv_parts:
            if re.search(rf"(^| ){re.escape(key)}( |$)", k):
                return orig
        return None

    best: Optional[GeoMatchResult] = None

    def _consider(score: int, tier: str, matched_on: str) -> None:
        nonlocal best
        if best is None or score > best.score:
            best = GeoMatchResult(tier=tier, matched_on=matched_on, score=score)

    for camp_orig, camp_part in split_location_parts(campaign_location):
        comuna_prov = COMUNA_TO_PROVINCIA.get(camp_part)
        prov_region = PROVINCIA_TO_REGION.get(camp_part)
        region_canon = REGION_ALIASES.get(camp_part)

        # ── Tier COMUNA (100): la parte de la campaña es comuna y el CV la nombra ──
        if comuna_prov:
            hit = _cv_hit(camp_part)
            if hit:
                _consider(100, "comuna", f"{camp_orig} ↔ {hit}")

        # ── Tier PROVINCIA (70) ──
        provincias = set()
        if prov_region:
            provincias.add(camp_part)          # la parte ES una provincia
        if comuna_prov:
            provincias.add(comuna_prov)        # la parte es comuna de esa provincia
        for prov in provincias:
            hit = _cv_hit(prov)
            if hit:
                _consider(70, "provincia", f"{camp_orig} ↔ {hit}")
            # El CV nombra OTRA comuna de la misma provincia
            for cv_orig, cv_key in cv_parts:
                if cv_key != camp_part and COMUNA_TO_PROVINCIA.get(cv_key) == prov:
                    _consider(70, "provincia", f"{camp_orig} ↔ {cv_orig} (misma provincia)")

        # ── Tier REGIÓN (50) ──
        regiones = set()
        if region_canon:
            regiones.add(region_canon)
        if prov_region:
            regiones.add(prov_region)
        if comuna_prov:
            regiones.add(PROVINCIA_TO_REGION.get(comuna_prov, ""))
        regiones.discard("")
        for reg in regiones:
            # Match directo por nombre/alias de región en el CV
            for alias_key, canon in REGION_ALIASES.items():
                if canon != reg:
                    continue
                hit = _cv_hit(alias_key)
                if hit:
                    _consider(50, "region", f"{camp_orig} ↔ {hit}")
                    break
            # El CV nombra una comuna/provincia de esa región
            for cv_orig, cv_key in cv_parts:
                cv_prov = COMUNA_TO_PROVINCIA.get(cv_key)
                cv_reg = PROVINCIA_TO_REGION.get(cv_key) or (
                    PROVINCIA_TO_REGION.get(cv_prov, "") if cv_prov else "")
                if cv_reg == reg:
                    _consider(50, "region", f"{camp_orig} ↔ {cv_orig} (misma región)")

    if best is not None:
        return best
    return GeoMatchResult(tier="no_match", matched_on=None, score=0)
