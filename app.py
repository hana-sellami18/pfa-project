from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.text_rank import TextRankSummarizer

from transformers import T5Tokenizer, T5ForConditionalGeneration, pipeline
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter

from nltk.tokenize import sent_tokenize
import tempfile, os, torch, nltk, logging

try:
    nltk.data.find("tokenizers/punkt")
except LookupError:
    nltk.download("punkt")

app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.INFO)

# ================= DATABASE =================
app.config["SQLALCHEMY_DATABASE_URI"] = "mysql+mysqlconnector://root:ResumAI%402025@localhost/resumeurdb"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

# ================= MODELS =================
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    mot_de_passe = db.Column(db.String(200), nullable=False)

class Resume(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    texte_original = db.Column(db.Text)
    texte_resume = db.Column(db.Text)
    methode = db.Column(db.String(20))
    user_id = db.Column(db.Integer, nullable=False)

class Document(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nom_fichier = db.Column(db.String(200))
    texte_resume = db.Column(db.Text)
    methode = db.Column(db.String(20))
    user_id = db.Column(db.Integer, nullable=False)

# ================= T5 MODEL =================
checkpoint = "LaMini-Flan-T5-248M"
tokenizer = T5Tokenizer.from_pretrained(checkpoint)
model = T5ForConditionalGeneration.from_pretrained(checkpoint, device_map="auto", torch_dtype=torch.float32)
pipe_sum = pipeline("summarization", model=model, tokenizer=tokenizer, max_length=400, min_length=80)

# ================= FUNCTIONS =================
def extractive_summary(text, nb_phrases):
    parser = PlaintextParser.from_string(text, Tokenizer("french"))
    summarizer = TextRankSummarizer()
    sentences = summarizer(parser.document, nb_phrases)
    return " ".join(str(s) for s in sentences)

def abstractive_summary(text, nb_phrases):
    result = pipe_sum(text[:3000])
    summary = result[0]["summary_text"]
    phrases = sent_tokenize(summary, language="french")
    return " ".join(phrases[:nb_phrases])

def extract_text_from_pdf(path):
    loader = PyPDFLoader(path)
    pages = loader.load()
    splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
    docs = splitter.split_documents(pages)
    return " ".join(d.page_content for d in docs)

# ================= ROUTES =================
@app.route("/")
def home():
    return "API Résumeur IA opérationnelle 🚀"

# ---------- AUTH ----------
@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"message": "Utilisateur déjà existant"}), 400
    user = User(
        nom=data["nom"],
        email=data["email"],
        mot_de_passe=generate_password_hash(data["mot_de_passe"])
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "Inscription réussie"})

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data["email"]).first()
    if user and check_password_hash(user.mot_de_passe, data["mot_de_passe"]):
        return jsonify({"user_id": user.id})
    return jsonify({"error": "Identifiants incorrects"}), 401

@app.route("/register/google", methods=["POST"])
def register_google():
    data = request.get_json()
    email = data.get("email")
    nom = data.get("nom", "Utilisateur Google")
    if not email:
        return jsonify({"message": "Email requis"}), 400
    user = User.query.filter_by(email=email).first()
    if user:
        return jsonify({"user_id": user.id, "message": "Utilisateur déjà existant"}), 200
    fake_password = generate_password_hash("google_auth")
    user = User(nom=nom, email=email, mot_de_passe=fake_password)
    db.session.add(user)
    db.session.commit()
    return jsonify({"user_id": user.id, "message": "Utilisateur Google enregistré"}), 201

# ---------- TEXT SUMMARY ----------
@app.route("/resumer", methods=["POST"])
def resumer():
    data = request.get_json()
    texte = data.get("texte", "")
    methode = data.get("methode", "extractive")
    nb_phrases = int(data.get("nb_phrases", 3))
    user_id = int(data.get("user_id"))

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Utilisateur invalide"}), 400

    resultat = abstractive_summary(texte, nb_phrases) if methode == "t5" else extractive_summary(texte, nb_phrases)
    r = Resume(texte_original=texte, texte_resume=resultat, methode=methode, user_id=user_id)
    db.session.add(r)
    db.session.commit()
    return jsonify({"resume": resultat})

# ---------- PDF SUMMARY ----------
@app.route("/summarize", methods=["POST"])
def summarize_pdf():
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "Fichier PDF requis"}), 400

    methode = request.form.get("methode", "extractive")
    nb_phrases = int(request.form.get("nb_phrases", 3))
    user_id = int(request.form.get("user_id"))

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Utilisateur invalide"}), 400

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        file.save(tmp.name)
        path = tmp.name

    try:
        text = extract_text_from_pdf(path)
        resultat = abstractive_summary(text, nb_phrases) if methode == "t5" else extractive_summary(text, nb_phrases)
        doc = Document(nom_fichier=file.filename, texte_resume=resultat, methode=methode, user_id=user_id)
        db.session.add(doc)
        db.session.commit()

        # Retour complet pour Angular
        return jsonify({
            "summary": resultat,
            "document": {
                "id": doc.id,
                "nom_fichier": doc.nom_fichier,
                "texte_resume": doc.texte_resume,
                "methode": doc.methode
            }
        })
    finally:
        os.remove(path)

# ---------- HISTORIQUE ----------
@app.route("/historique/resumes/<int:user_id>", methods=["GET"])
def get_user_resumes(user_id):
    resumes = Resume.query.filter_by(user_id=user_id).all()
    return jsonify([{
        "id": r.id,
        "texte_original": r.texte_original,
        "texte_resume": r.texte_resume,
        "methode": r.methode
    } for r in resumes])

@app.route("/historique/documents/<int:user_id>", methods=["GET"])
def get_user_documents(user_id):
    docs = Document.query.filter_by(user_id=user_id).all()
    return jsonify([{
        "id": d.id,
        "nom_fichier": d.nom_fichier,
        "texte_resume": d.texte_resume,
        "methode": d.methode
    } for d in docs])

@app.route("/resumes/<int:resume_id>", methods=["DELETE"])
def delete_resume(resume_id):
    resume = Resume.query.get(resume_id)
    if not resume:
        return jsonify({"message": "Résumé non trouvé"}), 404
    db.session.delete(resume)
    db.session.commit()
    return jsonify({"message": "Résumé supprimé"})

# ================= RUN =================
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
