import os
import openai

openai.api_key = os.getenv("OPENAI_API_KEY")

try:
    response = openai.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role":"user","content":"Bonjour"}],
        max_tokens=10
    )
    print(response.choices[0].message.content)
except Exception as e:
    print("Erreur:", e)
