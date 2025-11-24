import os
cat > test_claude.py << 'EOF'
import os
from dotenv import load_dotenv
from anthropic import Anthropic

load_dotenv()

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Say hello in exactly 5 words."}
    ]
)

print("✅ Claude API connected!")
print(f"Response: {message.content[0].text}")
