"""Tests de defensa UTF-8 mojibake (firma CP850: ÔÇó/├®)."""


def test_fix_mojibake_cp850_roundtrip():
    from app.utils.encoding import fix_mojibake
    assert fix_mojibake("ÔÇó Estrat├®gicas: Gesti├│n de Stakeholders") == "• Estratégicas: Gestión de Stakeholders"


def test_fix_mojibake_limpio_no_altera():
    from app.utils.encoding import fix_mojibake
    assert fix_mojibake("Gestión de RRHH • Liderazgo") == "Gestión de RRHH • Liderazgo"


def test_fix_mojibake_recursive():
    from app.utils.encoding import fix_mojibake_recursive
    data = {"otros_antecedentes": ["ÔÇó Estrat├®gicas: Gesti├│n"], "habilidades": {"habilidades_blandas": ["Liderazg├│"]}}
    fixed = fix_mojibake_recursive(data)
    assert fixed["otros_antecedentes"][0].startswith("• Estratégicas")
    assert fixed["habilidades"]["habilidades_blandas"][0] == "Liderazgó"


def test_ensure_utf8_bytes():
    from app.utils.encoding import ensure_utf8_bytes_decode
    assert ensure_utf8_bytes_decode("texto ñoño".encode('utf-8')) == "texto ñoño"
