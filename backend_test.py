#!/usr/bin/env python3
"""
Backend OCR API Testing Script
Tests the new backend OCR endpoint and basic integration
"""

import io
import json
import time
import requests
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

# Backend URL from supervisor configuration
BACKEND_URL = "https://quiztime-2.preview.emergentagent.com"

def create_test_pdf():
    """Create a simple PDF with 'Hello OCR' text for testing"""
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    
    # Add large, clear text
    p.setFont("Helvetica", 24)
    p.drawString(100, 700, "Hello OCR")
    p.drawString(100, 650, "This is a test PDF")
    p.drawString(100, 600, "for OCR testing")
    
    p.showPage()
    p.save()
    buffer.seek(0)
    return buffer

def test_healthz():
    """Test 1: Call GET /api/healthz and assert 200 and ok:true"""
    print("=" * 60)
    print("TEST 1: Health Check Endpoint")
    print("=" * 60)
    
    url = f"{BACKEND_URL}/api/healthz"
    print(f"Testing URL: {url}")
    
    start_time = time.time()
    try:
        response = requests.get(url, timeout=10)
        end_time = time.time()
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {(end_time - start_time)*1000:.2f}ms")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"Response JSON: {data}")
                
                if data.get('ok') is True:
                    print("✅ PASS: Health check returned 200 with ok:true")
                    return True
                else:
                    print(f"❌ FAIL: Expected ok:true, got {data}")
                    return False
            except json.JSONDecodeError as e:
                print(f"❌ FAIL: Invalid JSON response: {e}")
                return False
        else:
            print(f"❌ FAIL: Expected status 200, got {response.status_code}")
            print(f"Response text: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        end_time = time.time()
        print(f"❌ FAIL: Request failed after {(end_time - start_time)*1000:.2f}ms")
        print(f"Error: {e}")
        return False

def test_ocr_pdf():
    """Test 2: Create a PDF with 'Hello OCR' and send to POST /api/ocr/pdf"""
    print("\n" + "=" * 60)
    print("TEST 2: OCR PDF Endpoint")
    print("=" * 60)
    
    url = f"{BACKEND_URL}/api/ocr/pdf"
    print(f"Testing URL: {url}")
    
    # Create test PDF
    print("Creating test PDF with 'Hello OCR' text...")
    pdf_buffer = create_test_pdf()
    
    # Prepare multipart form data
    files = {
        'file': ('test.pdf', pdf_buffer, 'application/pdf')
    }
    data = {
        'max_pages': '1',
        'scale': '1.6'
    }
    
    start_time = time.time()
    try:
        response = requests.post(url, files=files, data=data, timeout=30)
        end_time = time.time()
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {(end_time - start_time)*1000:.2f}ms")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"Response JSON: {data}")
                
                if 'text' in data:
                    extracted_text = data['text'].lower()
                    print(f"Extracted text (lowercase): '{extracted_text}'")
                    
                    if 'hello' in extracted_text:
                        print("✅ PASS: OCR successfully extracted 'Hello' from PDF")
                        return True
                    else:
                        print(f"❌ FAIL: Expected 'hello' in extracted text, got: '{extracted_text}'")
                        return False
                else:
                    print(f"❌ FAIL: Response missing 'text' field: {data}")
                    return False
                    
            except json.JSONDecodeError as e:
                print(f"❌ FAIL: Invalid JSON response: {e}")
                print(f"Response text: {response.text}")
                return False
        else:
            print(f"❌ FAIL: Expected status 200, got {response.status_code}")
            print(f"Response text: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        end_time = time.time()
        print(f"❌ FAIL: Request failed after {(end_time - start_time)*1000:.2f}ms")
        print(f"Error: {e}")
        return False

def test_invalid_file():
    """Test 3: Verify that invalid file returns 400 JSON with error"""
    print("\n" + "=" * 60)
    print("TEST 3: Invalid File Handling")
    print("=" * 60)
    
    url = f"{BACKEND_URL}/api/ocr/pdf"
    print(f"Testing URL: {url}")
    
    # Send invalid file (plain text instead of PDF)
    files = {
        'file': ('invalid.pdf', io.BytesIO(b'This is not a PDF file'), 'application/pdf')
    }
    data = {
        'max_pages': '1',
        'scale': '1.6'
    }
    
    start_time = time.time()
    try:
        response = requests.post(url, files=files, data=data, timeout=10)
        end_time = time.time()
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {(end_time - start_time)*1000:.2f}ms")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 400:
            try:
                data = response.json()
                print(f"Response JSON: {data}")
                
                if 'error' in data:
                    print(f"Error message: {data['error']}")
                    print("✅ PASS: Invalid file correctly returned 400 with error message")
                    return True
                else:
                    print(f"❌ FAIL: Expected 'error' field in response: {data}")
                    return False
                    
            except json.JSONDecodeError as e:
                print(f"❌ FAIL: Invalid JSON response: {e}")
                print(f"Response text: {response.text}")
                return False
        else:
            print(f"❌ FAIL: Expected status 400, got {response.status_code}")
            print(f"Response text: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        end_time = time.time()
        print(f"❌ FAIL: Request failed after {(end_time - start_time)*1000:.2f}ms")
        print(f"Error: {e}")
        return False

def main():
    """Run all backend tests"""
    print("Backend OCR API Testing")
    print("=" * 60)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Test Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Install reportlab if not available
    try:
        import reportlab
    except ImportError:
        print("Installing reportlab for PDF generation...")
        import subprocess
        subprocess.check_call(["/root/.venv/bin/pip", "install", "reportlab"])
        print("reportlab installed successfully")
        print()
    
    results = []
    
    # Run tests
    results.append(("Health Check", test_healthz()))
    results.append(("OCR PDF Processing", test_ocr_pdf()))
    results.append(("Invalid File Handling", test_invalid_file()))
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nResults: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Backend OCR API is working correctly.")
        return True
    else:
        print("⚠️  Some tests failed. Please check the backend implementation.")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)