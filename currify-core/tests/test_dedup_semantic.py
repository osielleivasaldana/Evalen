from app.services.file_parser_service import FileParserService

def test_whitespace_normalization():
    svc = FileParserService()
    raw = "Aumenté la cobertura\nAumentélacobertura"
    cleaned = svc._clean_extracted_text(raw)
    # Should normalize and dedup pegado sin espacios
    assert cleaned.count("Aumenté") >= 1
    assert "Aumentélacobertura" not in cleaned or cleaned.count("Aumenté") == 1
