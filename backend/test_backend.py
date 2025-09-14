import requests

# Test the health endpoint
response = requests.get("http://127.0.0.1:8000")
print("Health check:", response.json())

# Test uploading the sample data
with open("data/seed_patients.sample.csv", "rb") as f:
    files = {"patients": f}
    data = {"practice_zip": "10021", "vertical": "medspa"}
    response = requests.post("http://127.0.0.1:8000/api/v1/datasets", files=files, data=data)
    print("Dataset upload:", response.json())