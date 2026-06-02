#!/usr/bin/env python3
from datetime import datetime, timedelta
from jose import jwt

# Configuration - matching the default from settings
SECRET_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30"

def create_test_token():
    """Create a test JWT token"""
    payload = {
        "user_id": "test-user",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

if __name__ == "__main__":
    token = create_test_token()
    print(token)