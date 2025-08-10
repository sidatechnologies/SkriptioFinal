import requests
import sys
from datetime import datetime
import json

class StudyAppAPITester:
    def __init__(self, base_url="https://5d17bc0a-8692-4abf-b780-134d660bbef8.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.content_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, is_multipart=False):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else self.api_url
        headers = {}
        
        if not is_multipart:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                if is_multipart:
                    response = requests.post(url, data=data, files=files, timeout=30)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=30)

            print(f"Response Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"Response preview: {str(response_data)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"Error details: {error_detail}")
                except:
                    print(f"Response text: {response.text[:500]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test GET /api/ endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET", 
            "",
            200
        )
        if success and response.get("message") == "Study Generator API":
            print("✅ Health check message correct")
            return True
        else:
            print("❌ Health check message incorrect or missing")
            return False

    def test_generate_content(self):
        """Test POST /api/generate endpoint with sample text"""
        sample_text = "Photosynthesis is the process by which green plants use sunlight to synthesize foods from carbon dioxide and water. It generally involves chlorophyll and produces oxygen. Chloroplasts are organelles where photosynthesis occurs."
        sample_title = "Photosynthesis"
        
        form_data = {
            'text': sample_text,
            'title': sample_title
        }
        
        success, response = self.run_test(
            "Generate Study Content",
            "POST",
            "generate",
            200,
            data=form_data,
            is_multipart=True
        )
        
        if success:
            # Validate response structure
            required_keys = ['id', 'title', 'text', 'quiz', 'flashcards', 'plan']
            missing_keys = [key for key in required_keys if key not in response]
            
            if missing_keys:
                print(f"❌ Missing required keys: {missing_keys}")
                return False
            
            # Validate quiz array length
            if len(response.get('quiz', [])) != 10:
                print(f"❌ Quiz should have 10 questions, got {len(response.get('quiz', []))}")
                return False
            
            # Validate flashcards array length (>= 6)
            if len(response.get('flashcards', [])) < 6:
                print(f"❌ Flashcards should have at least 6 cards, got {len(response.get('flashcards', []))}")
                return False
            
            # Validate plan array length (7 days)
            if len(response.get('plan', [])) != 7:
                print(f"❌ Plan should have 7 days, got {len(response.get('plan', []))}")
                return False
            
            # Save content ID for later tests
            self.content_id = response.get('id')
            print(f"✅ Content generated successfully with ID: {self.content_id}")
            print(f"✅ Quiz questions: {len(response.get('quiz', []))}")
            print(f"✅ Flashcards: {len(response.get('flashcards', []))}")
            print(f"✅ Plan days: {len(response.get('plan', []))}")
            
            return True
        
        return False

    def test_get_content(self):
        """Test GET /api/content/{content_id} endpoint"""
        if not self.content_id:
            print("❌ No content ID available for testing")
            return False
        
        success, response = self.run_test(
            "Get Content by ID",
            "GET",
            f"content/{self.content_id}",
            200
        )
        
        if success:
            # Validate that response has same ID and non-empty quiz/plan
            if response.get('id') != self.content_id:
                print(f"❌ ID mismatch: expected {self.content_id}, got {response.get('id')}")
                return False
            
            if not response.get('quiz'):
                print("❌ Quiz is empty in retrieved content")
                return False
            
            if not response.get('plan'):
                print("❌ Plan is empty in retrieved content")
                return False
            
            print("✅ Content retrieved successfully with non-empty quiz and plan")
            return True
        
        return False

    def test_get_recent(self):
        """Test GET /api/recent endpoint"""
        if not self.content_id:
            print("❌ No content ID available for testing")
            return False
        
        success, response = self.run_test(
            "Get Recent Content",
            "GET",
            "recent",
            200
        )
        
        if success:
            # Validate that response is an array containing item with our content ID
            if not isinstance(response, list):
                print("❌ Recent endpoint should return an array")
                return False
            
            content_ids = [item.get('id') for item in response]
            if self.content_id not in content_ids:
                print(f"❌ Content ID {self.content_id} not found in recent items")
                print(f"Available IDs: {content_ids}")
                return False
            
            print(f"✅ Recent content contains our generated content ID: {self.content_id}")
            return True
        
        return False

def main():
    print("🚀 Starting Study App API Tests")
    print("=" * 50)
    
    # Setup
    tester = StudyAppAPITester()
    
    # Run tests in sequence
    tests = [
        tester.test_health_check,
        tester.test_generate_content,
        tester.test_get_content,
        tester.test_get_recent
    ]
    
    for test in tests:
        if not test():
            print(f"\n❌ Test failed, stopping execution")
            break
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All backend API tests passed!")
        return 0
    else:
        print("❌ Some backend API tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())