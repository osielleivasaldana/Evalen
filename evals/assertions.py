"""
Eval golden assertions — contract D (Task 9)
Invariantes: email, titular, exp >= golden, habilidades_blandas list[str], proyectos sin LAYOUT, técnicas >=2
"""


def assert_extraction_golden(extracted, golden):
    """
    Valida extracción contra golden anon.

    Args:
        extracted: ResumeData (Pydantic) resultante de RobustExtractionService
        golden: dict cargado de qa_lead_15y_anon_golden.json
    """
    # 1. email exacto (PII anonimizado estable)
    assert extracted.datos_contacto.email == golden["datos_contacto"]["email"], (
        f"email mismatch: {extracted.datos_contacto.email!r} != {golden['datos_contacto']['email']!r}"
    )

    # 2. titular exacto (headline vs académico — bug 3)
    assert extracted.titular_profesional.titular == golden["titular_profesional"]["titular"], (
        f"titular mismatch: {extracted.titular_profesional.titular!r} != {golden['titular_profesional']['titular']!r}"
    )

    # 3. experiencia >= golden (no pérdida por ValidationError/merge)
    assert len(extracted.experiencia_laboral) >= len(golden["experiencia_laboral"]), (
        f"experiencia_laboral len {len(extracted.experiencia_laboral)} < golden {len(golden['experiencia_laboral'])}"
    )

    # 4. habilidades_blandas list[str] — bug 1 schema dict->str
    assert all(isinstance(s, str) for s in extracted.habilidades.habilidades_blandas), (
        f"habilidades_blandas contains non-str: {extracted.habilidades.habilidades_blandas!r}"
    )

    # 5. proyectos sin LAYOUT (anti-contaminación bug 2)
    proyectos = extracted.proyectos.proyectos if extracted.proyectos else []
    assert all("LAYOUT" not in p.nombre for p in proyectos), (
        f"proyectos contiene LAYOUT: {[p.nombre for p in proyectos]}"
    )

    # 6. técnicas >=2 (Selenium, Java mínimo)
    assert len(extracted.habilidades.habilidades_tecnicas) >= 2, (
        f"habilidades_tecnicas len {len(extracted.habilidades.habilidades_tecnicas)} < 2"
    )
