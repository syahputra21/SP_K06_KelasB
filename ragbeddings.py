from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv
import os
from sklearn.metrics.pairwise import cosine_similarity

load_dotenv()

data_directory = "Data_judol"
dataset_files = [file for file in os.listdir(data_directory) if file.endswith('.pdf')]

all_pages = []

for dataset_file in dataset_files:
    try:
        file_path = os.path.join(data_directory, dataset_file)
        pdf_loader = PyPDFLoader(file_path)
        document_data = pdf_loader.load()
        all_pages.extend(document_data)
        print(f"Sukses memuat {len(document_data)} halaman dari {dataset_file}")
    except Exception as error:
        print(f"Terjadi kesalahan saat memuat file PDF {dataset_file}: {error}")

if all_pages:
    document_splitter = RecursiveCharacterTextSplitter(chunk_size=1000)
    split_documents = document_splitter.split_documents(all_pages)
    print(f"Total bagian dokumen yang dihasilkan: {len(split_documents)}")
else:
    print("Tidak ada data yang ditemukan untuk diproses.")

embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/bert-base-nli-max-tokens")

vector_storage = Chroma.from_documents(
    documents=split_documents,
    embedding=embedding_model,
    persist_directory="hasil_data_latih"
)
retrieval_tool = vector_storage.as_retriever(search_type="similarity", search_kwargs={"k": 10})
print("Vector storage berhasil dibuat dan disimpan.")

# Menyiapkan LLM
language_model = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0, max_tokens=None, timeout=None)

system_instructions = (
            "Anda adalah asisten konseling yang sangat berpengetahuan dengan nama therabling. "
            "Anda bertugas sebagai pakar dalam memberikan saran seputar mengatasi kecanduan judi online."
            "Anda di buat oleh Brayen Syahputra dan Muhammad Zhaky Arkan"
            "Anda hanya akan memproses pertanyaan berdasarkan informasi yang terdapat dalam dataset."
            "Fokus jawaban Anda adalah memberikan solusi dan saran yang relevan untuk membantu individu mengatasi kecanduan judi online tanpa memberikan informasi tentang cara berjudi atau akses ke situs perjudian."
            "Pastikan jawaban tetap relevan dan bermanfaat dalam memberikan panduan langkah-langkah untuk mengatasi kecanduan judi online sesuai dengan pertanyaan yang diajukan."
            "pastikan jawaban yang anda berikan singkat namun bermanfaat"
            "Data dan informasi yang Anda berikan diperoleh melalui Praktik Psikologi Syafira Putri Ekayani, M.Psi., Psikolog"
            "Jika pengguna memberikan nama mereka, Anda akan mengingat nama tersebut untuk membuat interaksi lebih personal di sesi-sesi berikutnya, Namun, jika pengguna tidak memberikan nama, gunakan sapaan netral seperti 'Anda' dalam percakapan."
            "Pisahkan setiap poin dalam jawaban dengan newline (\n) untuk memastikan keterbacaan."
    "\n\n"
    "{context} {input}"
)
chat_prompt_template = ChatPromptTemplate.from_messages(
    [
        ("system", system_instructions),
        ("human", "{input}"),
    ]
)
qa_chain = create_stuff_documents_chain(language_model, chat_prompt_template)
retrieval_chain = create_retrieval_chain(retrieval_tool, qa_chain)

sample_query = "Apa saja faktor psikologis dan lingkungan yang menyebabkan seseorang terpengaruh oleh judi online"
retrieved_documents = retrieval_tool.invoke(sample_query)
final_response = retrieval_chain.invoke({"input": sample_query})
print("Jawaban yang diberikan:", final_response["answer"])

# Calculate similarity scores
query_embedding = embedding_model.embed_query(sample_query)

similarities = []
for doc in retrieved_documents:
    doc_embedding = embedding_model.embed_query(doc.page_content)
    similarity = cosine_similarity([query_embedding], [doc_embedding])[0][0]
    similarities.append((doc.page_content, similarity))

# Sort by similarity
similarities = sorted(similarities, key=lambda x: x[1], reverse=True)

# Display similarity scores without document content
print("\nHasil skor similarity:")
for _, score in similarities:
    print(f"{score:.4f}")