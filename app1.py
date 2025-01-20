from flask import Flask, request, render_template, jsonify
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chains import create_retrieval_chain, LLMChain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import (
    ChatPromptTemplate,
    MessagesPlaceholder,
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
)
from langchain.memory import ConversationBufferMemory
from dotenv import load_dotenv
import re

load_dotenv()

app = Flask(__name__)


# Inisialisasi vectorstore
vectorstore = Chroma(
    persist_directory="data", 
    embedding_function=HuggingFaceEmbeddings(model_name="sentence-transformers/bert-base-nli-max-tokens")
)
retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 10})

# Inisialisasi LLM dengan model gemini-1.5-flash
llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0, max_tokens=None, timeout=None)

# Prompt untuk chain
prompt = ChatPromptTemplate(
    messages=[ 
        SystemMessagePromptTemplate.from_template(
            "Anda adalah asisten konseling yang sangat berpengetahuan dengan nama therabling. "
            "Anda bertugas sebagai pakar dalam memberikan saran seputar mengatasi kecanduan judi online."
            "Anda di buat oleh Brayen Syahputra dan Muhammad Zhaky Arkan"
            "Anda hanya akan memproses pertanyaan mengenai judi online saja dan berdasarkan informasi yang terdapat dalam dataset."
            "Fokus jawaban Anda adalah memberikan solusi dan saran yang relevan untuk membantu individu mengatasi kecanduan judi online tanpa memberikan informasi tentang cara berjudi atau akses ke situs perjudian."
            "pastikan jawaban yang anda berikan singkat namun bermanfaat"
            "Data dan informasi yang Anda berikan diperoleh melalui Praktik Psikologi Syafira Putri Ekayani, M.Psi., Psikolog"
            "Jika pengguna memberikan nama mereka, Anda akan mengingat nama tersebut untuk membuat interaksi lebih personal di sesi-sesi berikutnya, Namun, jika pengguna tidak memberikan nama, gunakan sapaan netral seperti 'Anda' dalam percakapan."
            "Jika Pengguna telah melakukan sesuai yang di saranin sistem dan tidak berpengaruh maka sistem akan menyarankan untuk menghubungi  Praktik Psikologi Syafira Putri Ekayani, M.Psi., Psikolog dengan +62 822-2398-3998"
        ),
        # Placeholder untuk riwayat percakapan
        MessagesPlaceholder(variable_name="context"),
        # Template untuk pertanyaan dari pengguna
        HumanMessagePromptTemplate.from_template("{question}")
    ]
)

# Memori percakapan untuk menyimpan riwayat
memory = ConversationBufferMemory(memory_key="context", return_messages=True)

# Membuat LLMChain dengan memori untuk percakapan
conversation_chain = LLMChain(
    llm=llm,
    prompt=prompt,
    verbose=True,
    memory=memory
)

# Store messages in memory
messages = []

@app.route("/")
def home():
    return render_template("index.html", messages=messages)

@app.route("/judol")
def judol():
    return render_template("judol.html", messages=messages)

@app.route("/ask", methods=["POST"])
def ask():
    global messages
    query = request.form.get("query")
    if query:
        # Append user query to the conversation history
        messages.append({"role": "user", "content": query})

        # Process query with retrieval chain and memory
        response = conversation_chain.run(question=query)

        # Remove asterisks from the response
        cleaned_response = response.replace("*", "")

        # Remove numbering or bullet points from the response (not formatting it into a list)
        cleaned_response = re.sub(r"^\d+\.", "", cleaned_response, flags=re.MULTILINE)  # Remove numbering
        cleaned_response = re.sub(r"^•", "", cleaned_response, flags=re.MULTILINE)    # Remove bullet points

        # Append cleaned response to messages
        messages.append({"role": "assistant", "content": cleaned_response})

        return jsonify(response={"answer": cleaned_response})
    
    return jsonify(error="No query provided"), 400

@app.route("/clear", methods=["POST"])
def clear():
    global messages
    messages.clear()  # Clear all messages
    memory.clear()  # Clear memory in the ConversationBufferMemory
    return jsonify(response="Conversation cleared successfully.")

if __name__ == "__main__":
    app.run(debug=True)
