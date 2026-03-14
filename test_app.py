import requests

def test_resumer_endpoint():
    response = requests.post("http://localhost:5000/resumer", 
        json={
            "text": "La France est un pays situé en Europe occidentale. Elle est connue pour sa culture, sa gastronomie et son histoire.",
            "method": "t5", 
            "nb_phrases": 3
        })
    assert response.status_code == 200
    data = response.json()
    assert "resume" in data
    assert len(data["resume"]) > 0
    print("Test passed:", data["resume"][:100])

def test_extractive_endpoint():
    response = requests.post("http://localhost:5000/resumer", 
        json={
            "text": "La France est un pays situé en Europe occidentale. Elle est connue pour sa culture, sa gastronomie et son histoire.",
            "method": "extractive", 
            "nb_phrases": 2
        })
    assert response.status_code == 200
    data = response.json()
    assert "resume" in data
    print("Extractive test passed")

if __name__ == "__main__":
    test_resumer_endpoint()
    test_extractive_endpoint()