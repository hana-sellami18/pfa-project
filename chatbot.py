# chatbot_gemini.py
from flask import Flask, request, jsonify
from google import genai
import re

app = Flask(__name__)

# ⚡ Initialiser le client Gemini avec ta clé API
client = genai.Client(api_key="AIzaSyBxOaZwztb8aIrWlF_kccqYzx5_UDpmxwg")  # Remplace par ta clé

# ========= Fonction pour nettoyer le texte =========
def nettoyer_texte(texte):
    """Supprime les caractères inutiles et les espaces en trop"""
    texte = re.sub(r'[\*\$\|\\]', '', texte)  # Supprime les symboles Markdown/LaTeX
    texte = re.sub(r'\n+', '\n', texte)      # Remplace plusieurs sauts de ligne par un seul
    texte = re.sub(r'\s+', ' ', texte)       # Supprime les espaces multiples
    return texte.strip()

# ========= Route pour le chat =========
@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    question = data.get("question", "").strip()
    context = data.get("context", "").strip()

    if not question:
        return jsonify({"error": "Le champ 'question' est requis."}), 400

    prompt = f"Contexte : {context}\nQuestion : {question}\nRéponse :"

    try:
        # Faire la requête au modèle Gemini
        response = client.models.generate_content(
            model="gemini-2.5-flash",  # Modèle recommandé
            contents=prompt
        )
        # Nettoyer la réponse pour qu'elle soit lisible
        reponse_claire = nettoyer_texte(response.text)
        return jsonify({"answer": reponse_claire})
    except Exception as e:
        return jsonify({"error": f"Erreur du chatbot : {str(e)}"}), 500

# ========= Lancer l'application =========
if __name__ == "__main__":
    app.run(port=5003, debug=True)
