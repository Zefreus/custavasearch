#!/usr/bin/env python3
"""
Backend Test Suite for Custava Search Password Recovery
Testing the password recovery endpoints as specified in the review request.
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://custava-search.preview.emergentagent.com"
TEST_EMAIL = "zefreus@gmail.com"
INVALID_TOKEN = "invalid_token_12345"

def log_test(test_name, status, details=""):
    """Log test results with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    status_symbol = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"[{timestamp}] {status_symbol} {test_name}: {status}")
    if details:
        print(f"    Details: {details}")
    print()

def test_forgot_password_valid_email():
    """Test POST /api/auth/forgot-password with valid email"""
    try:
        url = f"{BASE_URL}/api/auth/forgot-password"
        payload = {"email": TEST_EMAIL}
        
        print(f"🔄 Testing: POST {url}")
        print(f"📧 Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, timeout=30)
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📄 Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") is True:
                log_test("POST /api/auth/forgot-password (valid email)", "PASS", 
                        f"Email sent successfully: {data.get('message', '')}")
                return True
            else:
                log_test("POST /api/auth/forgot-password (valid email)", "FAIL", 
                        f"Success flag not true: {data}")
                return False
        else:
            log_test("POST /api/auth/forgot-password (valid email)", "FAIL", 
                    f"Expected 200, got {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("POST /api/auth/forgot-password (valid email)", "FAIL", f"Exception: {str(e)}")
        return False

def test_forgot_password_invalid_email():
    """Test POST /api/auth/forgot-password with non-existent email"""
    try:
        url = f"{BASE_URL}/api/auth/forgot-password"
        payload = {"email": "nonexistent@example.com"}
        
        print(f"🔄 Testing: POST {url}")
        print(f"📧 Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, timeout=30)
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📄 Response: {response.text}")
        
        # Should return 200 for security (not revealing if email exists)
        if response.status_code == 200:
            data = response.json()
            if data.get("success") is True:
                log_test("POST /api/auth/forgot-password (invalid email)", "PASS", 
                        "Returns 200 for security (doesn't reveal if email exists)")
                return True
            else:
                log_test("POST /api/auth/forgot-password (invalid email)", "FAIL", 
                        f"Success flag not true: {data}")
                return False
        else:
            log_test("POST /api/auth/forgot-password (invalid email)", "FAIL", 
                    f"Expected 200, got {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("POST /api/auth/forgot-password (invalid email)", "FAIL", f"Exception: {str(e)}")
        return False

def test_forgot_password_missing_email():
    """Test POST /api/auth/forgot-password with missing email"""
    try:
        url = f"{BASE_URL}/api/auth/forgot-password"
        payload = {}
        
        print(f"🔄 Testing: POST {url}")
        print(f"📧 Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, timeout=30)
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📄 Response: {response.text}")
        
        if response.status_code == 400:
            data = response.json()
            if "error" in data and "obrigatório" in data["error"].lower():
                log_test("POST /api/auth/forgot-password (missing email)", "PASS", 
                        f"Correctly returns 400: {data['error']}")
                return True
            else:
                log_test("POST /api/auth/forgot-password (missing email)", "FAIL", 
                        f"Wrong error message: {data}")
                return False
        else:
            log_test("POST /api/auth/forgot-password (missing email)", "FAIL", 
                    f"Expected 400, got {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("POST /api/auth/forgot-password (missing email)", "FAIL", f"Exception: {str(e)}")
        return False

def test_validate_reset_token_invalid():
    """Test GET /api/auth/validate-reset-token with invalid token"""
    try:
        url = f"{BASE_URL}/api/auth/validate-reset-token?token={INVALID_TOKEN}"
        
        print(f"🔄 Testing: GET {url}")
        
        response = requests.get(url, timeout=30)
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📄 Response: {response.text}")
        
        if response.status_code == 400:
            data = response.json()
            if "error" in data and ("inválido" in data["error"].lower() or "expirado" in data["error"].lower()):
                log_test("GET /api/auth/validate-reset-token (invalid token)", "PASS", 
                        f"Correctly returns 400: {data['error']}")
                return True
            else:
                log_test("GET /api/auth/validate-reset-token (invalid token)", "FAIL", 
                        f"Wrong error message: {data}")
                return False
        else:
            log_test("GET /api/auth/validate-reset-token (invalid token)", "FAIL", 
                    f"Expected 400, got {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("GET /api/auth/validate-reset-token (invalid token)", "FAIL", f"Exception: {str(e)}")
        return False

def test_validate_reset_token_missing():
    """Test GET /api/auth/validate-reset-token with missing token"""
    try:
        url = f"{BASE_URL}/api/auth/validate-reset-token"
        
        print(f"🔄 Testing: GET {url}")
        
        response = requests.get(url, timeout=30)
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📄 Response: {response.text}")
        
        if response.status_code == 400:
            data = response.json()
            if "error" in data and ("fornecido" in data["error"].lower() or "token" in data["error"].lower()):
                log_test("GET /api/auth/validate-reset-token (missing token)", "PASS", 
                        f"Correctly returns 400: {data['error']}")
                return True
            else:
                log_test("GET /api/auth/validate-reset-token (missing token)", "FAIL", 
                        f"Wrong error message: {data}")
                return False
        else:
            log_test("GET /api/auth/validate-reset-token (missing token)", "FAIL", 
                    f"Expected 400, got {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("GET /api/auth/validate-reset-token (missing token)", "FAIL", f"Exception: {str(e)}")
        return False

def test_reset_password_invalid_token():
    """Test POST /api/auth/reset-password with invalid token"""
    try:
        url = f"{BASE_URL}/api/auth/reset-password"
        payload = {
            "token": INVALID_TOKEN,
            "password": "nova_senha_123"
        }
        
        print(f"🔄 Testing: POST {url}")
        print(f"📧 Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, timeout=30)
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📄 Response: {response.text}")
        
        if response.status_code == 400:
            data = response.json()
            if "error" in data and ("inválido" in data["error"].lower() or "expirado" in data["error"].lower()):
                log_test("POST /api/auth/reset-password (invalid token)", "PASS", 
                        f"Correctly returns 400: {data['error']}")
                return True
            else:
                log_test("POST /api/auth/reset-password (invalid token)", "FAIL", 
                        f"Wrong error message: {data}")
                return False
        else:
            log_test("POST /api/auth/reset-password (invalid token)", "FAIL", 
                    f"Expected 400, got {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("POST /api/auth/reset-password (invalid token)", "FAIL", f"Exception: {str(e)}")
        return False

def test_reset_password_missing_fields():
    """Test POST /api/auth/reset-password with missing fields"""
    try:
        # Test missing token
        url = f"{BASE_URL}/api/auth/reset-password"
        payload = {"password": "nova_senha_123"}
        
        print(f"🔄 Testing: POST {url} (missing token)")
        print(f"📧 Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, timeout=30)
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📄 Response: {response.text}")
        
        if response.status_code == 400:
            data = response.json()
            if "error" in data and "obrigatório" in data["error"].lower():
                log_test("POST /api/auth/reset-password (missing token)", "PASS", 
                        f"Correctly returns 400: {data['error']}")
            else:
                log_test("POST /api/auth/reset-password (missing token)", "FAIL", 
                        f"Wrong error message: {data}")
                return False
        else:
            log_test("POST /api/auth/reset-password (missing token)", "FAIL", 
                    f"Expected 400, got {response.status_code}: {response.text}")
            return False
        
        # Test missing password
        payload = {"token": INVALID_TOKEN}
        
        print(f"🔄 Testing: POST {url} (missing password)")
        print(f"📧 Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, timeout=30)
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📄 Response: {response.text}")
        
        if response.status_code == 400:
            data = response.json()
            if "error" in data and "obrigatório" in data["error"].lower():
                log_test("POST /api/auth/reset-password (missing password)", "PASS", 
                        f"Correctly returns 400: {data['error']}")
                return True
            else:
                log_test("POST /api/auth/reset-password (missing password)", "FAIL", 
                        f"Wrong error message: {data}")
                return False
        else:
            log_test("POST /api/auth/reset-password (missing password)", "FAIL", 
                    f"Expected 400, got {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("POST /api/auth/reset-password (missing fields)", "FAIL", f"Exception: {str(e)}")
        return False

def test_reset_password_short_password():
    """Test POST /api/auth/reset-password with short password"""
    try:
        url = f"{BASE_URL}/api/auth/reset-password"
        payload = {
            "token": INVALID_TOKEN,
            "password": "123"  # Less than 6 characters
        }
        
        print(f"🔄 Testing: POST {url}")
        print(f"📧 Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, timeout=30)
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📄 Response: {response.text}")
        
        if response.status_code == 400:
            data = response.json()
            if "error" in data and ("6 caracteres" in data["error"] or "pelo menos" in data["error"].lower()):
                log_test("POST /api/auth/reset-password (short password)", "PASS", 
                        f"Correctly returns 400: {data['error']}")
                return True
            else:
                log_test("POST /api/auth/reset-password (short password)", "FAIL", 
                        f"Wrong error message: {data}")
                return False
        else:
            log_test("POST /api/auth/reset-password (short password)", "FAIL", 
                    f"Expected 400, got {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        log_test("POST /api/auth/reset-password (short password)", "FAIL", f"Exception: {str(e)}")
        return False

def main():
    """Run all password recovery tests"""
    print("=" * 80)
    print("🧪 CUSTAVA SEARCH - PASSWORD RECOVERY ENDPOINT TESTS")
    print("=" * 80)
    print(f"🌐 Base URL: {BASE_URL}")
    print(f"📧 Test Email: {TEST_EMAIL}")
    print(f"🕒 Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    print()
    
    # Track test results
    tests_passed = 0
    tests_failed = 0
    
    # Test cases
    test_cases = [
        ("Forgot Password - Valid Email", test_forgot_password_valid_email),
        ("Forgot Password - Invalid Email", test_forgot_password_invalid_email),
        ("Forgot Password - Missing Email", test_forgot_password_missing_email),
        ("Validate Token - Invalid Token", test_validate_reset_token_invalid),
        ("Validate Token - Missing Token", test_validate_reset_token_missing),
        ("Reset Password - Invalid Token", test_reset_password_invalid_token),
        ("Reset Password - Missing Fields", test_reset_password_missing_fields),
        ("Reset Password - Short Password", test_reset_password_short_password),
    ]
    
    for test_name, test_func in test_cases:
        print(f"🚀 Running: {test_name}")
        print("-" * 60)
        
        try:
            if test_func():
                tests_passed += 1
            else:
                tests_failed += 1
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
            tests_failed += 1
        
        print("-" * 60)
        print()
        
        # Small delay between tests
        time.sleep(1)
    
    # Final summary
    print("=" * 80)
    print("📊 TEST SUMMARY")
    print("=" * 80)
    print(f"✅ Tests Passed: {tests_passed}")
    print(f"❌ Tests Failed: {tests_failed}")
    print(f"📈 Success Rate: {(tests_passed / (tests_passed + tests_failed) * 100):.1f}%")
    print(f"🕒 Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    
    # Return appropriate exit code
    if tests_failed > 0:
        print("\n⚠️  Some tests failed. Check the details above.")
        return 1
    else:
        print("\n🎉 All tests passed successfully!")
        return 0

if __name__ == "__main__":
    sys.exit(main())